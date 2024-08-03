// eslint-disable-next-line no-unused-vars
const assert = require('assert').strict;

/*
const agentCountPrototype = {
  type: 'agentCount',
  agentType: 'registeredUser',
  period: [1, 'month'],
  firstInstance: 0,
  hardDelay: 0,
  function: async () => ({}),
};

const simplePrototype = {
  frequencyType: 'simple',
  firstInstance: 0,
  period: [1, 'hr'],
  function: async () => ({}),
};

const everyPrototype = {
  firstInstance: 0,
  type: 'every',
  function: async () => ({}),
};
*/

// faker deprecated their formatted number function with no
// replacement. This is a quick and dirty version that still
// uses faker (for repeatability); it always uses north
// american formatting but with random area codes
const phoneNumber = (faker) => {
  const ns = count => [...Array(count)].map(() => faker.number.int(9)).join('');
  return `+1${ns(3)}555${ns(4)}`;
};

const systemAgent = {
  type: 'systemAgent',
  id: '0d32140e-cbe7-4460-bca4-83799105b504',
};

module.exports = [
  {
    name: 'create-initial-superusers',
    firstInstance: 1,
    type: 'never',
    function: async ({ ctx }) => ctx.superusers.map((su) => {
      const id = ctx.faker.string.uuid();
      return {
        key: `superuser:${id}`,
        type: 'wasCreated',

        // NOTE: this superuser creates itself, which,
        // I think, is fine. It certainly works for now,
        // but I may... eventually make that impossible...
        // though that will of course lead to an infinite
        // regression- which would require the ability to
        // put in an exception (in impl config I suppose
        // for a kind of "prime mover" superuser ID. How
        // very theological things do get sometimes. --ers

        // This whole iterator may not even be needed though
        // since to run the generator in the first place you
        // need to have sent in a request as one of the
        // superusers defined in the config. Ehh. I guess
        // it's better that the generator staff is created
        // by a generated superuser (although there's
        // actually no guarantee of that anyway... ehh...
        // this is all counting angels on the head of a pin.
        metadata: { actor: { type: 'superuser', id } },

        data: {
          id,
          memo: 'generator',
          simulation: true,
          token: { aud: ctx.sstAudience, iss: ctx.sstIssuer, sub: su },
        },
      };
    }),
  },
  {
    name: 'create-admin',
    firstInstance: 10,
    type: 'never',
    function: async ({ ctx, cache }) => {
      const superusers = await cache.list('superuser');
      if (!superusers.length) throw new Error('No superusers found');
      const su = ctx.faker.helpers.arrayElement(superusers);

      const id = ctx.faker.string.uuid();
      return {
        key: `admin:${id}`,
        type: 'wasCreated',
        metadata: { actor: { type: 'superuser', id: su } },
        data: {
          id,
          firstName: 'Gary',
          lastName: ctx.faker.person.lastName(),
          phoneNumber: phoneNumber(ctx.faker),
          emailAddress: 'gary@example.com',
        },
      };
    },
  },
  {
    name: 'create-staff',
    firstInstance: [1, 'hour'],
    type: 'simple',
    period: [15, 'minutes'],
    function: async ({ ctx, cache }) => {
      const target = 3;
      const existingStaff = await cache.count('staff');
      const difference = target - existingStaff;
      const howMany = difference > 0 ? 1 : 0;
      if (howMany <= 0) return [];

      const creatorType = 'admin';
      const creators = await cache.list(creatorType);
      if (!creators.length) throw new Error('No creators found');
      const creatorId = ctx.faker.helpers.arrayElement(creators);

      const createdEvents = [...Array(howMany)].map(() => {
        const sid = ctx.faker.string.uuid();
        const email = ctx.faker.internet.email({ provider: 'example.com' });

        return {
          key: `staff:${sid}`,
          type: 'wasCreated',
          metadata: { actor: { type: creatorType, id: creatorId } },
          data: {
            id: sid,
            lastName: ctx.faker.person.lastName(),
            firstName: ctx.faker.person.firstName(),
            phoneNumber: phoneNumber(ctx.faker),
            emailAddress: email,
          },
        };
      });

      const tokenEvents = createdEvents.map(e => ({
        key: `staff:${e.data.id}`,
        type: 'hadTokenAssociated',
        metadata: { actor: { type: creatorType, id: creatorId } },
        data: {
          token: {
            aud: ctx.sstAudience,
            iss: ctx.sstIssuer,
            sub: ctx.faker.string.uuid(),
          },
        },
      }));

      return [...createdEvents, ...tokenEvents];
    },
  },
  {
    name: 'create-sales-agents',
    firstInstance: [2, 'hour'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ ctx, cache }) => {
      const target = 10;
      const current = await cache.count('salesAgent');
      const difference = target - current;
      const howMany = difference > 0 ? 1 : 0;
      if (howMany <= 0) return [];

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const sid = ctx.faker.helpers.arrayElement(admin);

      return [...Array(howMany)].map(() => {
        const id = ctx.faker.string.uuid();
        return {
          key: `salesAgent:${id}`,
          type: 'wasCreated',
          metadata: { actor: { type: 'admin', id: sid } },
          data: {
            id,
            firstName: ctx.faker.person.firstName(),
            lastName: ctx.faker.person.lastName(),
            phoneNumber: phoneNumber(ctx.faker),
            emailAddress: ctx.faker.internet.email({
              provider: 'example.net',
            }),
          },
        };
      });
    },
  },
  {
    name: 'create-installers',
    firstInstance: [2, 'hour'],
    type: 'simple',
    period: [13, 'minutes'],
    function: async ({ ctx, cache }) => {
      const target = 25;
      const current = await cache.count('installer');
      const difference = target - current;
      const howMany = difference > 0 ? 1 : 0;
      if (howMany <= 0) return [];

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const sid = ctx.faker.helpers.arrayElement(admin);

      return [...Array(howMany)].map(() => {
        const id = ctx.faker.string.uuid();
        return {
          key: `installer:${id}`,
          type: 'wasCreated',
          metadata: { actor: { type: 'admin', id: sid } },
          data: {
            id,
            firstName: ctx.faker.person.firstName(),
            lastName: ctx.faker.person.lastName(),
            phoneNumber: phoneNumber(ctx.faker),
            emailAddress: ctx.faker.internet.email({
              provider: 'example.net',
            }),
          },
        };
      });
    },
  },
  {
    name: 'create-customers',
    firstInstance: [6, 'hour'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ ctx, cache }) => {
      const target = ctx.volume;
      const current = await cache.count('customer');
      const difference = target - current;
      const howMany = difference > 0 ? difference : 0;
      if (howMany <= 0) return [];

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const aid = ctx.faker.helpers.arrayElement(admin);

      const { person } = ctx.faker;

      return [...Array(howMany)].map(() => {
        const customerId = ctx.faker.string.uuid();

        return {
          key: `customer:${customerId}`,
          type: 'wasCreated',
          metadata: { actor: { type: 'admin', id: aid } },
          data: {
            id: customerId,
            firstName: person.firstName(),
            lastName: person.lastName(),
            referralType: ctx.faker.helpers.arrayElement([
              'SERP',
              'SOCIAL',
              'FRIEND',
              'OTHER',
            ]),
            referralDetails: 'generated test data',
            phoneNumber: phoneNumber(ctx.faker),
            emailAddress: ctx.faker.internet.email({
              provider: 'example.org',
            }),

            // 6.25% of customers are tax exempt
            isTaxExempt: customerId.startsWith('0'),
          },
        };
      });
    },
  },
  {
    name: 'add-addresses',
    firstInstance: [6, 'hour'],
    type: 'simple', // TODO per-customer?
    period: [3, 'days'],
    function: async ({ ctx, cache }) => {
      const { location } = ctx.faker;
      const customers = await Promise.all((await cache.list('customer'))
        .map(id => cache.entry('customer', id)));

      const admins = await cache.list('admin');
      if (!admins.length) throw new Error('No admin found');
      const aid = ctx.faker.helpers.arrayElement(admins);

      const noAddress = customers.filter(c => !c.addresses.length);
      const withAddress = customers.filter(c => c.addresses.length);

      const toAdd = [
        ...noAddress,
        ...withAddress.map(
          (c) => (ctx.faker.number.int({ min: 1, max: 100 }) > 98) ? c : [],
        ),
      ].flat();

      return toAdd.map(c => ({
        key: `customer:${c.id}`,
        type: 'hadAddressAdded',
        metadata: { actor: { type: 'admin', id: aid } },
        data: {
          address: {
            id: ctx.faker.string.uuid(),
            lineOne: location.streetAddress(),
            city: location.city(),
            state: location.state({ abbreviated: true }).toLowerCase(),
            postalCode: location.zipCode(),
            country: 'us',
          },
        },
      }));
    },
  },
  {
    name: 'track-new-lead',
    firstInstance: [6, 'hour'],
    type: 'simple',
    period: [19, 'minutes'],
    function: async ({ ctx, cache }) => {
      const target = ctx.volume;
      const current = await cache.count('lead');
      const difference = target - current;
      const howMany = difference > 0 ? difference : 0;
      if (howMany <= 0) return [];

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const aid = ctx.faker.helpers.arrayElement(admin);

      const customers = await cache.list('customer');

      return (await Promise.all([...Array(howMany)].flatMap(async () => {
        const id = ctx.faker.string.uuid();

        // if no customers just skip for now
        if (!customers.length) return [];
        const customerId = ctx.faker.helpers.arrayElement(customers);
        const customer = await cache.entry('customer', customerId);
        if (customer.addresses.length === 0) return [];

        return [
          {
            key: `lead:${id}`,
            type: 'wasCreated',
            metadata: { actor: { type: 'admin', id: aid } },
            data: {
              id,
              customerId,
              isTaxExempt: customer.isTaxExempt,
              addressId: ctx.faker.helpers.arrayElement(customer.addresses).id,
            },
          },
          {
            key: `customer:${customerId}`,
            type: 'hadLeadCreated',
            metadata: { actor: { type: 'admin', id: aid } },
            data: { leadId: id },
          },
        ];
      }))).flat();
    },
  },
  {
    name: 'deprecate-addresses',
    firstInstance: [6, 'hour'],
    type: 'simple', // TODO per-customer?
    period: [3, 'days'],
    function: () => [], // TODO
  },
  {
    name: 'assign-leads',
    firstInstance: [6, 'hour'],
    type: 'simple',
    period: [13, 'minutes'],
    function: async ({ ctx, cache }) => {
      const leadIds = await cache.list('lead');
      const leads = await Promise.all(leadIds
        .map(id => cache.entry('lead', id)));

      if (!leads.length) return [];

      // NOTE this may be unacceptably slow?
      const unassigned = leads.filter(l => !l.salesCallAgent);
      if (!unassigned.length) return [];

      const agents = await cache.list('salesAgent');
      if (!agents.length) throw new Error('No sales agents found');

      const staff = await cache.list('staff');
      if (!staff.length) throw new Error('No staff found');
      const sid = ctx.faker.helpers.arrayElement(staff);

      return unassigned.flatMap((l) => {
        // 75% chance to do nothing
        if (ctx.faker.datatype.boolean(0.75)) return [];

        const agentId = ctx.faker.helpers.arrayElement(agents);
        return [
          {
            key: `lead:${l.id}`,
            type: 'hadSalesAgentAssigned',
            metadata: { actor: { type: 'staff', id: sid } },
            data: { agentId },
          },
          {
            key: `salesAgent:${agentId}`,
            type: 'wasAssignedLead',
            metadata: { actor: { type: 'staff', id: sid } },
            data: { leadId: l.id },
          },
        ];
      });
    },
  },
  {
    name: 'schedule-sales-site-visit',
    firstInstance: [6, 'hour'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ ctx, cache }) => {
      const leadIds = await cache.list('lead');
      const leads = await Promise.all(leadIds
        .map(id => cache.entry('lead', id)));
      if (!leads.length) return [];

      const assigned = leads
        .filter(l => (l.status === 'initial')
          && l.salesAgentId
          && !l.visitTimestamp);

      if (!assigned.length) return [];

      const staff = await cache.list('staff');
      if (!staff.length) throw new Error('No staff found');
      const sid = ctx.faker.helpers.arrayElement(staff);

      return assigned.flatMap((l) => {
        // 75% chance to do nothing
        if (ctx.faker.datatype.boolean(0.75)) return [];

        // 1-7 days from now
        const time = ctx.clock.unix() + ctx.faker.number.int({
          min: 1 * 24 * 60 * 60,
          max: 7 * 24 * 60 * 60,
        });

        return {
          key: `lead:${l.id}`,
          type: 'hadVisitScheduled',
          metadata: { actor: { type: 'staff', id: sid } },
          data: { scheduledTimestamp: time },
        };
      });
    },
  },
  {
    name: 'expire-leads',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [11, 'minutes'],
    function: async ({ ctx, cache }) => {
      const leadIds = await cache.list('lead');
      const leads = await Promise.all(leadIds
        .map(id => cache.entry('lead', id)));

      const relevant = leads
        .filter(l => l.status === 'pending-visit')
        // if visit time is older than 7 days ago
        .filter(l => parseInt(l.visitTimestamp, 10)
          <= (ctx.clock.unix() - (7 * 24 * 60 * 60)));

      return relevant.map(l => ({
        key: `lead:${l.id}`,
        type: 'wasExpired',
        metadata: { actor: systemAgent },
        data: {},
      }));
    },
  },
  {
    name: 'create-draft-jobs',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ ctx, cache }) => {
      // should really be from leads
      // but I'm just going to q&d it for now
      // select a random customer (with an address)
      // select a random address
      // select a random sales agent
      // select a random admin
      // create a job (with no details)
      //
      // it should be... from a lead though
      // we... have no...
      // way to convert from draft to... initial though
      // so I'd have to add a button or... what I should
      // really do is change... uhh the requirements for
      // create to make all the fields optional or something
      // and then... validate completion before sending
      // proposals or something

      return [];
    },
  },
  {
    name: 'create-jobs',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [11, 'minutes'],
    function: async ({ ctx, cache }) => {
      const leadIds = await cache.list('lead');
      const leads = (await Promise.all(leadIds
        .map(id => cache.entry('lead', id))))
        .filter(l => !l.id.startsWith('0')); // 6.25% left to expire
      if (!leads.length) return [];

      const visited = leads
        .filter(l => (l.status === 'pending-visit')
          && parseInt(l.visitTimestamp, 10) < ctx.clock.unix());

      const materials = await cache.list('material');

      // TODO these are hard-coded here and in typedefs
      // and in the eventSchema...
      // and... will probably be somewhere else too. Not
      // ideal.
      const windowTypes = [
        'CLEAR_SINGLE_PANE',
        'CLEAR_DUAL_PANE',
        'TINTED_SP',
        'TINTED_DP',
        'LOW_E_DP',
        'HIGH_PERF_LOW_E_DP',
        'CLEAR_SP_LAMINATED',
        'CLEAR_DP_LAMINATED',
        'TINTED_SP_LAMINATED',
        'TINTED_DP_LAMINATED',
        'TRIPLE_PANE_CLEAR',
        'OTHER',
      ];

      const glassTypes = [
        'ANNEALED',
        'HEAT_STRENGTHENED',
        'TEMPERED',
      ];

      return visited.flatMap((l) => {
        const filmTypes = ctx.faker.helpers.arrayElements(materials, 3);
        const { salesAgentId, customerId, addressId, isTaxExempt } = l;

        const id = ctx.faker.string.uuid();
        return [
          {
            key: `job:${id}`,
            type: 'wasCreated',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: {
              id,
              salesAgentId,
              leadId: l.id,
              isTaxExempt,
              customerId,
              addressId,
              materials: [],
              stages: [{
                id: ctx.faker.string.uuid(),
                windows: [],

                memo: 'generator',
              }],
              // materials: filmTypes,
              /*stages: (() => {
                const howMany = ctx.faker.number.int({ min: 1, max: 5 });
                return [...Array(howMany)].map((_, idx) => ({
                  id: ctx.faker.string.uuid(),
                  windows: (() => {
                    const windows = ctx.faker.number.int({ min: 1, max: 9 });
                    return [...Array(windows)].map(() => ({
                      id: ctx.faker.string.uuid(),
                      location: ctx.faker.helpers.arrayElement([
                        'living-room',
                        'kitchen',
                        'bedroom',
                        'bathroom',
                        'office',
                        'upstairs bedroom',
                        'downstairs bedroom',
                        'hallway',
                        'garage',
                      ]),
                      filmId: ctx.faker.helpers.arrayElement(filmTypes),
                      windowType: ctx.faker.helpers.arrayElement(windowTypes),
                      glassType: ctx.faker.helpers.arrayElement(glassTypes),
                      width: ctx.faker.number.int({ min: 10, max: 100 }),
                      height: ctx.faker.number.int({ min: 10, max: 100 }),
                    }));
                  })(),

                  memo: `generator stage ${idx}`,
                }));
              })(),*/

              memo: `generator job ${id}`,
            },
          },
          {
            key: `lead:${l.id}`,
            type: 'wasConverted',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: { jobId: id },
          },
          {
            key: `customer:${customerId}`,
            type: 'hadJobCreated',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: { jobId: id },
          },
          {
            key: `salesAgent:${salesAgentId}`,
            type: 'createdJob',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: { jobId: id },
          },
        ];
      });
    },
  },
  {
    name: 'edit-job',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [31, 'minutes'],
    // TODO ignoring for now
    function: async () => [],
  },
  {
    name: 'generate-proposals',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [23, 'minutes'],
    function: async ({ ctx, cache }) => {
      const stage = async (s) => {
        const calcPrice = async (w) => {
          const material = await cache.entry('material', w.filmId);
          const sqft = (w.width * w.height) / 144;

          switch (material.unit) {
            case 'SQ_FT': return Math.round(material.price * sqft);
            case 'SQ_M': return Math.round(material.price * sqft * 10.7639);
            default: throw new Error(`Unknown unit ${material.unit}`);
          }
        };

        const getFilmName = async (w) => {
          const material = await cache.entry('material', w.filmId);
          return material.name;
        };

        const windows = await Promise.all(s.windows.map(async (w) => {
          const sqft = Math.round((w.width * w.height) / 144);
          const lnft = Math.round(((w.width + w.height) * 2) / 12);
          const price = await calcPrice(w);
          const filmName = await getFilmName(w);
          const { status: _, ...rest } = w;
          return { ...rest, sqft, lnft, price, filmName };
        }));

        const films = windows.reduce((acc, w) => {
          if (!acc[w.filmId]) {
            acc[w.filmId] = { sqft: 0, lnft: 0, priceTotal: 0 };
          }

          acc[w.filmId] = {
            name: w.filmName,
            sqft: acc[w.filmId].sqft + w.sqft,
            lnft: acc[w.filmId].lnft + w.lnft,
            priceTotal: acc[w.filmId].priceTotal + w.price,
          };

          return acc;
        }, {});

        const subtotal = Object.values(films)
          .reduce((acc, f) => acc + f.priceTotal, 0);

        return {
          id: s.id,
          windows,
          subtotal,
          films: Object.entries(films).map(([id, f]) => ({ id, ...f })),
        };
      };

      const job = async (j) => {
        const { isTaxExempt } = j;
        const stages = await Promise.all(j.stages.map(stage));

        const films = stages.reduce((acc, s) => {
          s.films.forEach((f) => {
            if (!acc[f.id]) {
              acc[f.id] = { sqft: 0, lnft: 0, priceTotal: 0 };
            }

            acc[f.id] = {
              name: f.name,
              sqft: acc[f.id].sqft + f.sqft,
              lnft: acc[f.id].lnft + f.lnft,
              priceTotal: acc[f.id].priceTotal + f.priceTotal,
            };
          });

          return acc;
        }, {});

        const jobSubtotal = stages.reduce((acc, s) => acc + s.subtotal, 0);
        const taxAmount = isTaxExempt ? 0 : Math.round(jobSubtotal * 0.0825);
        const jobTotal = jobSubtotal + taxAmount;

        return {
          id: j.id,
          isTaxExempt,
          salesAgentId: j.salesAgentId,
          stages,
          films: Object.entries(films).map(([id, f]) => ({ id, ...f })),
          subtotal: jobSubtotal,
          taxAmount,
          total: jobTotal,
        };
      };

      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));

      const jobsOutput = await Promise.all(jobs
        .filter(j => j.status === 'initial')
        .map(job));

      return jobsOutput.flatMap((o) => {
        const proposalId = ctx.faker.string.uuid();
        const { id: jobId, salesAgentId, ...proposalDetails } = o;

        return [
          {
            key: `job:${jobId}`,
            type: 'wasProposed',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: { proposalId },
          },
          {
            // TODO proposal created goes here
            key: `proposal:${proposalId}`,
            type: 'wasCreated',
            metadata: { actor: { type: 'salesAgent', id: salesAgentId } },
            data: {
              jobId,
              salesAgentId,
              id: proposalId,
              ...proposalDetails,
            },
          },
        ];
      });
    },
  },
  {
    name: 'cancel-proposals',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ cache }) => {
      const proposalIds = await cache.list('proposal');
      const proposals = await Promise.all(proposalIds
        .map(id => cache.entry('proposal', id)));

      const toCancel = proposals
        .filter(p => p.status === 'initial')
        .filter(p => p.id.startsWith('0')); // 6.25% chance of cancellation

      return toCancel.flatMap(p => ([
        {
          key: `proposal:${p.id}`,
          type: 'wasCancelled',
          metadata: { actor: { type: 'salesAgent', id: p.salesAgentId } },
          data: { memo: 'generator' },
        },
        {
          key: `job:${p.jobId}`,
          type: 'hadProposalCancelled',
          metadata: { actor: { type: 'salesAgent', id: p.salesAgentId } },
          data: { id: p.id },
        },
      ]));
    },
  },
  /*
  {
    name: 'supersede-proposals',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [19, 'minutes'],
    function: async ({ ctx, cache }) => {
      const proposalIds = await cache.list('proposal');
      const proposals = await Promise.all(proposalIds
        .map(id => cache.entry('proposal', id)));

      const toSupersede = proposals
        .filter(p => p.status === 'initial')
        .filter(p => p.id.startsWith('1')); // 6.25% chance of supersession

      const newId = ctx.faker.string.uuid();

      return toSupersede.map(p => ([
        {
          key: `proposal:${p.id}`,
          type: 'wasSuperseded',
          metadata: { actor: { type: 'salesAgent', id: p.salesAgentId } },
          data: { newProposalId: `f${newId.slice(1)}` },
        },
        {
          key: `proposal:${newId}`,
          type: 'wasCreated',
          metadata: { actor: { type: 'salesAgent', id: p.salesAgentId } },
          data: {},
        },
      ]));
    },
  },
  */
  {
    name: 'send-proposals',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [23, 'minutes'],
    // send proposals (as an email)
    // not going to do anything just yet TODO
    function: async () => [],
  },
  {
    name: 'expire-proposals',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [11, 'minutes'],
    function: async ({ ctx, cache }) => {
      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));
      const relevant = jobs
        .filter(j => j.status === 'pending-proposal')
        // if modified time is older than 7 days ago
        .filter(j => j.modifiedTime <= ctx.clock.unix() - (7 * 24 * 60 * 60));

      return relevant.map(j => ([
        {
          key: `job:${j.id}`,
          type: 'hadProposalExpired',
          metadata: { actor: systemAgent },
          data: { id: j.proposals[j.proposals.length - 1] },
        },
        {
          key: `proposal:${j.proposals[j.proposals.length - 1]}`,
          type: 'wasExpired',
          metadata: { actor: systemAgent },
          data: {},
        },
      ]));
    },
  },
  {
    name: 'proposal-responses',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [13, 'minutes'],
    // clients have selected stages to approve (or none)
    function: async ({ ctx, cache }) => {
      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));
      const relevant = jobs
        .filter(j => j.status === 'pending-proposal')
        // 93.75% chance of response - id starts with 2 always left to expire
        .filter(j => !j.id.startsWith('2'));

      return relevant.flatMap((j) => {
        // 10% chance of outright rejection
        if (ctx.faker.datatype.boolean(0.1)) {
          return [
            {
              key: `job:${j.id}`,
              type: 'hadProposalRejected',
              metadata: { actor: systemAgent },
              data: { id: j.proposals[j.proposals.length - 1] },
            },
            {
              key: `proposal:${j.proposals[j.proposals.length - 1]}`,
              type: 'wasRejected',
              metadata: { actor: systemAgent },
              data: {},
            },
          ];
        }
        // 80% change of stage approval
        const approved = j.stages
          .filter(() => ctx.faker.datatype.boolean(0.8));

        // if no stages approved, reject outright
        if (!approved.length) {
          return [
            {
              key: `job:${j.id}`,
              type: 'hadProposalRejected',
              metadata: { actor: systemAgent },
              data: { id: j.proposals[j.proposals.length - 1] },
            },
            {
              key: `proposal:${j.proposals[j.proposals.length - 1]}`,
              type: 'wasRejected',
              metadata: { actor: systemAgent },
              data: {},
            },
          ];
        } else {
          return [
            {
              key: `job:${j.id}`,
              type: 'hadProposalAccepted',
              metadata: { actor: systemAgent },
              data: { stageIds: approved.map(s => s.id) },
            },
            {
              key: `proposal:${j.proposals[j.proposals.length - 1]}`,
              type: 'wasAccepted',
              metadata: { actor: systemAgent },
              data: { stageIds: approved.map(s => s.id) },
            },
          ];
        }
      });
    },
  },
  {
    name: 'assign-installers',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [17, 'minutes'],
    function: async ({ ctx, cache }) => {
      // find jobs pending installer assignment
      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));
      const relevant = jobs
        .filter(j => j.status === 'pending-installer-assignment');

      const installers = await cache.list('installer');
      if (!installers.length) throw new Error('No installers found');
      const howMany = ctx.faker.number.int({ min: 1, max: 3 });
      const iids = ctx.faker.helpers.arrayElements(installers, howMany);

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const aid = ctx.faker.helpers.arrayElement(admin);

      return relevant.flatMap(j => iids.flatMap(iid => [
        {
          key: `job:${j.id}`,
          type: 'hadInstallerAssigned',
          metadata: { actor: { type: 'admin', id: aid } },
          data: { installerId: iid },
        },
        {
          key: `installer:${iid}`,
          type: 'wasAssignedJob',
          metadata: { actor: { type: 'admin', id: aid } },
          data: { jobId: j.id },
        },
      ]));
    },
  },
  {
    name: 'unassign-installers',
    firstInstance: [2, 'days'],
    type: 'simple',
    period: [79, 'hours'],
    function: async ({ ctx, cache }) => {
      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));
      const relevant = jobs.filter(j => j.status === 'pending-installation');

      const admin = await cache.list('admin');
      if (!admin.length) throw new Error('No admin found');
      const aid = ctx.faker.helpers.arrayElement(admin);

      return relevant.flatMap((j) => {
        const iid = ctx.faker.helpers.arrayElement(j.installers);
        return [
          {
            key: `job:${j.id}`,
            type: 'hadInstallerUnassigned',
            metadata: { actor: { type: 'admin', id: aid } },
            data: { installerId: iid },
          },
          {
            key: `installer:${iid}`,
            type: 'wasUnassignedJob',
            metadata: { actor: { type: 'admin', id: aid } },
            data: { jobId: j.id },
          },
        ];
      });
    },
  },
  {
    name: 'complete-windows',
    firstInstance: [3, 'days'],
    type: 'simple',
    period: [57, 'minutes'],
    function: async ({ ctx, cache }) => {
      const jobIds = await cache.list('job');
      const jobs = await Promise.all(jobIds.map(id => cache.entry('job', id)));
      const relevant = jobs.filter(j => j.status === 'pending-installation');

      const windowEvents = relevant.flatMap(j => j.stages.flatMap((s) => {
        if (s.status === 'completed') return [];
        if (s.status === 'rejected') return [];

        // 95% chance to do nothing
        if (ctx.faker.datatype.boolean(0.95)) return [];

        const windows = s.windows.filter(w => w.status !== 'completed');
        if (!windows.length) return [];
        const wid = ctx.faker.helpers.arrayElement(windows).id;

        const installerId = ctx.faker.helpers.arrayElement(j.installers);
        return {
          key: `job:${j.id}`,
          type: 'hadWindowsCompleted',
          metadata: { actor: { type: 'installer', id: installerId } },
          data: { stageId: s.id, windowIds: [wid] },
        };
      }));

      const stages = relevant
        .flatMap(j => j.stages.map(s => ({ ...s, jobId: j.id })));

      const stageEvents = stages.flatMap((s) => {
        if (['completed', 'rejected'].includes(s.status)) return [];
        const containsNew = s.windows.some(w => windowEvents
          .some(we => we.data.windowIds.includes(w.id)));
        if (!containsNew) return [];

        const notNew = s.windows
          .filter(w => !windowEvents
            .some(we => we.data.windowIds.includes(w.id)));

        if (!notNew.length) return [];

        return notNew.every(w => w.status === 'completed')
          ? {
            key: `job:${s.jobId}`,
            type: 'hadStageCompleted',
            metadata: { actor: systemAgent },
            data: { stageId: s.id },
          } : [];
      });

      const jobEvents = relevant.flatMap((j) => {
        const containsNew = j.stages.some(s => stageEvents
          .some(se => se.data.stageId === s.id));

        if (!containsNew) return [];

        const notNew = j.stages.filter(s => !stageEvents
          .some(se => se.data.stageId === s.id));

        if (!notNew.length) return [];

        return notNew.every(s => s.status === 'completed')
          ? {
            key: `job:${j.id}`,
            type: 'wasCompleted',
            metadata: { actor: systemAgent },
            data: {},
          } : [];
      });

      const installerEvents = relevant.flatMap((j) => {
        const completed = jobEvents.some(je => je.data.jobId === j.id);
        if (!completed) return [];
        return j.installers.map(iid => ({
          key: `installer:${iid}`,
          type: 'completedJob',
          metadata: { actor: systemAgent },
          data: { jobId: j.id },
        }));
      });

      const salesAgentEvents = relevant.flatMap((j) => {
        const completed = jobEvents.some(je => je.data.jobId === j.id);
        if (!completed) return [];
        return {
          key: `salesAgent:${j.salesAgentId}`,
          type: 'hadJobCompleted',
          metadata: { actor: systemAgent },
          data: { jobId: j.id },
        };
      });

      // NOTE: job and stage events are intentionally not
      // sent, they are only used to trigger the installer
      // and sales agent events. I could refactor them out
      // but this is how I arrived at the solution so ehh
      return [...windowEvents, ...installerEvents, ...salesAgentEvents];
    },
  },
  {
    name: 'send-invoices',
    firstInstance: [3, 'days'],
    type: 'simple',
    period: [19, 'minutes'],
    function: async () => [],
    // in actual system this will be a stripe api call
    // for now... just generate an ID and return it I
    // guess?
  },
  {
    name: 'resurrect-stages',
    firstInstance: [14, 'days'],
    type: 'simple',
    period: [17, 'hours'],
    function: async () => [],
    // find a job with a stage that was rejected
  },
];
