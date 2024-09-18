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

const currencyCode = Joi.string().valid('USD', 'CAD').required();
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

const addressObject = {
  lineOne: Joi.string().required(), // TODO format, length
  lineTwo: Joi.string().optional(), // TODO format, length
  city: Joi.string().required(), // TODO format, length
  state: stateCode,
  postalCode: Joi.string().lowercase().max(10).pattern(/^\S+$/).required(),
  country: countryCode,
};

const addressObjectWithId = Joi.object().keys({
  id: uuid,
  ...addressObject,
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
  'SQ_FT',
  'SQM',
).required();

const jobStage = Joi.object().keys({
  id: uuid,
  windows: Joi.array().items(Joi.object().keys({
    id: uuid,
    location: Joi.string().required(),
    filmId: uuid,
    glassType,
    type: windowType,
    width: Joi.number().integer().min(1).max(250).required(),
    height: Joi.number().integer().min(1).max(250).required(),
  })).required(),

  memo: memo.optional(),
}).required();

const customerDetails = {
  isTaxExempt: Joi.boolean().required(),
  taxDetails: Joi.string().optional(),

  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  businessName: Joi.string().optional(),

  emailAddress: Joi.string().email().required(),
  phoneNumber: phoneNumberNorthAmerica.required(),

  referralType: Joi.string()
    .valid('SERP', 'SOCIAL', 'FRIEND', 'OTHER').optional(),
  referralDetails: Joi.string().optional(),

  memo: memo.optional(),
};

module.exports = {
  referralCode: {
    wasCreated: eventData({ code: referralCode, userId: uuid }),
  },

  superuser: {
    wasCreated: eventData({ memo, token, id: uuid, simulation: Joi.boolean() }),
    hadTokenAssociated: eventData({ token }),
  },

  admin: {
    wasCreated: eventData({
      id: uuid,
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,

      memo: memo.optional(),
    }),

    hadTokenAssociated: eventData({ token }),

    wasEdited: eventData({
      memo: memo.optional(),

      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      emailAddress: Joi.string().email().required(),
      phoneNumber: phoneNumberNorthAmerica,
    }),

    wasDeactivated: eventData({ memo: memo.optional() }),
    wasReactivated: eventData({ memo: memo.optional() }),
  },

  staff: {
    wasCreated: eventData({
      id: uuid,
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
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
    wasAssociatedToUser: eventData({ userId: uuid }),

    wasDeactivated: eventData({ memo: memo.optional() }),
    wasReactivated: eventData({ memo: memo.optional() }),

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
    wasDeactivated: eventData({ memo: memo.optional() }),
    wasReactivated: eventData({ memo: memo.optional() }),

    wasAssignedLead: eventData({ leadId: uuid }),
    wasUnassignedLead: eventData({ leadId: uuid }),
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
    wasDeactivated: eventData({ memo: memo.optional() }),
    wasReactivated: eventData({ memo: memo.optional() }),

    wasAssignedJob: eventData({ jobId: uuid }),
    wasUnassignedJob: eventData({ jobId: uuid }),
    completedJob: eventData({ jobId: uuid }),
  },

  customer: {
    wasCreated: eventData({
      id: uuid,
      ...customerDetails,
    }),

    wasModified: eventData(customerDetails),

    wasDeactivated: eventData({ memo: memo.optional() }),
    wasReactivated: eventData({ memo: memo.optional() }),

    hadAddressAdded: eventData({ address: addressObjectWithId }),
    hadAddressEdited: eventData({ address: addressObjectWithId }),
    hadAddressDeprecated: eventData({ addressId: uuid }),
    hadAddressReinstated: eventData({ addressId: uuid }),

    hadLeadCreated: eventData({ leadId: uuid }),
    hadJobCreated: eventData({ jobId: uuid }),
  },

  lead: {
    wasCreated: eventData({
      id: uuid,
      customerId: uuid,
      addressId: uuid,
      isTaxExempt: Joi.boolean().required(),

      notes: memo.optional(),
    }),

    hadNotesEdited: eventData({ notes: memo }),

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

    wasRejected: eventData({
      memo: memo.optional(),
    }),

    wasExpired: eventData({}),
  },

  job: {
    wasCreated: eventData({
      id: uuid,
      addressId: uuid,
      customerId: uuid,
      isTaxExempt: Joi.boolean().required(),

      leadId: uuid.optional(),
      salesAgentId: uuid.optional(),

      memo: memo.optional(),
    }),

    wasModified: eventData({
      materials: Joi.array().items(uuid.optional()).min(0).max(3).required(),
      stages: Joi.array().items(jobStage.optional()).min(0).max(5).required(),
      notes: memo.optional(),
      memo: memo.optional(),
    }),

    hadNotesEdited: eventData({ notes: memo }),

    wasProposed: eventData({
      memo: memo.optional(),
      proposalId: uuid,
    }),

    hadProposalAccepted: eventData({
      memo: memo.optional(),
      stageIds: Joi.array().items(uuid).required(),
    }),

    hadProposalRejected: eventData({ id: uuid }),

    hadProposalCancelled: eventData({ id: uuid }),

    hadProposalExpired: eventData({ id: uuid }),

    hadInstallerAssigned: eventData({ installerId: uuid }),

    hadInstallerUnassigned: eventData({ installerId: uuid }),

    hadInstallationScheduled: eventData({
      startTimestamp: Joi.date().timestamp('unix').required(),
    }),

    hasInstallationUnscheduled: eventData({}),

    hadWindowsCompleted: eventData({
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
        sqft: Joi.number().integer().min(0).required(),
        lnft: Joi.number().integer().min(0).required(),
        priceTotal: currencyAmount,
      })).required(),

      stages: Joi.array().items(Joi.object().keys({
        id: uuid,
        films: Joi.array().items(Joi.object().keys({
          id: uuid,
          name: Joi.string().required(),
          sqft: Joi.number().integer().min(0).required(),
          lnft: Joi.number().integer().min(0).required(),
          priceTotal: currencyAmount,
        })).required(),

        windows: Joi.array().items(Joi.object().keys({
          id: uuid,
          filmId: uuid,
          filmName: Joi.string().required(),
          location: Joi.string().required(),
          glassType,
          type: windowType,
          width: Joi.number().integer().min(1).max(250).required(),
          height: Joi.number().integer().min(1).max(250).required(),
          sqft: Joi.number().integer().min(0).required(),
          lnft: Joi.number().integer().min(0).required(),
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

    wasExpired: eventData({
      memo: memo.optional(),
    }),

    wasRejected: eventData({
      memo: memo.optional(),
    }),

    wasAccepted: eventData({
      stageIds: Joi.array().items(uuid).required(),
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

    wasModified: eventData({
      name: Joi.string().optional(),
      unit: materialUnit.optional(),
      price: Joi.number().integer().min(1).optional(),
      currencyCode: currencyCode.optional(),
    }),

    wasDeprecated: eventData({ memo: memo.optional() }),
    wasReinstated: eventData({ memo: memo.optional() }),
  },
};
