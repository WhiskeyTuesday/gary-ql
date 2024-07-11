const assert = require('assert').strict;

module.exports = {
  Query: {
    roles: (_, __, { actor: { roles } }) => Object.entries(roles)
      .map(([k, v]) => ({ name: k, id: v })),

    self: async (_, __, { actor, tools }) => {
      const { read: { cache: { impl } } } = tools;
      const self = await tools.read.self(actor);

      return ({
        __resolveType: () => (() => {
          switch (actor.type) {
            case 'admin': return 'Admin';
            case 'staff': return 'Staff';
            case 'installer': return 'Installer';
            case 'salesAgent': return 'SalesAgent';
            default: throw new Error('unknown actor type');
          }
        })(),

        ...self,

        tasks: await Promise.all((() => {
          switch (actor.type) {
            // everything current
            case 'admin':
            case 'staff': return [
              impl('active_leads'),
              impl('active_jobs'),
              impl('pending_invoices'),
              impl('rejected_proposals'),
            ];

            case 'installer': return [impl('active_jobs')];

            case 'salesAgent': return [
              impl('active_leads'),
              impl('active_jobs'),
              impl('pending_invoices'),
              impl('rejected_proposals'),
            ];

            default: throw new Error('unknown actor type');
          }
        })().map(async (key) => {
          const [aggregateType, id] = key.split(':');

          // this is inelegant and hard to read, I know
          return ((aggregateType === 'installer'
            || aggregateType === 'salesAgent')
          && self.assignments.includes(key))
            ? tools.read.standard(aggregateType, id)
            : false;
        })),
      });
    },
  },

  Mutation: {
    trackLead: async (_, { details }, { tools }) => {
      const leadId = tools.uuidv4();

      const event = {
        key: `lead:${leadId}`,
        type: 'wasCreated',
        data: {
          id: leadId,
          ...details,
        },
      };

      return tools.write({ event });
    },

    createCustomer: async (_, { details }, { tools }) => {
      const customerId = tools.uuidv4();

      const event = {
        key: `customer:${customerId}`,
        type: 'wasCreated',
        data: {
          id: customerId,
          ...details,
        },
      };

      return tools.write({ event });
    },

    editCustomer: async (_, { id, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(id), 'target id is invalid.');

      const event = {
        key: `customer:${id}`,
        type: 'wasModified',
        data: details,
      };

      return tools.write({ event });
    },

    addAddress: async (_, { customerId, address }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(customerId), 'target customerId is invalid.');

      const locationId = tools.uuidv4();

      const event = {
        key: `customer:${customerId}`,
        type: 'hadLocationAdded',
        data: {
          id: locationId,
          ...address,
        },
      };

      return tools.write({ event });
    },

    deprecateAddress: async (_, { customerId, addressId }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(customerId), 'target customerId is invalid.');
      assert(isUUID(addressId), 'target addressId is invalid.');

      const event = {
        key: `customer:${customerId}`,
        type: 'hadLocationRemoved',
        data: { id: addressId },
      };

      return tools.write({ event });
    },

    createJobDirect: async (_, { details }, { tools }) => {
      const jobId = tools.uuidv4();

      const event = {
        key: `job:${jobId}`,
        type: 'wasCreated',
        data: {
          id: jobId,
          ...details,
        },
      };

      return tools.write({ event });
    },

    convertLead: async (_, { leadId, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(leadId), 'target leadId is invalid.');

      const event = {
        key: `lead:${leadId}`,
        type: 'wasConverted',
        data: details,
      };

      return tools.write({ event });
    },

    modifyJob: async (_, { id, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(id), 'target id is invalid.');

      const event = {
        key: `job:${id}`,
        type: 'wasModified',
        data: details,
      };

      return tools.write({ event });
    },
  },
};
