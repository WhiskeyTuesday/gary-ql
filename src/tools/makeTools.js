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
    read: libraryTools.read,
    uuidv4,
    isUUID,
  };

  const common = {
    ...anonymous,
    write: args => libraryTools.write({ ...args, actor }),
    getChat: libraryTools.getChat,
    notify,
    coldStart: libraryTools.coldStart, // TODO consider move to staff or su?
    injectTestData: libraryTools.injectTestData, // TODO same as
    DateTime,
    axios,
    crypto,
    loops: new LoopsClient(implementationConfig.loops.apiKey),
  };

  const tools = {
    user: {},

    staff: {
      writeId: libraryTools.writeId,
      dumpDB: libraryTools.dumpDB,
    },

    host: {},

    superuser: {
      populateDB: libraryTools.populateDB,
      b2Load: libraryTools.b2Load,
      mintToken: libraryTools.tokenTools.mintToken,
      implementationConfig,
    },
  };

  tools.superuser = {
    ...tools.user,
    ...tools.staff,
    ...tools.host,
    ...tools.superuser,
  };

  return {
    ...common,
    ...(actor ? tools[actor.type] : {}),
  };
};
