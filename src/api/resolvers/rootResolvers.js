// const assert = require('assert').strict;
// const crypto = require('crypto');

// union Self = Staff | SalesAgent | Installer | Admin | Superuser
module.exports = {
  Material: {
    price: material => ({
      currencyCode: material.currencyCode,
      amount: material.price,
    }),
  },

  Customer: {
    name: (customer) => {
      const { firstName, lastName, businessName } = customer;
      return firstName
        ? `${firstName} ${lastName}`
        : businessName;
    },
  },

  Lead: {
    customer: async (lead, _, { tools }) => tools.read.standard(
      'customer',
      lead.customerId,
    ),
  },

  Job: {
    customer: async (job, _, { tools }) => tools.read.standard(
      'customer',
      job.customerId,
    ),

    materials: async (job, _, { tools }) => Promise.all(
      job.materials.map(m => tools.read.standard('material', m)),
    ),
  },

  Query: {
    time: (_, __, { clock }) => clock.now().toString(),
  },

  Mutation: {
    time: (_, __, { clock }) => clock.now().toString(),
  },
};
