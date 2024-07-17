const assert = require('assert').strict;

const validateJobDetails = (details) => {
  const { materials, stages } = details;
  assert(materials.length > 0, 'must provide at least one material');
  assert(materials.length < 4, 'too many materials');
  assert(stages.length > 0, 'must provide at least one stage');
  assert(stages.length < 6, 'too many stages');
};

const calcWindow = ({ price, unit, widthInches, heightInches }) => {
  const sqft = (widthInches * heightInches) / 144;
  return (() => {
    switch (unit) {
      case 'sqft': return Math.round(price * sqft);
      default: throw new Error(`unsupported unit: ${unit}`);
    }
  })();
};

const parseCustomerNames = (details) => {
  const { firstName, lastName, businessName } = details;
  const contactName = businessName
    ? `${firstName} ${lastName}`
    : undefined;

  return {
    firstName: businessName ? undefined : firstName,
    lastName: businessName ? undefined : lastName,
    businessName,
    contactName,
  };
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
        .map(id => tools.read.standard('customer', id)))
        .then(customers => customers
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    customer: (_, { id }, { tools }) => tools.read.standard('customer', id),

    leads: (_, __, { tools }) => tools.read.cache.list('lead')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('lead', id)))
        .then(leads => leads
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    lead: (_, { id }, { tools }) => tools.read.standard('lead', id),

    jobs: (_, __, { tools }) => tools.read.cache.list('job')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('job', id)))
        .then(jobs => jobs
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    job: (_, { id }, { tools }) => tools.read.standard('job', id),

    proposals: (_, __, { tools }) => tools.read.cache.list('proposal')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('proposal', id)))
        .then(proposals => proposals
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    proposal: (_, { id }, { tools }) => tools.read.standard('proposal', id),

    admins: (_, __, { tools }) => tools.read.cache.list('admin')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('admin', id)))),

    admin: (_, { id }, { tools }) => tools.read.standard('admin', id),

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

    windowPrice: async (_, { window }, { tools }) => {
      const { read: { standard } } = tools;
      const { materialId, widthInches, heightInches } = window;
      assert(tools.isUUID(materialId));
      const { price, unit } = await standard('material', materialId);
      assert(price && unit, 'material not found');
      return calcWindow({ price, unit, widthInches, heightInches });
    },

    windowsPrice: async (_, { windows }, { tools }) => {
      const { read: { standard } } = tools;
      return Promise.all(windows.map(async (w) => {
        const { materialId, widthInches, heightInches } = w;
        assert(tools.isUUID(materialId));
        const { price, unit } = await standard('material', materialId);
        assert(price && unit, 'material not found');
        return calcWindow({ price, unit, widthInches, heightInches });
      }));
    },

    proposalPreview: async (_, { jobId, stageIds }, { tools }) => {
      const emptyProposal = {
        films: {},
        stages: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      };

      if (stageIds.length === 0) { return emptyProposal; }

      const { read: { standard } } = tools;
      assert(tools.isUUID(jobId));
      const job = await standard('job', jobId);
      assert(job, 'job not found');
      const stages = job.stages.filter(s => stageIds.includes(s.id));
      assert(stages.length === stageIds.length, 'stage not found');

      const filmDetails = async (filmId) => {
        assert(tools.isUUID(filmId));
        const { price, unit } = await standard('material', filmId);
        assert(price && unit, 'material not found');
        return { price, unit };
      };

      const films = await Promise.all(job.films.map(filmDetails));

      const stageProposal = (stage) => {
        const windows = stage.windows.map((window) => {
          const { status: _, filmId, ...rest } = window;
          assert(films.find(f => f.id === filmId), 'film not found');

          const {
            price: filmPrice,
            name: filmName,
            unit,
          } = films.find(f => f.id === filmId);

          const price = calcWindow({
            price: filmPrice,
            unit,
            widthInches: rest.width,
            heightInches: rest.height,
          });

          return {
            sqft: (rest.width * rest.height) / 144,
            lnft: (rest.width + rest.height) * 2,
            filmName,
            filmId,
            price,
          };
        });

        const filmsUsed = windows.reduce((acc, window) => {
          if (!acc[window.filmName]) {
            acc[window.filmName] = {
              sqft: 0,
              lnft: 0,
              priceTotal: 0,
              filmId: window.filmId,
            };
          }

          acc[window.filmName].sqft += window.sqft;
          acc[window.filmName].lnft += window.lnft;
          acc[window.filmName].priceTotal += window.price;

          return acc;
        }, {});

        const subtotal = Object.values(filmsUsed)
          .reduce((acc, { priceTotal }) => acc + priceTotal, 0);

        return {
          windows,
          films: filmsUsed,
          subtotal,
        };
      };

      const stageProposals = stages.map(stageProposal);

      const filmsUsed = stageProposals.reduce((acc, { films: stageFilms }) => {
        Object.entries(stageFilms)
          .forEach(([filmName, { sqft, lnft, priceTotal }]) => {
            if (!acc[filmName]) {
              acc[filmName] = {
                sqft: 0,
                lnft: 0,
                priceTotal: 0,
                filmId: stageFilms[filmName].filmId,
              };
            }

            acc[filmName].sqft += sqft;
            acc[filmName].lnft += lnft;
            acc[filmName].priceTotal += priceTotal;
          });

        return acc;
      }, {});

      const subtotal = Object.values(filmsUsed)
        .reduce((acc, { priceTotal }) => acc + priceTotal, 0);

      const customer = await standard('customer', job.customerId);
      const { isTaxExempt } = customer;
      const taxAmount = Math.round(subtotal * 0.0825);
      const total = subtotal + (isTaxExempt ? 0 : taxAmount);

      const jobProposal = {
        films: filmsUsed,
        stages: stageProposals,
        subtotal,
        isTaxExempt,
        taxAmount,
        total,
      };

      // ensure that if this proposal was real it would be valid
      const { error } = tools.schemae.events.proposal.wasCreated({
        id: tools.uuidv4(),
        jobId,
        salesAgentId: job.salesAgentId,

        ...jobProposal,
      });

      if (error) { throw new Error('invalid proposal error'); }

      return jobProposal;
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

      const {
        phoneNumber,
        emailAddress,
        isTaxExempt,
        taxDetails,
        referralType,
        referralDetails,
        memo,
      } = details;

      const event = {
        key: `customer:${customerId}`,
        type: 'wasCreated',
        data: {
          id: customerId,
          ...parseCustomerNames(details),
          phoneNumber,
          emailAddress,
          isTaxExempt,
          taxDetails,
          referralType,
          referralDetails,

          memo,
        },
      };

      return tools.write({ event });
    },

    editCustomer: async (_, { id, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(id), 'target id is invalid.');
      const exists = await tools.read.exists(`customer:${id}`);
      assert(exists, 'customer not found');

      const {
        phoneNumber,
        emailAddress,
        isTaxExempt,
        taxDetails,
        referralType,
        referralDetails,
        memo,
      } = details;

      const event = {
        key: `customer:${id}`,
        type: 'wasModified',
        data: {
          ...parseCustomerNames(details),
          phoneNumber,
          emailAddress,
          isTaxExempt,
          taxDetails,
          referralType,
          referralDetails,

          memo,
        },
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
