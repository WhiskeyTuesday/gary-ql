const assert = require('assert').strict;
// const crypto = require('crypto');

// union Self = Staff | SalesAgent | Installer | Admin | Superuser

module.exports = {
  Query: {
    time: (_, __, { clock }) => clock.now().toString(),
  },

  Mutation: {
    time: (_, __, { clock }) => clock.now().toString(),
  },
};
