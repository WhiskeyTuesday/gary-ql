const assert = require('assert').strict;

const calcWindow = ({ price, unit, widthInches, heightInches }) => {
  const sqft = (widthInches * heightInches) / 144;
  return (() => {
    switch (unit) {
      case 'SQ_FT': return Math.round(price * sqft);
      default: throw new Error(`unsupported unit: ${unit}`);
    }
  })();
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

    proposalPreview: async (_, { jobId }, { tools, schemae }) => {
      const emptyProposal = {
        films: [],
        stages: [],
        isTaxExempt: false,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      };

      const { read: { standard } } = tools;
      assert(tools.isUUID(jobId));
      const job = await standard('job', jobId);
      assert(job, 'job not found');
      const { stages } = job;
      if (stages.length === 0) { return emptyProposal; }

      const filmDetails = async (filmId) => {
        assert(tools.isUUID(filmId));
        const { price, unit, id, name } = await standard('material', filmId);
        assert(price && unit && id && name, 'material not found');
        return { price, unit, id, name };
      };

      if (job.materials.length === 0) { return emptyProposal; }
      const films = await Promise.all(job.materials.map(filmDetails));

      const stageProposal = (stage) => {
        const windows = stage.windows.map((window) => {
          const {
            status: _,
            filmId,
            width,
            height,
            ...rest
          } = window;

          const film = films.find(f => f.id === filmId);
          assert(film, 'film not found');

          const { price: filmPrice, name: filmName, unit } = film;

          const price = calcWindow({
            price: filmPrice,
            unit,
            widthInches: width,
            heightInches: height,
          });

          return {
            ...rest,
            sqft: Math.round((width * height) / 144),
            lnft: (width + height) * 2,
            width,
            height,
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
          id: stage.id,
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

      const filmsToArray = fs => Object.entries(fs).map(([k, v]) => {
        const { filmId: id, ...rest } = v;
        return {
          name: k,
          id,
          ...rest,
        };
      });

      const jobProposal = {
        stages: stageProposals
          .map(s => ({ ...s, films: filmsToArray(s.films) })),

        films: filmsToArray(filmsUsed),
        isTaxExempt,
        taxAmount,
        subtotal,
        total,
      };

      // ensure that if this proposal was real it would be valid
      const { error } = schemae.events.proposal.wasCreated.validate({
        id: tools.uuidv4(),
        jobId,
        salesAgentId: job.salesAgentId,

        ...jobProposal,
      });

      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        throw new Error('invalid proposal error');
      }

      return jobProposal;
    },
  },

  Mutation: {
    trackLead: async (_, { details }, { tools }) => {
      const leadId = tools.uuidv4();

      const { salesAgentId, ...rest } = details;

      const events = [
        {
          key: `lead:${leadId}`,
          type: 'wasCreated',
          data: {
            id: leadId,
            ...rest,
          },
        },
        ...salesAgentId ? [
          {
            key: `lead:${leadId}`,
            type: 'hadSalesAgentAssigned',
            data: { agentId: salesAgentId },
          },
          {
            key: `salesAgent:${salesAgentId}`,
            type: 'wasAssignedLead',
            data: { leadId },
          },
        ] : [],
      ];

      const response = await tools.write({ events });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'lead',
        id: leadId,
      });
    },

    editLead: async (
      _,
      { id, salesAgentId, visitTimestamp, notes },
      { tools },
    ) => {
      assert(tools.isUUID(id), 'target id is invalid.');
      const exists = await tools.read.exists(`lead:${id}`);
      assert(exists, 'lead not found');

      const lead = await tools.read.standard('lead', id);

      const existingAgentId = lead.salesAgentId;
      const salesAgentEvents = salesAgentId && salesAgentId !== existingAgentId
        ? [
          {
            key: `lead:${id}`,
            type: 'hadSalesAgentAssigned',
            data: { agentId: salesAgentId },
          },
          {
            key: `salesAgent:${salesAgentId}`,
            type: 'wasAssignedLead',
            data: { leadId: id },
          },
          ...existingAgentId ? [{
            key: `salesAgent:${lead.salesAgentId}`,
            type: 'wasUnassignedLead',
            data: { leadId: id },
          }] : [],
        ]
        : [];

      const existingNotes = lead.notes;
      const noteEvent = notes && notes.trim() !== existingNotes
        ? [{
          key: `lead:${id}`,
          type: 'hadMemoEdited',
          data: { memo: notes },
        }]
        : [];

      const existingTimestamp = lead.visitTimestamp;
      const timeEvent = visitTimestamp && visitTimestamp !== existingTimestamp
        ? [{
          key: `lead:${id}`,
          type: 'hadVisitScheduled',
          data: { scheduledTimestamp: visitTimestamp },
        }]
        : [];

      const events = [
        ...salesAgentEvents,
        ...timeEvent,
        ...noteEvent,
      ];

      const response = await tools.write({ events });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'lead',
        id,
      });
    },

    markLeadRejected: async (_, { id }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid.');
      const exists = await tools.read.exists(`lead:${id}`);
      assert(exists, 'lead not found');

      const event = {
        key: `lead:${id}`,
        type: 'wasRejected',
        data: {},
      };

      const response = await tools.write({ event });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'lead',
        id,
      });
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
      const exists = await tools.read.exists(`customer:${id}`);
      assert(exists, 'customer not found');

      const event = {
        key: `customer:${id}`,
        type: 'wasModified',
        data: {
          ...details,
        },
      };

      return tools.write({ event });
    },

    addAddress: async (_, { customerId, address }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(customerId), 'target customerId is invalid.');
      const customer = await tools.read.standard('customer', customerId);
      assert(customer, 'customer not found');

      const id = tools.uuidv4();

      const event = {
        key: `customer:${customerId}`,
        type: 'hadAddressAdded',
        data: { address: { id, ...address, country: 'us' } },
      };

      return tools.write({ event });
    },

    editAddress: async (_, { customerId, addressId, address }, { tools }) => {
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
        type: 'hadAddressEdited',
        data: {
          address: {
            id: addressId,
            ...address,
            country: 'us',
          },
        },
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

    reinstateAddress: async (_, { customerId, addressId }, { tools }) => {
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
        type: 'hadAddressReinstated',
        data: { id: addressId },
      };

      return tools.write({ event });
    },

    createJobDirect: async (_, { details }, { tools, actor }) => {
      const jobId = tools.uuidv4();
      const actorIsSalesAgent = actor.type === 'salesAgent'
        && actor.id === details.salesAgentId;

      const events = [
        {
          key: `job:${jobId}`,
          type: 'wasCreated',
          data: { id: jobId, ...details },
        },
        {
          key: `customer:${details.customerId}`,
          type: 'hadJobCreated',
          data: { jobId },
        },
        {
          key: `salesAgent:${details.salesAgentId}`,
          type: actorIsSalesAgent ? 'createdJob' : 'wasAssignedJob',
          data: { jobId },
        },
      ];

      const response = await tools.write({ events });

      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'job',
        id: jobId,
      });
    },

    convertLead: async (_, { leadId, details }, { tools, actor }) => {
      const { isUUID } = tools;
      assert(isUUID(leadId), 'target leadId is invalid.');
      const lead = await tools.read.standard('lead', leadId);
      assert(lead, 'lead not found');

      const jobId = tools.uuidv4();

      const events = [
        {
          key: `lead:${leadId}`,
          type: 'wasConverted',
          data: { jobId },
        },
        {
          key: `job:${jobId}`,
          type: 'wasCreated',
          data: { id: jobId, ...details },
        },
        {
          key: `customer:${details.customerId}`,
          type: 'hadJobCreated',
          data: { jobId },
        },
        {
          key: `salesAgent:${details.salesAgentId}`,
          type: actor.type === 'salesAgent' && actor.id === details.salesAgentId
            ? 'createdJob'
            : 'wasAssignedJob',
          data: { jobId },
        },
      ];

      const response = await tools.write({ events });

      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'job',
        id: jobId,
      });
    },

    modifyJob: async (_, { id, details }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(id), 'target id is invalid.');

      const job = await tools.read.standard('job', id);
      assert(job, 'job not found');
      assert(job.status === 'initial', 'job is already in progress');

      const modificationEvent = (() => {
        const { materials, stages } = details;

        assert(
          (materials && stages) || (!materials && !stages),
          'must provide both materials and stages',
        );

        if (!stages) { return []; }

        // verify job has <= 3 materials
        // and that all windows use only those materials
        assert(materials.length <= 3, 'too many materials');
        const materialsUsed = stages
          .flatMap(s => s.windows.map(w => w.materialId));

        assert(
          materialsUsed.every(m => materials.includes(m)),
          'Invalid material. Windows must all use the same (max 3)'
          + 'materials specified on the job',
        );

        assert(
          stages.every(s => isUUID(s.id)),
          'stage id is invalid',
        );

        assert(
          stages.every(s => s.windows.every(w => isUUID(w.id))),
          'window id is invalid',
        );

        return [{
          key: `job:${id}`,
          type: 'wasModified',
          data: details,
        }];
      })();

      // TODO we do the added/removed determination in the client so...
      const installerEvents = (() => {
        const { installers } = details;
        if (!installers) { return []; }

        const { added, removed } = installers;

        return [
          ...added.map(i => ({
            key: `job:${id}`,
            type: 'hadInstallerAssigned',
            data: { installerId: i },
          })),

          ...removed.map(i => ({
            key: `job:${id}`,
            type: 'hadInstallerUnassigned',
            data: { installerId: i },
          })),
        ];
      })();

      const scheduleEvents = (() => {
        const { startTimestamp } = details;
        if (!startTimestamp) { return []; }

        return [{
          key: `job:${id}`,
          type: 'hadScheduleSet',
          data: { startTimestamp },
        }];
      })();

      const events = [
        ...modificationEvent,
        ...installerEvents,
        ...scheduleEvents,
      ];

      const response = await tools.write({ events });

      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'job',
        id,
      });
    },

    sendProposal: async (_, { jobId, stageIds }, { tools }) => {
      const id = tools.uuidv4();
      assert(stageIds.length > 0, 'must provide at least one stageId');

      // verify that proposal is valid (ie. job is in a valid complete state)

      // TODO call sendgrid
      // TODO if fail return error
      // otherwise:
      const emailDetails = false; // TODO some kind of identifier or something

      if (emailDetails === false) {
        throw new Error('failed to send email');
      }

      const event = {
        key: `job:${jobId}`,
        type: 'hadProposalSent',
        data: { id, stageIds, emailDetails },
      };

      return tools.write({ event });
    },

    cancelProposal: async (_, { jobId, proposalId }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(proposalId), 'target proposalId is invalid.');
      assert(isUUID(jobId), 'target jobId is invalid.');

      // verify proposal is still pending

      // TODO call sendgrid
      // TODO if fail return error
      // otherwise:
      // const emailDetails = false; // TODO some kind of identifier?

      const event = {
        key: `job:${jobId}`,
        type: 'hadProposalRevoked',
        data: { id: proposalId },
      };

      return tools.write({ event });
    },

    supercedeProposal: async (_, { jobId, stageIds }, { tools }) => {
      const id = tools.uuidv4();
      assert(tools.isUUID(jobId), 'target jobId is invalid');
      assert(stageIds.length > 0, 'must provide at least one stageId');

      // verify proposal is still pending
      // verify job/proposal is still valid
      // verify that it's different than the current proposal I guess

      // TODO call sendgrid
      // TODO if fail return error
      // otherwise:
      // const emailDetails = false; // TODO some kind of identifier?

      const event = {
        key: `job:${jobId}`,
        type: 'hadProposalSuperceded',
        data: { id, stageIds },
      };

      return tools.write({ event });
    },
  },
};
