/* eslint-disable no-console */

const shuffle = require('lodash.shuffle');
const assert = require('assert').strict;
const crypto = require('crypto');
const v8 = require('v8');
const fs = require('fs');

const getAggregates = async (count, read, type, verifyFn) => {
  const keys = await read.keyScan({ match: `${type}:*` });

  const acc = [];
  while (acc.length < count && keys.length) {
    const key = shuffle(keys).pop();

    const id = key.split(':')[1];
    // eslint-disable-next-line no-await-in-loop
    const aggregate = await read.aggregateFromDatabase({ type, id });
    if (verifyFn(aggregate)) acc.push(aggregate);
  }

  if (!keys.length) throw new Error('not enough appropriate aggregates');
  return acc;
};

module.exports = {
  Query: {
    agentWithCharacteristics: async (_, { mode, count = 1 }, { tools }) => {
      const modes = {
        staff: ['staff', agg => !!agg.token && agg.aggregateType === 'Staff'],
      };

      if (!modes[mode]) { throw new Error('mode unknown'); }
      const [type, fn] = modes[mode];

      return getAggregates(count, tools.read, type, fn);
    },

    jsonAggregatesWithCharacteristics: async (
      _,
      { mode, count = 1 },
      { tools },
    ) => {
      const modes = {
        vendor: ['vendor', () => true],
        'vendor-with-offerings': ['vendor', agg => agg.currentOfferings.length],
        issuer: ['issuer', () => true],
        'issuer-with-offerings': ['issuer', agg => agg.offerings.length],
      };

      if (!modes[mode]) { throw new Error('mode unknown'); }
      const [type, fn] = modes[mode];

      return (await getAggregates(count, tools.read, type, fn))
        .map(agg => JSON.stringify(agg, null, 2));
    },

    token: async (_, { aud, iss, sub, imp }, { tools, clock }) => {
      const tokenDetails = { aud, iss, sub };
      const now = clock.unix();
      return tools.mintToken({
        ...tokenDetails,
        ...(imp ? { imp: true } : {}),
        now,
      });
    },

    tokenById: async (_, { id, imp, type }, { tools, clock }) => {
      assert([].includes(type), 'invalid type');

      const agent = await tools.read.aggregateFromDatabase({
        id,
        type,
      });

      if (!agent) { throw new Error('agent not found for id'); }

      const tokenDetails = agent.token;
      if (!tokenDetails) { throw new Error('token details not found for id'); }
      const now = clock.unix();
      return tools.mintToken({ ...tokenDetails, imp, now });
    },

    // TODO hardcoded to user type
    firebaseUsers: async (_, __, { tools }) => {
      const userIds = await tools.read.standardList('user');
      const users = (await Promise.all(
        userIds.map(uid => tools.read.standard('user', uid)),
      ));

      return users
        .filter(u => u.token.iss.startsWith('https://securetoken.google.com'))
        .map(u => u.id);
    },

    generatorState: (_, __, { generator }) => {
      if (!generator) { return 'generator not enabled'; }

      const toMB = n => n / 1024 / 1024;
      const maxMemory = toMB(v8.getHeapStatistics().total_available_size);
      const state = {
        generator: generator.state(),
        counter: generator.counterState(),
        usage: Object.fromEntries(Object.entries(process.memoryUsage())
          .map(([key, val]) => [key, `~${Math.round(toMB(val))} MB`])),
        maxMemory: `~${Math.round(maxMemory)} MB`,
      };

      return JSON.stringify(state, null, 2);
    },

    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),
    admin: (_, { id }, { tools }) => tools.read.standard('admin', id),
  },

  Mutation: {
    suCreateStaff: async (_, { details, memo }, { tools }) => {
      const staffId = tools.uuidv4();

      const event = {
        key: `staff:${staffId}`,
        type: 'wasCreated',
        data: { id: staffId, ...details, memo },
      };

      const response = await tools.write({ event });
      if (response !== 'OK') { throw new Error('staff creation failed'); }

      return staffId;
    },

    suCreateAdmin: async (_, { details, memo }, { tools }) => {
      const adminId = tools.uuidv4();

      const event = {
        key: `admin:${adminId}`,
        type: 'wasCreated',
        data: { id: adminId, ...details, memo },
      };

      const response = await tools.write({ event });
      if (response !== 'OK') { throw new Error('admin creation failed'); }

      return adminId;
    },

    suAssociateToken: async (_, { token, id, type }, { tools }) => {
      if (!token.aud || !token.iss || !token.sub) {
        throw new Error('invalid token');
      }

      const response = await tools.writeId({ token, id, type });
      if (response !== 'OK') { throw new Error('id write failed'); }

      const writeResponse = await tools.write({
        event: {
          key: `${type}:${id}`,
          type: 'hadTokenAssociated',
          data: { token },
        },
      });

      if (writeResponse !== 'OK') {
        throw new Error('token association failed');
      }

      const tokenString = JSON.stringify(token, null, 2);
      return `${type} ${id} associated to token ${tokenString}`;
    },

    clearCounter: (_, __, { generator }) => {
      if (!generator) { return 'generator not enabled'; }
      generator.clock.pause();
      generator.clearCounter();
      return 'counter cleared; generator clock stopped';
    },

    changeCounterMode: (_, { mode }, { generator }) => {
      if (!generator) { return 'generator not enabled'; }
      // TODO: some kind of check for unknown modes
      generator.clock.pause();
      generator.changeCounterMode(Math.round(mode));
      return `generator now in mode ${mode}`;
    },

    resetServer: async (_, { unixTime }, { databases, generator, tools }) => {
      if (unixTime && generator) {
        throw new Error("can't reset to time !generator");
      }

      const message = generator
        ? (() => {
          const time = (unixTime || Math.round(Date.now() / 1000));
          generator.reinitialise(time);
          return `reinitialised generator at ${time} (unix)`;
        })()
        : 'reinitialised server';

      await databases.events.flushdb();
      await databases.state.flushdb();

      const { coldStart, injectTestData } = tools;
      if (coldStart && injectTestData) {
        const coldStartResponse = await coldStart();
        if (coldStartResponse) { await injectTestData(); }
        const time = Math.floor(Date.now() / 1000);
        await databases.state.set('testDataLastRan', time);
      }

      console.log(message);
      return message;
    },

    resetTestData: async (_, __, { databases }) => {
      await databases.state.set('forceRunTestData', true);
      return 'initiated test data reset; wait 30 seconds';
    },

    pause: (_, __, { generator }) => {
      if (!generator) { return 'generator not enabled'; }
      generator.clock.pause();
      return 'generator clock paused';
    },

    resume: (_, __, { generator }) => {
      if (!generator) { return 'generator not enabled'; }
      generator.clock.resume();
      return 'generator clock started';
    },

    fastForward: async (
      _,
      {
        unixTime,
        unixTimeString,
        hours = 0,
        minutes = 0,
        seconds = 0,
        volume = 1,
      },
      { generator, clock },
    ) => {
      if (!generator) { return 'generator not enabled'; }
      clock.pause();
      const currentFrame = generator.state().frameNumber;
      const fromTimeString = () => {
        if (!unixTimeString) { return false; }
        const [stamp, sub] = unixTimeString.split('-');
        return sub ? stamp - sub : stamp;
      };

      const ts = unixTime || fromTimeString();

      if (ts) {
        const frames = parseInt(ts, 10) - generator.clock.unix();
        const finalFrame = frames + currentFrame;
        await generator.runToFrame(finalFrame, volume);
        return `fast forwarded to ${ts} (unix)`;
      } else {
        const finalFrame = currentFrame
        + (hours * 3600)
        + (minutes * 60)
        + seconds;

        await generator.runToFrame(finalFrame, volume);
        return `fast forwarded by ${hours} hours`;
      }
    },

    dump: async (_, { dumpName, local }, { generator, tools, databases }) => {
      if (generator) { generator.clock.pause(); }

      const state = {
        generator: generator ? generator.state() : undefined,
        counter: generator ? generator.counterState() : undefined,
        cache: generator ? generator.stores().cache : undefined,
        unsafe: generator ? generator.stores().unsafe : undefined,
        safe: generator ? generator.stores().safe : undefined,
        clock: generator ? generator.clock.state() : undefined,
        events: await tools.dumpDB(databases.events),
        state: await tools.dumpDB(databases.state),
      };

      const strify = x => JSON.stringify(x, null, 2);

      if (local) {
        const rt = Math.floor(Date.now() / 1000);
        const now = generator ? generator.clock.now() : rt;
        const filepath = dumpName
          ? `out/${dumpName}`
          : `out/${rt}-${now}-state`;
        const filename = name => `${filepath}/${name}.json`;

        if (!fs.existsSync(filepath)) { fs.mkdirSync(filepath); }

        Object.entries(state).forEach(([name, data]) => {
          if (!data) return;
          fs.writeFileSync(filename(`${name}`), strify(data));
        });

        return `wrote state to files ${filepath}`;
      } else {
        const {
          b2: {
            applicationKey,
            applicationKeyId,
            dbBucketId,
            apiUrl,
          },
        } = databases;

        if (dbBucketId === '0') { // if mayweather b2 mock enabled
          // TODO maybe?
          throw new Error('cannot dump database to mayweather');
        }

        const { axios } = tools;

        const authKey = Buffer
          .from(`${applicationKeyId}:${applicationKey}`)
          .toString('base64');

        const {
          data: {
            authorizationToken,
            apiUrl: authApiUrl,
          },
        } = await axios({
          method: 'get',
          url: `${apiUrl}/b2_authorize_account`,
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${authKey}`,
          },
        });

        const post = async ({ fileName, fileBuffer }) => {
          const sha1 = crypto.createHash('sha1')
            .update(fileBuffer)
            .digest('hex');

          const {
            data: {
              uploadUrl,
              authorizationToken: uploadToken,
            },
          } = await axios({
            method: 'post',
            url: `${authApiUrl}/b2api/v2/b2_get_upload_url`,
            data: { bucketId: dbBucketId },
            headers: { Authorization: authorizationToken },
          });

          try {
            const uploadResponse = await axios({
              method: 'post',
              url: uploadUrl,
              data: fileBuffer,
              maxBodyLength: 90000000, // 90 MBytes
              headers: {
                Authorization: uploadToken,
                'X-Bz-File-Name': `${dumpName}-${fileName}.json`,
                'Content-type': 'application/json',
                'Content-Length': fileBuffer.byteLength,
                'X-Bz-Content-Sha1': sha1,
              },
            });

            if (!uploadResponse) { throw new Error('upload failed'); }
            return uploadResponse;
          } catch (e) {
            console.log(e);
            return e;
          }
        };

        const files = Object.entries(state).map(([fileName, object]) => {
          if (!object) return false;
          const fileBuffer = Buffer.from(JSON.stringify(object));
          return { fileName, fileBuffer };
        }).filter(x => !!x);

        const postResponses = await Promise.all(files.map(x => post(x)));
        return postResponses.map(r => r.status).join(', ');
      }
    },

    load: async (
      _,
      { local, consolidated, dumpName },
      { generator, databases, tools },
    ) => {
      if (generator) { generator.clock.pause(); }
      if (local) {
        const path = `out/${dumpName}`;
        const state = (() => {
          if (consolidated) {
            const file = fs.readFileSync(`in/${dumpName}.json`, 'utf8');
            // Yes, this is extremely ugly
            return JSON.parse(JSON.parse(file).data.databases);
          } else {
            const files = fs.readdirSync(path).filter(s => s.endsWith('.json'));
            const pair = name => [
              name.split('.')[0],
              JSON.parse(fs.readFileSync(`${path}/${name}`, 'utf8')),
            ];

            const pairs = files.map(filename => pair(filename));
            return Object.fromEntries(pairs);
          }
        })();

        if (generator) {
          const { safe, unsafe, cache } = state;

          await generator.reinitialise(state.clock, state.generator.volume);
          await generator.loadCounter(state.counter);
          await generator.loadStores({ safe, unsafe, cache });
          await generator.clock.load(state.clock);
        }

        await databases.events.flushdb();
        await databases.state.flushdb();
        await tools.populateDB(databases.events, state.events);
        await tools.populateDB(databases.state, state.state);

        return `state reloaded from file ${dumpName}, clock stopped`;
      } else {
        await tools.b2Load({
          databases,
          axios: tools.axios,
          populateDB: tools.populateDB,
          dumpName,
          generator,
        });

        return 'state reloaded from b2';
      }
    },

    testNotification: async (_, { userId, type }, { tools }) => {
      // TODO change to relevant types
      const data = { type, messageBody: '' }; /*
        switch (type) {
          case 'invitationReceived': return {
            type,
            messageBody: "You've been invited",
            invitationId: tools.uuidv4(),
          };

          case 'chatMessageAvailable': return {
            type,
            chatId: tools.uuidv4(),
            senderId: tools.uuidv4(),
            senderFirstName: 'fake',
            senderLastName: 'person',
            messageBody: 'a fake message',
          };

          case 'gatheringCancelled': return {
            type,
            gatheringId: tools.uuidv4(),
            message: 'gathering was cancelled because of reasons',
          };

            // TODO new contact available
            // TODO ticket received
            // TODO 4h, 2h, and 30m before

          default: return {
            type: 'test',
            messageBody: 'arbitrary test message body',
          };
        }
      })(); */

      const user = await tools.read.aggregateFromDatabase({
        type: 'user',
        id: userId,
      });

      return tools.notify({
        recipient: user,
        write: tools.write,
        data,
      });
    },

    acceptAllProposals: async (_, __, { tools }) => {
      const jobIds = await tools.read.standardList('job');

      const getProposals = propIds => Promise.all(
        propIds.map(id => tools.read.standard('proposal', id)),
      );

      const jobs = await Promise.all(
        jobIds.map(id => tools.read.standard('job', id)),
      );

      const proposals = (await Promise.all(
        jobs.map(job => getProposals(job.proposals)),
      )).flat();

      const relevantProposals = proposals.filter(p => p.status === 'initial');

      const events = relevantProposals.flatMap((p) => {
        const stageIds = p.stages.map(s => s.id);

        return [
          {
            key: `proposal:${p.id}`,
            type: 'wasAccepted',
            data: { stageIds },
          },
          {
            key: `job:${p.jobId}`,
            type: 'hadProposalAccepted',
            data: { stageIds },
          },
        ];
      });

      return tools.write({ events });
    },

    rejectAllProposals: async (_, __, { tools }) => {
      const jobIds = await tools.read.standardList('job');

      const getProposals = propIds => Promise.all(
        propIds.map(id => tools.read.standard('proposal', id)),
      );

      const jobs = await Promise.all(
        jobIds.map(id => tools.read.standard('job', id)),
      );

      const proposals = (await Promise.all(
        jobs.map(job => getProposals(job.proposals)),
      )).flat();

      const relevantProposals = proposals.filter(p => p.status === 'initial');

      const events = relevantProposals.flatMap(p => [
        {
          key: `proposal:${p.id}`,
          type: 'wasRejected',
          data: {},
        },
        {
          key: `job:${p.jobId}`,
          type: 'hadProposalRejected',
          data: {},
        },
      ]);

      return tools.write({ events });
    },
  },
};
