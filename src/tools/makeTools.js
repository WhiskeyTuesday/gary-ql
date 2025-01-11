/* Tools are segregated by agent type for theoretical,
probably paranoid security reasons. I guess if GQL was
exploited so that someone could run arbitrary resolvers
we'd be pretty screwed anyhow, but we might as well not
expose unneccesary functionality               --ers */

// node libraries
const crypto = require('crypto');
// const assert = require('assert').strict;

// npm tools
const { LoopsClient } = require('loops');
const { v4: isUUID } = require('is-uuid');
const { v4: uuidv4 } = require('uuid');
const { DateTime } = require('luxon');
const axios = require('axios');

module.exports = ({
  implementationConfig,
  libraryTools,
  actor,
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
      id,
      type,
      token: {
        sub: uid,
        iss: implementationConfig.fbtIssuer,
        aud: implementationConfig.fbtAudience,
      },
    }),

    // This will be overridden by common if actor is present
    // NOTE: I have made this a higher-order function rather
    // than extracting customerId from args so that the
    // signature explicitly does not match the normal case,
    // that way if this gets unknowingly called it won't do
    // anything (in place of the common case below)
    write: customerId => args => libraryTools.write({
      ...args,

      actor: { type: 'customer', id: customerId },
    }),
  };

  const common = {
    getChat: libraryTools.getChat,
    coldStart: libraryTools.coldStart, // TODO consider move to staff or su?
    injectTestData: libraryTools.injectTestData, // TODO same as coldStart
    write: args => libraryTools.write({ ...args, actor }),
    DateTime,
    notify,
    crypto,
    axios,
  };

  const tools = {
    user: {},

    staff: {},

    admin: {
      fbtIssuer: implementationConfig.fbtIssuer,
      fbtAudience: implementationConfig.fbtAudience,
    },

    installer: {},

    salesAgent: {},

    superuser: {
      implementationConfig,
      b2Load: libraryTools.b2Load,
      dumpDB: libraryTools.dumpDB,
      writeId: libraryTools.writeId,
      populateDB: libraryTools.populateDB,
      mintToken: libraryTools.tokenTools.mintToken,
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
