/* eslint-disable no-console */
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
const twilioClient = require('twilio');
const { v4: uuidv4 } = require('uuid');

const systemAgent = {
  type: 'systemAgent',
  id: '96690282-2300-430b-8630-ff9a1de02c80',
};

// TODO pass these in from the launcher?
// NOTE move this all to the lib package
// move all the STRUCTURE to the lib package anyway
// and then pass in loops and their enabled state etc
const {
  makeEventValidator,
  makeTransformer,
  makeReaders,
  makeWriter,
  resp,
} = process.env.LOCAL_LIB === 'true'
  ? require('../../../lib')
  : require('@gather-social/lib');

const delayMs = 5000;

// This sends sms alerts via twilio (or will when it's finished)
const sendAlerts = async ({ alerts }) => {
  // heartbeat the alert system (for fallback alert system failure alerting)
  await alerts.heartbeat();

  // get all current alerts (from database)
  const currentAlerts = await alerts.getAll();

  // instance name, node_env, etc(?)
  const message = string => ({ body: string });

  await Promise.all(currentAlerts.map(x => Promise.all([
    // send each alert to phone list with instance information:
    alerts.send(message(x)),
    alerts.del(x), // and then clear the alert
  ])));
};

const processReports = () => { /* TODO */ };

const processRatings = () => { /* TODO */ };

// TODO overloads the definition of report
const generateReports = () => { /* TODO */ };

const loops = {
  generateReports: { enabled: false, fn: generateReports },
  processReports: { enabled: false, fn: processReports },
  processRatings: { enabled: false, fn: processRatings },
  sendAlerts: { enabled: false, fn: sendAlerts },
};

module.exports = (implementationConfig) => {
  const { redisDatabases, modulesEnabled } = implementationConfig;
  const databases = redisDatabases.reduce((acc, dbConfig, idx) => {
    if (process.env.NODE_ENV === 'production' && modulesEnabled.localRedis) {
      throw new Error('localRedis not allowed in production');
    }

    acc[dbConfig.name] = modulesEnabled.localRedis
      ? resp({ name: dbConfig.name, port: 10000 + idx })
      : resp(dbConfig);
    return acc;
  }, {});

  databases.pubsub = modulesEnabled.localRedis
    ? resp({
      name: 'pubsub',
      port: redisDatabases.findIndex(x => x.name === 'state') + 10000,
    })
    : resp(redisDatabases.find(x => x.name === 'state'));

  const stateDB = databases.state;
  const eventDB = databases.events;
  const pubsubDB = databases.pubsub;

  console.log(`eventDB: ${eventDB.options.host}:${eventDB.options.port}`);
  console.log(`stateDB: ${stateDB.options.host}:${stateDB.options.port}`);

  const clock = (() => {
    let timeOverride = false;
    let stoppedOverride = false;
    return {
      now: () => timeOverride || Date.now(),
      unix: () => Math.floor((timeOverride || Date.now()) / 1000),
      isStopped: () => stoppedOverride || false,
      update: (tconfstr) => {
        timeOverride = parseInt(tconfstr.split(':')[0], 10);
        stoppedOverride = tconfstr.split(':')[1] === 'true';
      },
    };
  })();

  const { standard, cache: { list } } = makeReaders({
    handlers: implementationConfig.handlers,
    selfConfig: implementationConfig.selfConfig,
    cacheTypes: implementationConfig.cacheTypes,
    stateDB,
    eventDB,
  });

  const write = makeWriter({
    allowManualMetadata: true,
    requireOCC: true,

    validateEvents: makeEventValidator(implementationConfig.schemae.events),
    transform: makeTransformer(implementationConfig.transformations),
    targetTypes: implementationConfig.targetTypes,
    agentTypes: implementationConfig.agentTypes,
    geoTypes: implementationConfig.geoTypes,
    database: eventDB,
    geoDb: stateDB,
    idDb: stateDB,
    clock,
  });

  const twilio = implementationConfig.modulesEnabled.twilio
    ? twilioClient(
      implementationConfig.twilio.accountSid,
      implementationConfig.twilio.authToken,
    )
    : false;

  const alerts = {
    heartbeat: () => stateDB.set('alert:heartbeat', true, 'EX', 15), // 15 secs
    set: msg => stateDB.hset(`alert:${uuidv4()}`, { msg, sent: false }),
    getAll: () => new Promise((res, rej) => {
      try {
        const acc = [];
        const alertStream = stateDB.scanStream({ match: 'alert:[^h]*' });
        alertStream.on('data', (keys) => { acc.push(...keys); });

        // TODO this is pretty stupidly inefficient because we never clear
        // sent messages - add some kind of mechnanism to persist the sent
        // alerts either to the event log or some other compressed log etc.
        alertStream.on('end', async () => {
          const values = await Promise.all(acc.map(k => stateDB.hgetall(k)));
          res(values.filter(a => !a.sent));
        });
      } catch (e) { rej(e); }
    }),

    send: msg => (twilio
      ? twilio(msg) // TODO
      : (async () => {
        console.warn('alert send with twilio disabled');
        console.warn(msg);
        return 'OK';
      })()),
  };

  const main = async () => {
    if (implementationConfig.modulesEnabled.generator) {
      clock.update(await stateDB.get('GENERATOR_CLOCK'));
    }

    const startTime = clock.now();

    await Promise.all(
      Object.values(loops).map(loop => (loop.enabled
        ? loop.fn({ write, clock, list, standard, alerts })
        : true)),
    );

    const t = clock.now();

    if ((t - startTime) > (delayMs * 0.8)) {
      throw new Error('runner took too long');
      // TODO set alert
    }

    if ((t - startTime) > (delayMs * 0.7)) {
      console.warn('runner taking too long');
      // TODO set alert
    }
  };

  const mainInterval = (() => {
    let fn = setIntervalAsync(main, delayMs);
    let cleared = false;
    return {
      clear: async () => {
        if (cleared) { return 'main loop already disabled'; }
        await clearIntervalAsync(fn);
        cleared = true;
        return 'main loop disabled';
      },

      reset: async () => {
        if (cleared) {
          fn = setIntervalAsync(main, delayMs);
          cleared = false;
          return 'main loop enabled';
        } else {
          return 'main loop already enabled';
        }
      },
    };
  })();

  const enable = async (loopName) => {
    if (!loopName) { return mainInterval.reset(); }
    if (!loops[loopName]) { return 'loop not found'; }
    if (loops[loopName].enabled) { return 'loop already enabled'; }
    loops[loopName].enabled = true;
    return `loop ${loopName} enabled`;
  };

  const disable = async (loopName) => {
    if (!loopName) { return mainInterval.clear(); }
    if (!loops[loopName]) { return 'loop not found'; }
    if (!loops[loopName].enabled) { return 'loop already disabled'; }
    loops[loopName].enabled = false;
    return `loop ${loopName} disabled`;
  };

  const enabledLoops = Object.entries(loops)
    .filter(([_, l]) => l.enabled)
    .map(([k, _]) => k);

  const printLoops = loopNames => loopNames
    .reduce((acc, l) => `${acc}  - ${l}\n`, '');

  const printEnabledLoops = () => {
    console.log('loops enabled: '
      + '\n'
      + `${(enabledLoops.length ? printLoops(enabledLoops) : 'none')}`);
  };

  printEnabledLoops();

  pubsubDB.psubscribe('runner:*', (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('subscribed to redis pubsub');
    }
  });

  pubsubDB.on('pmessage', async (pattern, channel, message) => {
    if (channel === 'runner:enable') {
      if (message === 'main') {
        const res = await enable();
        console.log(res);
      } else {
        const res = await enable(message);
        console.log(res);
      }
    } else if (channel === 'runner:disable') {
      if (message === 'main') {
        const res = await disable();
        console.log(res);
      } else {
        const res = await disable(message);
        console.log(res);
      }
    } else if (channel === 'runner:status') {
      console.log('status requested:');

      console.log(
        `main loop: ${mainInterval.cleared
          ? 'disabled'
          : 'enabled'}`,
      );

      printEnabledLoops();
    }
  });
};
