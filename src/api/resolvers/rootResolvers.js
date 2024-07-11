const assert = require('assert').strict;
// const crypto = require('crypto');

module.exports = {
  Query: {
    time: (_, __, { clock }) => clock.now().toString(),

    minimumSupportedVersion: (_, { platform }) => (() => {
      switch (platform) {
        case 'iOS': return 1;
        case 'android': return 1;
        case 'web': return 1;
        default: throw new Error('unknown platform');
      }
    })(),
  },
};
