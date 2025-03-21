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

const generateProposal = async ({ tools, schemae, jobId }) => {
  const isPlainObject = x => x && typeof x === 'object' && !Array.isArray(x);
  assert(isPlainObject(tools), 'tools must be an object');
  assert(isPlainObject(schemae), 'schemae must be an object');
  assert(tools.isUUID(jobId));

  const emptyProposal = {
    films: [],
    stages: [],
    isTaxExempt: false,
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  };

  const { read: { standard } } = tools;
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
};

module.exports = {
  Self: {
    __resolveType: x => x.type.charAt(0).toUpperCase() + x.type.slice(1),
  },

  Query: {
    self: async (_, __, { actor, tools }) => {
      const self = await tools.read.self(actor);

      const x = await (async () => {
        if (['staff', 'admin', 'salesAgent'].includes(actor.type)) {
          const leads = await tools.read.standardList('lead');
          const jobs = await tools.read.standardList('job');

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

    materials: (_, __, { tools }) => tools.read.standardList('material')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('material', id)))),

    material: (_, { id }, { tools }) => tools.read.standard('material', id),

    customers: (_, __, { tools }) => tools.read.standardList('customer')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('customer', id)))
        .then(customers => customers
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    customer: (_, { id }, { tools }) => tools.read.standard('customer', id),

    leads: (_, __, { tools }) => tools.read.standardList('lead')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('lead', id)))
        .then(leads => leads
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    lead: (_, { id }, { tools }) => tools.read.standard('lead', id),

    jobs: (_, __, { tools }) => tools.read.standardList('job')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('job', id)))
        .then(jobs => jobs
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    job: (_, { id }, { tools }) => tools.read.standard('job', id),

    proposals: (_, __, { tools }) => tools.read.standardList('proposal')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('proposal', id)))
        .then(proposals => proposals
          .sort((a, b) => b.modifiedTime - a.modifiedTime))),

    admins: (_, __, { tools }) => tools.read.standardList('admin')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('admin', id)))),

    admin: (_, { id }, { tools }) => tools.read.standard('admin', id),

    salesAgents: (_, __, { tools }) => tools.read.standardList('salesAgent')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('salesAgent', id)))),

    salesAgent: (_, { id }, { tools }) => tools.read.standard('salesAgent', id),

    // implicit plural is such a pain in the ass --ers
    allStaff: (_, __, { tools }) => tools.read.standardList('staff')
      .then(ids => Promise.all(ids
        .map(id => tools.read.standard('staff', id)))),

    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),

    installers: (_, __, { tools }) => tools.read.standardList('installer')
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

    proposalPreview: async (
      _,
      { jobId },
      { tools, schemae },
    ) => generateProposal({
      tools,
      schemae,
      jobId,
    }),
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
        {
          key: `customer:${details.customerId}`,
          type: 'hadLeadCreated',
          data: { leadId },
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
          type: 'hadNotesEdited',
          data: { notes },
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

      const response = await tools.write({ event });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'customer',
        id: customerId,
      });
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

      const response = await tools.write({ event });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'customer',
        id,
      });
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

      const response = await tools.write({ event });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'customer',
        id: customerId,
      });
    },

    editAddress: async (
      _,
      { customerId, addressId, address, activate, deactivate },
      { tools },
    ) => {
      const { isUUID } = tools;
      assert(isUUID(customerId), 'target customerId is invalid.');
      assert(isUUID(addressId), 'target addressId is invalid.');

      const customer = await tools.read.standard('customer', customerId);
      assert(customer, 'customer not found');
      const exAddress = customer.addresses.find(a => a.id === addressId);
      assert(exAddress, 'address not found');

      const activationEvents = (() => {
        if (!(activate || deactivate)) {
          return [];
        }

        if (activate && deactivate) {
          throw new Error('cannot activate and deactivate');
        }

        if (activate && exAddress.isActive) { return []; }
        if (deactivate && !exAddress.isActive) { return []; }

        return [{
          key: `customer:${customerId}`,
          type: activate ? 'hadAddressReinstated' : 'hadAddressDeprecated',
          data: { addressId },
        }];
      })();

      const events = [
        {
          key: `customer:${customerId}`,
          type: 'hadAddressEdited',
          data: {
            address: {
              id: addressId,
              ...address,
              country: 'us',
            },
          },
        },
        ...activationEvents,
      ];

      const response = await tools.write({ events });
      assert(response === 'OK', 'failed to write');

      return tools.read.aggregateFromDatabase({
        type: 'customer',
        id: customerId,
      });
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

      const { installers, startTimestamp, notes } = details;
      const added = installers && installers.added;
      const removed = installers && installers.removed;

      const installersChanged = installers && (added.length || removed.length);

      const startTimestampChanged = startTimestamp
        && startTimestamp !== job.startTimestamp;

      const startTimestampCleared = !startTimestamp && job.startTimestamp;

      const notesChanged = notes && notes !== job.notes;

      const events = [];
      if (installersChanged) {
        if (!['pending-installer-assignment', 'pending-installation']
          .includes(job.status)) {
          throw new Error('job is not in a valid state for installer changes');
        }

        events.push(...[
          ...added.flatMap(i => [
            {
              key: `job:${id}`,
              type: 'hadInstallerAssigned',
              data: { installerId: i },
            },
            {
              key: `installer:${i}`,
              type: 'wasAssignedJob',
              data: { jobId: id },
            },
          ]),

          ...removed.flatMap(i => [
            {
              key: `installer:${i}`,
              type: 'wasUnassignedJob',
              data: { jobId: id },
            },
            {
              key: `job:${id}`,
              type: 'hadInstallerUnassigned',
              data: { installerId: i },
            },
          ]),
        ]);
      }

      if (startTimestampChanged) {
        events.push({
          key: `job:${id}`,
          type: 'hadInstallationScheduled',
          data: { startTimestamp: details.startTimestamp },
        });
      }

      if (startTimestampCleared) {
        events.push({
          key: `job:${id}`,
          type: 'hadInstallationUnscheduled',
          data: {},
        });
      }

      if (notesChanged) {
        events.push({
          key: `job:${id}`,
          type: 'hadNotesEdited',
          data: { notes: details.notes },
        });
      }

      const { materials, stages: suppliedStages } = details;

      // filter out empty stages
      const stages = suppliedStages.filter(s => s.windows.length);

      const materialsChanged = materials
        && (
          job.materials.some(m => !materials.includes(m))
          || materials.some(m => !job.materials.includes(m))
        );

      const windowChanged = (w, wPrime) => {
        const thingsWeCareAbout = [
          'location',
          'filmId',
          'width',
          'height',
          'type',
          'glassType',
        ];

        return thingsWeCareAbout.some(k => w[k] !== wPrime[k]);
      };

      const stageChanged = (s, sPrime) => {
        // if there's a different number of windows, it's changed
        // if the window at any index is different, it's changed
        const windowsChanged = (s.windows.length !== sPrime.windows.length)
        || (s.windows.some((w, i) => windowChanged(w, sPrime.windows[i])));

        return windowsChanged;
      };

      const stagesChanged = (stages.length !== job.stages.length)
      || stages.some((s, i) => stageChanged((job.stages[i] || {}), s));

      if (materialsChanged || stagesChanged) {
        assert(job.status === 'initial', 'job is already in progress');

        // verify job has <= 3 materials
        // and that all windows use only those materials
        assert(materials.length <= 3, 'too many materials');

        const materialsUsed = stages
          .flatMap(s => s.windows.map(w => w.filmId));

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

        events.push({
          key: `job:${id}`,
          type: 'wasModified',
          data: { stages, materials },
        });
      }

      const response = await tools.write({ events });

      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return tools.read.aggregateFromDatabase({
        type: 'job',
        id,
      });
    },

    sendProposal: async (
      _,
      { jobId },
      { tools, schemae },
    ) => {
      const id = tools.uuidv4();

      // verify that proposal is valid (ie. job is in a valid complete state)
      const proposal = await generateProposal({ tools, jobId, schemae });

      const url = tools.siteUrl;
      const link = `${url}/proposal/${id}`; // TODO

      const emailAddress = await tools.read.standard('job', jobId)
        .then(job => tools.read.standard('customer', job.customerId))
        .then(customer => customer.emailAddress)
        .catch(() => null);

      assert(emailAddress, 'email address not found');

      // if email ends with test.com or example.com, loops will
      // respond with { success: true } but not actually send anything
      const emailDetails = await (async () => {
        try {
          return tools.loops.sendTransactionalEmail({
            transactionalId: 'cm7cjrobh01n610871ww42v2h',
            email: emailAddress,
            addToAudience: false,
            dataVariables: { link },
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          return { success: false, error: e };
        }
      })();

      if (emailDetails.success !== true) {
        // eslint-disable-next-line no-console
        console.error(emailDetails);
        throw new Error('failed to send email');
      }

      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const events = [
        {
          key: `job:${jobId}`,
          type: 'wasProposed',
          data: { proposalId: id },
        },
        {
          key: `proposal:${id}`,
          type: 'wasCreated',
          data: {
            id,
            jobId,
            salesAgentId: job.salesAgentId,
            ...proposal,
          },
        },
      ];

      const response = await tools.write({ events });
      if (response !== 'OK') {
        throw new Error('failed to write');
      }

      return true;
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

    markWindowsComplete: async (_, { jobId, windowIds }, { tools }) => {
      assert(windowIds.length, 'no windows provided');

      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const { stages } = job;
      assert(stages, 'stages not found');

      const relevantStages = stages.filter(({ windows }) => windows
        .some(({ id }) => windowIds.includes(id)));

      assert(relevantStages.length, 'stages not found');

      const windowEvent = {
        key: `job:${jobId}`,
        type: 'hadWindowsCompleted',
        data: { windowIds },
      };

      const completedStages = relevantStages.filter(({ windows }) => windows
        .filter(({ id }) => !windowIds.includes(id))
        .every(({ status }) => ['complete', 'cancelled', 'rejected']
          .includes(status)));

      const jobComplete = stages
        .filter(({ id }) => !completedStages.some(({ id: cid }) => cid === id))
        .every(({ status }) => ['complete', 'rejected'].includes(status));

      const installerEvent = jobComplete ? job.installers.map(iid => ({
        key: `installer:${iid}`,
        type: 'completedJob',
        data: { jobId: job.id },
      })) : [];

      const salesAgentEvent = jobComplete ? [{
        key: `salesAgent:${job.salesAgentId}`,
        type: 'hadJobCompleted',
        data: { jobId: job.id },
      }] : [];

      const events = [windowEvent, ...installerEvent, ...salesAgentEvent];
      return tools.write({ events });
    },

    forceProposalAccepted: async (_, { jobId, proposalId }, { tools }) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const proposal = await tools.read.standard('proposal', proposalId);
      assert(proposal, 'proposal not found');

      const stageIds = proposal.stages.map(s => s.id);

      // TODO allow for force approval of individual stages

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadProposalAccepted',
            data: { stageIds },
          },
          {
            key: `proposal:${proposalId}`,
            type: 'wasAccepted',
            data: { stageIds },
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    forceProposalRejected: async (_, { jobId, proposalId }, { tools }) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const proposal = await tools.read.standard('proposal', proposalId);
      assert(proposal, 'proposal not found');

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadProposalRejected',
            data: {},
          },
          {
            key: `proposal:${proposalId}`,
            type: 'wasRejected',
            data: {},
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    cancelProposal: async (
      _,
      { jobId, proposalId, memo },
      { tools },
    ) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const proposal = await tools.read.standard('proposal', proposalId);
      assert(proposal, 'proposal not found');

      // TODO send a cancellation email

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadProposalCancelled',
            data: {},
          },
          {
            key: `proposal:${proposalId}`,
            type: 'wasCancelled',
            data: { memo },
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    recordInvoiceSent: async (
      _,
      { jobId, invoiceId, externalId, sentTimestamp, memo },
      { tools },
    ) => {
      assert(tools.isUUID(jobId), 'target jobId is invalid');
      assert(tools.isUUID(invoiceId), 'target invoiceId is invalid');
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const response = await tools.write({
        event: {
          key: `job:${jobId}`,
          type: 'hadInvoiceSent',
          data: { externalId, id: invoiceId, sentTimestamp, memo },
        },
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    recordInvoicePaid: async (
      _,
      { jobId, invoiceId, paidTimestamp, externalId, memo },
      { tools },
    ) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const invoice = job.invoices.find(i => i.id === invoiceId);
      assert(invoice, 'invoice not found');
      assert(invoice.status === 'sent', 'invoice not payable');

      const response = await tools.write({
        event: {
          key: `job:${jobId}`,
          type: 'hadInvoicePaid',
          data: { invoiceId, externalId, paidTimestamp, memo },
        },
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    recordInvoiceCancelled: async (
      _,
      { jobId, invoiceId, cancelledTimestamp, externalId, memo },
      { tools },
    ) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const invoice = job.invoices.find(i => i.id === invoiceId);
      assert(invoice, 'invoice not found');
      assert(invoice.status === 'sent', 'invoice not cancellable');

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadInvoiceCancelled',
            data: { invoiceId, externalId, cancelledTimestamp, memo },
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    recordInvoiceRefunded: async (
      _,
      { jobId, invoiceId, refundedTimestamp, externalId, memo },
      { tools },
    ) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const invoice = job.invoices.find(i => i.id === invoiceId);
      assert(invoice, 'invoice not found');
      assert(invoice.status === 'paid', 'invoice not refundable');

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadInvoiceRefunded',
            data: { invoiceId, externalId, refundedTimestamp, memo },
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },

    recordInvoiceVoided: async (
      _,
      { jobId, invoiceId, voidedTimestamp, externalId, memo },
      { tools },
    ) => {
      const job = await tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const invoice = job.invoices.find(i => i.id === invoiceId);
      assert(invoice, 'invoice not found');
      assert(invoice.status === 'paid', 'invoice not voidable');

      const response = await tools.write({
        events: [
          {
            key: `job:${jobId}`,
            type: 'hadInvoiceVoided',
            data: { invoiceId, externalId, voidedTimestamp, memo },
          },
        ],
      });

      if (response !== 'OK') {
        throw new Error('failed to write');
      } else {
        return true;
      }
    },
  },
};
