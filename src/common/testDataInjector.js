/* eslint-disable no-console */
/*
 * a static test data generator that runs on a schedule
 *
 * A standalone server that intermittently hits the main
 * system in the form of the non-interactive user accounts
 * created by this generator and responds to certain things
 * (like messaging for instance) would probably be a good
 * idea, and constitutes seperate future work.
*/

const assert = require('assert').strict;
// const crypto = require('crypto');

const { faker } = require('@faker-js/faker');
// const adminTypedefs = require('../api/typedefs/adminTypedefs');
// const { v4: isUUID } = require('is-uuid');
// const { DateTime } = require('luxon');

// const systemAgentId = 'dea163a7-7df7-46c7-9a74-4705aba8a502';

module.exports = async ({ now, config, eventDB, stateDB }) => { // , tools })
  const {
    suId,
    subs,
    staffIds,
    adminIds,
    installerIds,
    salesAgentIds,
  } = config.testData;

  assert(!!now);
  assert(!!config);
  assert(!!config.testData);
  assert(!!adminIds.length);
  assert(!!staffIds.length);
  assert(!!installerIds.length);
  assert(!!salesAgentIds.length);
  assert(!!suId);
  assert(!!subs);
  assert(subs.length >= (
    staffIds.length
    + adminIds.length
    + installerIds.length
    + salesAgentIds.length
  ));

  // TODO NOTE this doesn't really support the idea of an agnostic unerlying
  // database layer does it? consider further.

  const testEpoch = now - (14 * 24 * 60 * 60);
  // const nowDateTime = DateTime.fromSeconds(now);

  // determine day of week (in zone)
  // const nowWeekday = nowDateTime.weekdayLong.toLowerCase();

  // determine time of day (in zone)
  // const { hour: nowHour, minute: nowMinute } = nowDateTime;

  // const day = 24 * 60 * 60;

  const last = await stateDB.get('testDataLastRan');
  const forced = (await stateDB.get('forceRunTestData') === 'true');

  // unless this is a "cold start" scenario or manually triggered
  if (!forced && last) {
    return [];
    // NOTE: the line above (and commenting out the rest
    // below), ensures that testData is only injected once
    // (on a cold start) and then never again, making it,
    // essentially, an extention of coldStart. This is
    // necessary (at least for now) because the test data
    // injection is not idempotent currently, as it deletes
    // the keys related to all the events it creates, and
    // that currently includes the system payment accounts
    // which are created by coldStart. I might fix this
    // eventually.
    /*
    // only run once per day at 9:15am
    if (nowHour !== 9) { return []; }
    if (nowMinute > 15) { return []; }
    if ((now - last) < day) { return []; }
    */
  }

  console.log('testdata injection running');
  await stateDB.set('testDataLastRan', Math.floor(Date.now() / 1000));
  await stateDB.set('forceRunTestData', false);

  const tdk = await stateDB.smembers('testDataKeys');
  if (tdk.length) {
    await eventDB.multi(tdk.map(k => ['call', 'del', k])).exec();
    await stateDB.del('testDataKeys');
  }

  const staticEvents = [{
    key: `superuser:${suId}`,
    type: 'wasCreated',
    metadata: { actor: { type: 'superuser', id: suId } },
    data: {
      id: suId,
      memo: 'test data injection',
      simulation: true,
      token: {
        sub: faker.string.uuid(),
        aud: config.sstAudience,
        iss: config.sstIssuer,
      },
    },
  }];

  const staffDescriptors = [
    {
      firstName: 'Staffy',
      lastName: 'mcStaffface',
      emailAddress: '0@test.com',
      phoneNumber: '+16045550000',
    },
  ];

  const staffEvents = staffDescriptors.map((sd, idx) => ({
    ...sd,
    id: staffIds[idx],
    token: {
      sub: staffIds[idx],
      aud: config.sstAudience,
      iss: config.sstIssuer,
    },
  })).flatMap(sd => ([ // events
    {
      key: `staff:${sd.id}`,
      type: 'wasCreated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: {
        id: sd.id,
        memo: 'test data injection',
        firstName: sd.firstName,
        lastName: sd.lastName,
        emailAddress: sd.emailAddress,
        phoneNumber: sd.phoneNumber,
      },
    },
    {
      key: `staff:${sd.id}`,
      type: 'hadTokenAssociated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: { token: sd.token },
    },
  ]));

  const adminDescriptors = [
    {
      firstName: 'Adminny',
      lastName: 'mcAdminface',
      emailAddress: '1@test.com',
      phoneNumber: '+16045551111',
    },
  ];

  const adminEvents = adminDescriptors.map((ad, idx) => ({
    ...ad,
    id: adminIds[idx],
    token: {
      sub: adminIds[idx],
      aud: config.sstAudience,
      iss: config.sstIssuer,
    },
  })).flatMap(ad => ([ // events
    {
      key: `admin:${ad.id}`,
      type: 'wasCreated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: {
        id: ad.id,
        firstName: ad.firstName,
        lastName: ad.lastName,
        emailAddress: ad.emailAddress,
        phoneNumber: ad.phoneNumber,
      },
    },
    {
      key: `admin:${ad.id}`,
      type: 'hadTokenAssociated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: { token: ad.token },
    },
  ]));

  const installerDescriptors = [
    {
      firstName: 'Install',
      lastName: 'McInstallface',
      emailAddress: '2@test.com',
      phoneNumber: '+16045552222',
    },
  ];

  const installerEvents = installerDescriptors.map((instid, idx) => ({
    ...instid,
    id: installerIds[idx],
    token: {
      sub: installerIds[idx],
      aud: config.sstAudience,
      iss: config.sstIssuer,
    },
  })).flatMap(instid => ([ // event
    {
      key: `installer:${instid.id}`,
      type: 'wasCreated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: {
        id: instid.id,
        firstName: instid.firstName,
        lastName: instid.lastName,
        emailAddress: instid.emailAddress,
        phoneNumber: instid.phoneNumber,
      },
    },
    {
      key: `installer:${instid.id}`,
      type: 'hadTokenAssociated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: { token: instid.token },
    },
  ]));

  const salesAgentDescriptors = [
    {
      firstName: 'Sales',
      lastName: 'McSalesface',
      emailAddress: '3@test.com',
      phoneNumber: '+16045553333',
    },
  ];

  const salesAgentEvents = salesAgentDescriptors.map((sad, idx) => ({
    ...sad,
    id: salesAgentIds[idx],
    token: {
      sub: salesAgentIds[idx],
      aud: config.sstAudience,
      iss: config.sstIssuer,
    },
  })).flatMap(sad => ([ // event
    {
      key: `salesAgent:${sad.id}`,
      type: 'wasCreated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: {
        id: sad.id,
        firstName: sad.firstName,
        lastName: sad.lastName,
        emailAddress: sad.emailAddress,
        phoneNumber: sad.phoneNumber,
      },
    },
    {
      key: `salesAgent:${sad.id}`,
      type: 'hadTokenAssociated',
      metadata: { actor: { type: 'superuser', id: suId } },
      data: { token: sad.token },
    },
  ]));

  staticEvents.push(
    ...staffEvents,
    ...adminEvents,
    ...installerEvents,
    ...salesAgentEvents,
  );

  const firebaseAud = config.fbtAudience;
  const firebaseIss = config.fbtIssuer;

  const staticTimestamps = (events, t) => events
    .map((e, idx) => ({
      ...e,
      timestamp: e.timestamp || t + (7 * (1 + idx)),
    }));

  const t = testEpoch + (7 * staticEvents.length);

  // TODO these are misnamed and treated basically exactly like static events
  // the thought is to make it work the same way as the generator or something
  // I dunno... to be continued
  const dynamicEvents = []; // TODO

  const events = [
    staticTimestamps(staticEvents, testEpoch),
    staticTimestamps(dynamicEvents, t + 90),
  ].flat().map(e => ({ ...e, directives: ['no-transform'] }));

  assert(events.every(e => !!e.timestamp)); // other asserts?
  assert(events.every(e => !!e.key));
  assert(events.every(e => !!e.type));
  assert(events.every(e => !!e.data));

  const testDataKeys = events.map(({ key }) => key);
  await stateDB.sadd('testDataKeys', ...testDataKeys);

  { // ID sync
    const tokenEvents = events.filter(e => e.type === 'hadTokenAssociated');

    await Promise.all(tokenEvents.map(async (e) => {
      const [actorType, id] = e.key.split(':');
      const { iss, aud, sub } = e.data.token;
      await stateDB.set(`id:${iss}:${aud}:${sub}:${actorType}`, id);
    }));

    // Manually connect firebase token subs to aggregates

    const staffPromises = staffDescriptors
      .map((_, idx) => {
        assert(!!subs[idx]);
        return stateDB.set(
          `id:${firebaseIss}:${firebaseAud}:${subs[idx]}:staff`,
          staffIds[idx],
        );
      });

    const adminPromises = adminDescriptors
      .map((_, idx) => {
        const offset = staffDescriptors.length;
        assert(!!subs[idx + offset]);
        return stateDB.set(
          `id:${firebaseIss}:${firebaseAud}:${subs[idx + offset]}:admin`,
          adminIds[idx],
        );
      });

    const installerPromises = installerDescriptors
      .map((_, idx) => {
        const offset = staffDescriptors.length + adminDescriptors.length;
        assert(!!subs[idx + offset]);
        return stateDB.set(
          `id:${firebaseIss}:${firebaseAud}:${subs[idx + offset]}:installer`,
          installerIds[idx],
        );
      });

    const salesAgentPromises = salesAgentDescriptors
      .map((_, idx) => {
        const offset = staffDescriptors.length
          + adminDescriptors.length
          + installerDescriptors.length;

        assert(!!subs[idx + offset]);
        return stateDB.set(
          `id:${firebaseIss}:${firebaseAud}:${subs[idx + offset]}:salesAgent`,
          salesAgentIds[idx],
        );
      });

    await Promise.all([
      staffPromises,
      adminPromises,
      installerPromises,
      salesAgentPromises,
    ]);
  }

  return events;
};
