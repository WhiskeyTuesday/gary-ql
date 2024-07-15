const Joi = require('joi');

// const inputSchema = require('./inputSchema');

// type aliases
const eventData = keyObject => Joi.object().keys(keyObject).required();

const uuid = Joi.string().uuid({ version: 'uuidv4' }).required();

const referralCode = Joi.string().pattern(/[A-Z0-9]{9}/);
const memo = Joi.string().trim().max(500).required();
// const accessLevel = Joi.number().integer().min(1).max(9).required();

const phoneNumberNorthAmerica = Joi.string().pattern(/^\+1\d{10}$/).required();

const token = Joi.object().keys({
  aud: Joi.string().required(), // TODO env sst aud or google aud?
  iss: Joi.string().required(), // TODO env sst iss or google iss?
  sub: Joi.string().required(), // TODO uuid or whatever firebase does?
}).required();

const currencyCode = Joi.string().valid('usd', 'cad').required();
const currencyAmount = Joi.number().integer().min(0).required();

const provinceCodes = [
  'ab', 'bc', 'mb', 'nb',
  'nl', 'ns', 'nt', 'nu',
  'on', 'pe', 'qc', 'sk',
  'yt',
];

const stateCodes = [
  'ak', 'al', 'ar', 'az',
  'ca', 'co', 'ct', 'dc',
  'de', 'fl', 'ga', 'hi',
  'ia', 'id', 'il', 'in',
  'ks', 'ky', 'la', 'ma',
  'md', 'me', 'mi', 'mn',
  'mo', 'ms', 'mt', 'nc',
  'nd', 'ne', 'nh', 'nj',
  'nm', 'nv', 'ny', 'oh',
  'ok', 'or', 'pa', 'ri',
  'sc', 'sd', 'tn', 'tx',
  'ut', 'va', 'vt', 'wa',
  'wi', 'wv', 'wy',
];

// What about US territories? Puerto Rico, Guam, etc.?
// also Europe? -- ISO-3166-2
const stateCode = Joi.string().valid(
  ...provinceCodes,
  ...stateCodes,
).required();

const countryCode = Joi.string().valid( // ISO 3166-1 alpha-2
  'us', // United States
  'ca', // Canada
).required();

const addressObject = Joi.object().keys({
  lineOne: Joi.string().required(), // TODO format, length
  lineTwo: Joi.string().optional(), // TODO format, length
  city: Joi.string().required(), // TODO format, length
  state: stateCode,
  // TODO: valid US zip, zip+4, or valid Canadian postal code
  // the regex prevents any spaces (including leading/trailing)
  postalCode: Joi.string().lowercase().max(10).pattern(/^\S+$/).required(),
  country: countryCode,
}).required();

const addressObjectWithId = Joi.object().keys({
  id: uuid,
  lineOne: Joi.string().required(), // TODO format, length
  lineTwo: Joi.string().optional(), // TODO format, length
  city: Joi.string().required(), // TODO format, length
  state: stateCode,
  // TODO: valid US zip, zip+4, or valid Canadian postal code
  // the regex prevents any spaces (including leading/trailing)
  postalCode: Joi.string().lowercase().max(10).pattern(/^\S+$/).required(),
  country: countryCode,
}).required();

const glassType = Joi.string().valid(
  'ANNEALED',
  'HEAT_STRENGTHENED',
  'TEMPERED',
).required();

const windowType = Joi.string().valid(
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
).required();

const materialUnit = Joi.string().valid(
  'sqft',
  'sqm',
).required();

const jobStage = Joi.object().keys({
  id: uuid,
  windows: Joi.array().items(Joi.object().keys({
    id: uuid,
    name: Joi.string().required(),
    filmId: uuid,
    glassType,
    windowType,
    width: Joi.number().integer().min(1).max(250).required(),
    height: Joi.number().integer().min(1).max(250).required(),
  })).required(),

  memo: memo.optional(),
}).required();

module.exports = {
  referralCode: {
    wasCreated: eventData({ code: referralCode, userId: uuid }),
  },

  superuser: {
    wasCreated: eventData({ memo, token, id: uuid, simulation: Joi.boolean() }),
    hadTokenAssociated: eventData({ token }),
    createdStaff: eventData({ id: uuid, memo }),
  },

  admin: {
    wasCreated: eventData({
      id: uuid,
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    hadTokenAssociated: eventData({ token }),
  },

  staff: {
    wasCreated: eventData({
      memo: memo.optional(),
      id: uuid,
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    wasEdited: eventData({
      memo: memo.optional(),

      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    hadTokenAssociated: eventData({ token }),
    wasAssociatedToUser: eventData({ userId: uuid }),

    changedSettings: eventData({
      contactPhoneNumber: phoneNumberNorthAmerica,
      contactEmailAddress: Joi.string().email().required(),
      mailingAddress: Joi.string().required(),
    }),

    wasDeactivated: eventData({ memo }), // TODO
    wasReactivated: eventData({ memo }), // TODO

    createdStaff: eventData({ id: uuid, memo }),
    deactivatedStaff: eventData({ id: uuid, memo }),
    reactivatedStaff: eventData({ id: uuid, memo }),
  },

  salesAgent: {
    wasCreated: eventData({
      id: uuid,
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,

      memo: memo.optional(),
    }),

    wasEdited: eventData({
      memo: memo.optional(),

      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    hadTokenAssociated: eventData({ token }),
    wasDeactivated: eventData({ memo }),
    wasReactivated: eventData({ memo }),

    wasAssignedLead: eventData({ leadId: uuid }),
    createdJob: eventData({ jobId: uuid }),
    wasAssignedJob: eventData({ jobId: uuid }),
    wasUnassignedJob: eventData({ jobId: uuid }),
    hadJobCompleted: eventData({ jobId: uuid }),
  },

  installer: {
    wasCreated: eventData({
      id: uuid,
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,

      memo: memo.optional(),
    }),

    wasEdited: eventData({
      memo: memo.optional(),

      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    hadTokenAssociated: eventData({ token }),
    wasDeactivated: eventData({ memo }),
    wasReactivated: eventData({ memo }),

    wasAssignedJob: eventData({ jobId: uuid }),
    wasUnassignedJob: eventData({ jobId: uuid }),
    completedJob: eventData({ jobId: uuid }),
  },

  customer: {
    wasCreated: eventData({
      id: uuid,
      isTaxExempt: Joi.boolean().required(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      businessName: Joi.string().optional(),
      contactName: Joi.string().optional(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
      addresses: Joi.array().items(addressObjectWithId).required(),
      referralType: Joi.string()
        .valid('SERP', 'SOCIAL', 'FRIEND', 'OTHER').required(),
      referralDetails: Joi.string().optional(),

      memo: memo.optional(),
    }),

    wasModified: eventData({
      isTaxExempt: Joi.boolean().required(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      businessName: Joi.string().optional(),
      contactName: Joi.string().optional(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,

      memo: memo.optional(),
    }),

    wasDeactivated: eventData({ memo }),
    wasReactivated: eventData({ memo }),

    hadAddressAdded: eventData({ address: addressObject }),
    hadAddressDeprecated: eventData({ addressId: uuid }),

    hadLeadCreated: eventData({ leadId: uuid }),
    hadJobCreated: eventData({ jobId: uuid }),
  },

  lead: {
    wasCreated: eventData({
      id: uuid,
      customerId: uuid,
      addressId: uuid,
      isTaxExempt: Joi.boolean().required(),

      memo: memo.optional(),
    }),

    hadSalesAgentAssigned: eventData({
      agentId: uuid,
    }),

    hadVisitScheduled: eventData({
      scheduledTimestamp: Joi.date().timestamp('unix').required(),
    }),

    wasConverted: eventData({
      jobId: uuid,

      memo: memo.optional(),
    }),

    wasDropped: eventData({
      memo: memo.optional(),
    }),

    wasExpired: eventData({}),
  },

  job: {
    wasCreated: eventData({
      id: uuid,
      leadId: uuid,
      addressId: uuid,
      customerId: uuid,
      salesAgentId: uuid,
      materials: Joi.array().items(uuid).min(1).max(3).required(),
      isTaxExempt: Joi.boolean().required(),
      stages: Joi.array().items(jobStage).required(),

      memo: memo.optional(),
    }),

    wasModified: eventData({
      stages: Joi.array().items(jobStage).required(),
      memo: memo.required(),
    }),

    wasProposed: eventData({
      memo: memo.optional(),
      proposalId: uuid,
    }),

    hadProposalAccepted: eventData({
      memo: memo.optional(),
      stageIds: Joi.array().items(uuid).required(),
    }),

    hadProposalRejected: eventData({}),

    hadProposalCancelled: eventData({}),

    hadProposalExpired: eventData({}),

    hadInstallerAssigned: eventData({ installerId: uuid }),

    hadInstallerUnassigned: eventData({ installerId: uuid }),

    hadWindowsCompleted: eventData({
      stageId: uuid,
      windowIds: Joi.array().items(uuid).required(),
    }),
  },

  proposal: {
    wasCreated: eventData({
      id: uuid,
      jobId: uuid,
      salesAgentId: uuid,

      films: Joi.array().items(Joi.object().keys({
        id: uuid,
        name: Joi.string().required(),
        sqft: Joi.number().integer().min(1).required(),
        lnft: Joi.number().integer().min(1).required(),
        priceTotal: currencyAmount,
      })).required(),

      stages: Joi.array().items(Joi.object().keys({
        films: Joi.array().items(Joi.object().keys({
          id: uuid,
          name: Joi.string().required(),
          sqft: Joi.number().integer().min(1).required(),
          lnft: Joi.number().integer().min(1).required(),
          priceTotal: currencyAmount,
        })).required(),

        windows: Joi.array().items(Joi.object().keys({
          id: uuid,
          filmId: uuid,
          name: Joi.string().required(),
          glassType,
          windowType,
          width: Joi.number().integer().min(1).max(250).required(),
          height: Joi.number().integer().min(1).max(250).required(),
          sqft: Joi.number().integer().min(1).required(),
          lnft: Joi.number().integer().min(1).required(),
          price: currencyAmount,
        })).required(),

        subtotal: currencyAmount,
      })).required(),

      subtotal: currencyAmount,
      isTaxExempt: Joi.boolean().required(),
      taxAmount: currencyAmount,
      total: currencyAmount,

      memo: memo.optional(),
    }),

    wasCancelled: eventData({
      memo: memo.optional(),
    }),

    wasSuperseded: eventData({
      newProposalId: uuid,

      memo: memo.optional(),
    }),
  },

  material: {
    wasCreated: eventData({
      id: uuid,
      name: Joi.string().required(),
      unit: materialUnit,
      price: Joi.number().integer().min(1).required(),
      currencyCode,
    }),
  },
};
