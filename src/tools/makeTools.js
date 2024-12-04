/* Tools are segregated by agent type for theoretical,
probably paranoid security reasons. I guess if GQL was
exploited so that someone could run arbitrary resolvers
we'd be pretty screwed anyhow, but we might as well not
expose unneccesary functionality               --ers */

// node libraries
const crypto = require('crypto');
// const assert = require('assert').strict;

// npm tools
const { v4: uuidv4 } = require('uuid');
const { v4: isUUID } = require('is-uuid');
const axios = require('axios');
const { DateTime } = require('luxon');
const { LoopsClient } = require('loops');

module.exports = ({
  actor,
  libraryTools,
  implementationConfig,
}) => {
  const notify = libraryTools.makeNotify(implementationConfig);

  const anonymous = {
    loops: new LoopsClient(implementationConfig.loops.apiKey),
    // NOTE: TODO: some things, like siteURL, are really more data than tools
    // we should probably make a parallel actor type based thing in ctx for
    // data properties
    siteUrl: implementationConfig.siteUrl,
    read: libraryTools.read,
    uuidv4,
    isUUID,

    writeFirebaseId: ({ uid, type, id }) => libraryTools.writeId({
      token: {
        sub: uid,
        aud: implementationConfig.fbtAudience,
        iss: implementationConfig.fbtIssuer,
      },
      type,
      id,
    }),

    // will be overridden by common if actor is present
    write: args => libraryTools.write({ ...args, allowManualMetadata: true }),
  };

  const common = {
    write: args => libraryTools.write({ ...args, actor }),
    getChat: libraryTools.getChat,
    coldStart: libraryTools.coldStart, // TODO consider move to staff or su?
    injectTestData: libraryTools.injectTestData, // TODO same as
    DateTime,
    notify,
    axios,
    crypto,
  };

  const tools = {
    user: {},

    staff: {},

    admin: {},

    installer: {},

    salesAgent: {},

    superuser: {
      writeId: libraryTools.writeId,
      dumpDB: libraryTools.dumpDB,
      populateDB: libraryTools.populateDB,
      b2Load: libraryTools.b2Load,
      mintToken: libraryTools.tokenTools.mintToken,
      implementationConfig,
    },
  };

  const { superuser, ...rest } = tools;
  tools.superuser = {
    ...rest,
    ...superuser,
  };

  return {
    ...anonymous,
    ...(actor ? common : {}),
    ...(actor ? tools[actor.type] : {}),
  };
};
