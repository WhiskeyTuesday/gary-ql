const assert = require('assert').strict;

const validateJobDetails = (details) => {
  const { materials, stages } = details;
  assert(materials.length > 0, 'must provide at least one material');
  assert(materials.length < 4, 'too many materials');
  assert(stages.length > 0, 'must provide at least one stage');
  assert(stages.length < 6, 'too many stages');
};

const validateCustomerDetails = (details) => {
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
};

module.exports = {
  Self: {
    __resolveType: x => x.type.charAt(0).toUpperCase() + x.type.slice(1),
  },

  Query: {
    self: async (_, __, { actor, tools }) => {
      const self = await tools.read.self(actor);

      const x = await (async () => {
        if (['staff', 'admin'].includes(actor.type)) {
          const leads = await tools.read.cache.list('lead');
          const jobs = await tools.read.cache.list('job');

          return {
            ...self,

            leads: (await Promise.all(
              leads.map(l => tools.read.standard('lead', l)),
            )).sort((a, b) => b.modifiedTime - a.modifiedTime),

            jobs: (await Promise.all(
              jobs.map(j => tools.read.standard('job', j)),
            )).sort((a, b) => b.modifiedTime - a.modifiedTime),
          };
        } else {
          return self;
        }
      })();

      return { ...x, type: actor.type };
    },

    roles: (_, __, { actor: { roles } }) => Object.entries(roles)
      .map(([k, v]) => ({ name: k, id: v })),

    materials: (_, __, { tools }) => tools.read.cache.list('material')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('material', id)))),

    material: (_, { id }, { tools }) => tools.read.standard('material', id),

    customers: (_, __, { tools }) => tools.read.cache.list('customer')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('customer', id)))),

    customer: (_, { id }, { tools }) => tools.read.standard('customer', id),

    leads: (_, __, { tools }) => tools.read.cache.list('lead')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('lead', id)))),

    lead: (_, { id }, { tools }) => tools.read.standard('lead', id),

    jobs: (_, __, { tools }) => tools.read.cache.list('job')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('job', id)))),

    job: (_, { id }, { tools }) => tools.read.standard('job', id),

    proposals: (_, __, { tools }) => tools.read.cache.list('proposal')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('proposal', id)))),

    proposal: (_, { id }, { tools }) => tools.read.standard('proposal', id),

    salesAgents: (_, __, { tools }) => tools.read.cache.list('salesAgent')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('salesAgent', id)))),

    salesAgent: (_, { id }, { tools }) => tools.read.standard('salesAgent', id),

    // implicit plural is such a pain in the ass --ers
    allStaff: (_, __, { tools }) => tools.read.cache.list('staff')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('staff', id)))),

    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),

    installers: (_, __, { tools }) => tools.read.cache.list('installer')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('installer', id)))),

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
      validateCustomerDetails(details);
      const customerId = tools.uuidv4();
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
      validateCustomerDetails(details);

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
      validateJobDetails(details);

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
      validateJobDetails(details);

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

      const job = await tools.read.standard('job', id);
      assert(job, 'job not found');
      assert(job.status !== 'draft', 'job is still a draft');

      assert(
        ['initial', 'rejected', 'expired'].includes(job.status),
        'job is already in progress',
      );

      validateJobDetails(details);

      const event = {
        key: `job:${id}`,
        type: 'wasModified',
        data: details,
      };

      return tools.write({ event });
    },
  },
};
