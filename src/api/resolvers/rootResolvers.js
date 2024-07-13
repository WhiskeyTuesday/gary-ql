const assert = require('assert').strict;
// const crypto = require('crypto');

// union Self = Staff | SalesAgent | Installer | Admin | Superuser

module.exports = {
  Staff: {
    __isTypeOf: () => 'Staff',
  },

  SalesAgent: {
    __isTypeOf: () => 'SalesAgent',
  },

  Installer: {
    __isTypeOf: () => 'Installer',
  },

  Admin: {
    __isTypeOf: () => 'Admin',
  },

  Superuser: {
    __isTypeOf: () => 'Superuser',
  },

  Query: {
    time: (_, __, { clock }) => clock.now().toString(),
  },

  Mutation: {
    time: (_, __, { clock }) => clock.now().toString(),
  },
};
