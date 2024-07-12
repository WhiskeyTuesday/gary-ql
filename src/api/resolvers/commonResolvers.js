const assert = require('assert').strict;

module.exports = {
  Query: {
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

    roles: (_, __, { actor: { roles } }) => Object.entries(roles)
      .map(([k, v]) => ({ name: k, id: v })),

    materials: (_, __, { tools }) => tools.read.cache.list('material'),
    material: (_, { id }, { tools }) => tools.read.standard('material', id),
    customers: (_, __, { tools }) => tools.read.cache.list('customer'),
    customer: (_, { id }, { tools }) => tools.read.standard('customer', id),
    leads: (_, __, { tools }) => tools.read.cache.list('lead'),
    lead: (_, { id }, { tools }) => tools.read.standard('lead', id),
    jobs: (_, __, { tools }) => tools.read.cache.list('job'),
    job: (_, { id }, { tools }) => tools.read.standard('job', id),
    proposals: (_, __, { tools }) => tools.read.cache.list('proposal'),
    proposal: (_, { id }, { tools }) => tools.read.standard('proposal', id),
    salesAgents: (_, __, { tools }) => tools.read.cache.list('salesAgent'),
    salesAgent: (_, { id }, { tools }) => tools.read.standard('salesAgent', id),
    allStaff: (_, __, { tools }) => tools.read.cache.list('staff'),
    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),
    installers: (_, __, { tools }) => tools.read.cache.list('installer'),
    installer: (_, { id }, { tools }) => tools.read.standard('installer', id),
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

      const { firstName, lastName, businessName, contactName } = details;

      assert(!firstName && lastName, 'first name required');
      assert(firstName && !lastName, 'last name required');

      assert(firstName || businessName, 'name required');

      assert(
        (firstName || lastName) && (businessName || contactName),
        'name conflict',
      );

      assert(contactName && !businessName, 'business name required');
      assert(businessName && !contactName, 'contact name required');

      const { addresses, ...rest } = details;

      const event = {
        key: `customer:${customerId}`,
        type: 'wasCreated',
        data: {
          id: customerId,
          addresses: addresses.map(a => ({ id: tools.uuidv4(), ...a })),
          ...rest,
        },
      };

      return tools.write({ event });
    },

    editCustomer: async (_, { id, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(id), 'target id is invalid.');

      const { firstName, lastName, businessName, contactName } = details;

      assert(!firstName && lastName, 'first name required');
      assert(firstName && !lastName, 'last name required');

      assert(firstName || businessName, 'name required');

      assert(
        (firstName || lastName) && (businessName || contactName),
        'name conflict',
      );

      assert(contactName && !businessName, 'business name required');
      assert(businessName && !contactName, 'contact name required');

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
      const customer = await tools.read.standard('customer', customerId);
      assert(customer, 'customer not found');

      const locationId = tools.uuidv4();

      const event = {
        key: `customer:${customerId}`,
        type: 'hadAddressAdded',
        data: { id: locationId, ...address },
      };

      return tools.write({ event });
    },

    deprecateAddress: async (_, { customerId, addressId }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(customerId), 'target customerId is invalid.');
      assert(isUUID(addressId), 'target addressId is invalid.');

      const customer = await tools.read.standard('customer', customerId);
      assert(customer, 'customer not found');
      assert(
        customer.addresses.find(a => a.id === addressId),
        'address not found',
      );

      const event = {
        key: `customer:${customerId}`,
        type: 'hadAddressDeprecated',
        data: { id: addressId },
      };

      return tools.write({ event });
    },

    createJobDirect: async (_, { details }, { tools }) => {
      const jobId = tools.uuidv4();

      const { materials, stages } = details;
      assert(materials.length > 0, 'must provide at least one material');
      assert(materials.length < 4, 'too many materials');
      assert(stages.length > 0, 'must provide at least one stage');
      assert(stages.length < 6, 'too many stages');

      const event = {
        key: `job:${jobId}`,
        type: 'wasCreated',
        data: { id: jobId, ...details },
      };

      return tools.write({ event });
    },

    convertLead: async (_, { leadId, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(leadId), 'target leadId is invalid.');

      const { materials, stages } = details;
      assert(materials.length > 0, 'must provide at least one material');
      assert(materials.length < 4, 'too many materials');
      assert(stages.length > 0, 'must provide at least one stage');
      assert(stages.length < 6, 'too many stages');

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
