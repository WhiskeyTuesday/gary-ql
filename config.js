/* eslint-disable global-require */

const assert = require('assert').strict;

const compact = require('lodash.compact');

const isProd = process.env.NODE_ENV === 'production';

const config = {
  anonymousAccessAllowed: false,
  newUsersAllowed: false,

  redisDatabases: [
    {
      name: 'events',
      host: process.env.EVENT_DB_ENDPOINT,
      port: process.env.EVENT_DB_PORT,
      password: process.env.EVENT_DB_PASSWORD,
      url: process.env.EVENT_DB_URL,
    },
    {
      name: 'state',
      host: process.env.STATE_DB_ENDPOINT,
      port: process.env.STATE_DB_PORT,
      password: process.env.STATE_DB_PASSWORD,
      url: process.env.STATE_DB_URL,
    },
    {
      name: 'test-events',
      host: process.env.TEST_EVENT_DB_ENDPOINT,
      port: process.env.TEST_EVENT_DB_PORT,
      password: process.env.TEST_EVENT_DB_PASSWORD,
      url: process.env.TEST_EVENT_DB_URL,
    },
    {
      name: 'test-state',
      host: process.env.TEST_STATE_DB_ENDPOINT,
      port: process.env.TEST_STATE_DB_PORT,
      password: process.env.TEST_STATE_DB_PASSWORD,
      url: process.env.TEST_STATE_DB_URL,
    },
  ],

  b2: {
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    imageBucketId: process.env.B2_IMAGE_BUCKET_ID,
    dbBucketId: process.env.B2_DB_BUCKET_ID,
    endpointUrl: process.env.B2_ENDPOINT,
    apiUrl: process.env.B2_API_URL,
  },

  // self-signed-token
  sstAudience: process.env.SST_AUD,
  sstIssuer: process.env.SST_ISS,
  sstSecret: process.env.SST_SECRET,

  // firebase-token
  fbtAudience: process.env.FIREBASE_TOKEN_AUD,
  fbtIssuer: process.env.FIREBASE_TOKEN_ISS,

  // file-system level encryption
  encryptionKey: process.env.ENCRYPTION_KEY,

  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
  firebaseCredentialFilename: process.env.FIREBASE_CREDENTIAL_FILENAME,

  superusers: ['ers'],
  agentTypes: [
    'staff',
    'admin', // admin within business context
    'installer',
    'superuser', // dev, root, sysadmin, etc.
    'salesAgent',
    'systemAgent', // must be present, system "robots"
  ],

  targetTypes: [
  ],

  cacheTypes: [
    'staff',
    'admin',
    'installer',
    'superuser',
    'salesAgent',
    'job',
    'lead',
    'invoice',
    'proposal',
    'material',
    'customer',
  ],

  cacheConfigs: require('./src/common/cacheConfigs'),

  geoTypes: {
  },

  // NOTE: root and common must be first so that extends doesn't break
  typedefs: compact([
    require('./src/api/typedefs/rootTypedefs'),
    require('./src/api/typedefs/commonTypedefs'),
    require('./src/api/typedefs/staffTypedefs'),
    require('./src/api/typedefs/adminTypedefs'),
    require('./src/api/typedefs/installerTypedefs'),
    require('./src/api/typedefs/salesAgentTypedefs'),
    isProd
      ? []
      : require('./src/api/typedefs/superuserTypedefs'),
  ]),

  resolvers: {
    root: require('./src/api/resolvers/rootResolvers'),
    common: require('./src/api/resolvers/commonResolvers'),
    staff: require('./src/api/resolvers/staffResolvers'),
    admin: require('./src/api/resolvers/adminResolvers'),
    installer: require('./src/api/resolvers/installerResolvers'),
    salesAgent: require('./src/api/resolvers/salesAgentResolvers'),
    ...(isProd
      ? {}
      : {
        superuser: require('./src/api/resolvers/superuserResolvers'),
      }
    ),
  },

  makeTools: require('./src/tools/makeTools'),

  handlers: require('./src/common/handlers'),
  selfConfig: require('./src/common/selfConfig'),
  transformations: require('./src/common/transformations'),

  schemae: {
    events: require('./src/common/eventSchema'),
    input: require('./src/common/inputSchema'),
  },

  generator: {
    seed: 1,
    profilerLevel: 2,
    useRedis: true,
    iterators: require('./src/generator/iterators'),
    storeHandlers: require('./src/generator/storeHandlers'),
    clockOffset: (-1) * 1e7,
    implCtx: {
      imageFilenames: require('./in/generator/images.json'),
      vendorData: require('./in/generator/vendorData')(),
    },
  },

  coldStart: {
    fn: require('./src/common/coldStart'),
    enabled: process.env.COLD_START === 'true',
  },

  testData: {
    fn: require('./src/common/testDataInjector'),
    enabled: process.env.TEST_DATA === 'true',
    suId: 'db96362c-d612-40b1-83fd-a258ad7e70ed',
    staffIds: ['e0f012cc-88e0-4568-8b79-2e0eab32ece5'],

    userIds: [
      '54497fbc-d904-48df-ac95-c7b8398fac99',
      'cdec93b9-2fa9-438c-8e07-57f5ccd1602f',
      'd1863127-c768-401c-9294-59be8b1d3e79',
      '755b45f7-a63a-4dfc-939d-f8bf112aff98',
      '17a6d1f4-723a-4655-87c7-5207118842b1',
      '840ca1db-73cc-4932-999c-6c8971a3f1b7',
      '4f18249d-9841-4576-8a38-cef62d7d5f77',
      '2dd75e44-a50a-43e2-b888-164706d4ebe0',
    ],

    phoneNumberSubs: JSON.parse(process.env.PHONE_NUMBER_SUBS),
  },

  modulesEnabled: {
    firebase: process.env.FIREBASE === 'true',
    localStripe: process.env.LOCAL_STRIPE === 'true',
    localRedis: process.env.LOCAL_REDIS === 'true',
    mayweather: process.env.LOCAL_B2 === 'true',
    generator: process.env.GENERATOR === 'true',
    apiIntrospection: process.env.INTROSPECTION === 'true',
    twilio: process.env.TWILIO === 'true',
    b2: process.env.B2_ENABLED === 'true',
  },

  mayweatherBaseUrl: process.env.MAYWEATHER_URL || false,
  mayweatherPort: 9000,

  twilio: {
    acountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
};

// ensure that the name of no cache config is the same as a cache type
const { cacheConfigs, cacheTypes } = config;
assert(cacheConfigs.filter(x => cacheTypes.includes(x.name)).length === 0);

module.exports = config;
