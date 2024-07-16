const assert = require('assert').strict;

const isOld = (item, event) => {
  assert(typeof item.timestamp === 'number', 'item.timestamp not a number');
  assert(typeof event.timestamp === 'number', 'event.timestamp not a number');
  const interval = 60 * 60 * 24 * 14; // 14 days
  return (item.timestamp + interval) <= event.timestamp;
};

const newJob = event => ({
  id: event.data.id,
  status: 'draft',
  createdTime: event.timestamp,
  modifiedTime: event.timestamp,

  isTaxExempt: event.data.isTaxExempt,
  salesAgentId: event.data.salesAgentId,
  customerId: event.data.customerId,
  addressId: event.data.addressId,
  materials: event.data.materials,
  leadId: event.data.leadId,

  stages: event.data.stages
    .map(stage => ({
      ...stage,
      status: 'initial',
      windows: stage.windows.map(window => ({
        ...window,
        status: 'initial',
      })),
    })),

  proposals: [],
  installers: [],

  startTimestamp: event.data.startTimestamp || false,
  notes: event.data.memo || '',
});

const customerDetails = event => ({
  createdTime: event.timestamp,
  modifiedTime: event.timestamp,
  firstName: event.data.firstName,
  lastName: event.data.lastName,
  businessName: event.data.businessName,
  contactName: event.data.contactName,
  emailAddress: event.data.emailAddress,
  phoneNumber: event.data.phoneNumber,
  isTaxExempt: event.data.isTaxExempt,
  taxDetails: event.data.taxDetails,
  referralType: event.data.referralType,
  referralDetails: event.data.referralDetails,
  addresses: [],
  leads: [],
  jobs: [],
});

module.exports = {
  referralCode: {
    wasCreated: event => ({ userId: event.data.userId }),
  },

  superuser: {
    wasCreated: event => ({
      aggregateType: 'Superuser',
      simulation: event.data.simulation || false,
      id: event.data.id,
    }),

    hadTokenAssociated: () => ({}),

    createdStaff: () => ({}),
  },

  admin: {
    wasCreated: event => ({
      aggregateType: 'Staff',
      id: event.data.id,
      token: false,
      userId: false,
      status: 'active',

      profile: {
        id: event.data.id,
        lastName: event.data.lastName,
        firstName: event.data.firstName,
      },

      settings: {},
    }),

    hadTokenAssociated: event => ({
      token: event.data.token,
    }),

    changedSettings: event => ({
      settings: event.data,
    }),

    wasinactive: () => ({ status: 'inactive' }),
    wasReactivated: () => ({ status: 'active' }),

    createdStaff: () => ({}),
    inactiveStaff: () => ({}),
    reactivatedStaff: () => ({}),
  },

  staff: {
    wasCreated: event => ({
      aggregateType: 'Staff',
      id: event.data.id,
      token: false,
      userId: false,
      status: 'active',

      profile: {
        id: event.data.id,
        lastName: event.data.lastName,
        firstName: event.data.firstName,
        emailAdress: event.data.emailAdress,
        phoneNumber: event.data.phoneNumber
      },

      settings: {},
    }),

    hadTokenAssociated: event => ({
      token: event.data.token,
    }),

    changedSettings: event => ({
      settings: event.data,
    }),

    wasEdited: event => ({
      profile: {
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAdress: event.data.emailAdress,
        phoneNumber: event.data.phoneNumber,
      },
    }),

    wasDeactivated: () => ({ status: 'inactive' }),
    wasReactivated: () => ({ status: 'active' }),
  },

  salesAgent: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'active',
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      phoneNumber: event.data.phoneNumber,
      jobs: [],
      leads: [],
      allJobs: [],
      allLeads: [],
    }),

    wasEdited: event => ({
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      phoneNumber: event.data.phoneNumber,
    }),

    hadTokenAssociated: () => ({}),
    wasDeactivated: () => ({ status: 'inactive' }),
    wasReactivated: () => ({ status: 'active' }),

    wasAssignedLead: (event, state) => ({
      leads: state.leads
        .filter(lead => !isOld(lead, event))
        .concat({ id: event.data.leadId, timestamp: event.timestamp }),

      allLeads: state.allLeads.concat(event.data.leadId),
    }),

    createdJob: (event, state) => ({
      jobs: state.jobs
        .filter(job => !isOld(job, event))
        .concat({ id: event.data.jobId, timestamp: event.timestamp }),

      allJobs: state.allJobs.concat(event.data.jobId),

      leads: state.leads.filter(lead => lead.id !== event.data.leadId),
      allLeads: state.allLeads.filter(leadId => leadId !== event.data.leadId),
    }),

    wasAssignedJob: (event, state) => ({
      jobs: state.jobs
        .filter(job => !isOld(job, event))
        .concat({ id: event.data.jobId, timestamp: event.timestamp }),

      allJobs: state.allJobs.concat(event.data.jobId),
    }),

    wasUnassignedJob: (event, state) => ({
      jobs: state.jobs
        .filter(job => job.id !== event.data.jobId),

      allJobs: state.allJobs.filter(jobId => jobId !== event.data.jobId),
    }),

    hadJobCompleted: (event, state) => ({
      jobs: state.jobs
        .filter(job => job.id !== event.data.jobId),
    }),
  },

  installer: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'active',
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      phoneNumber: event.data.phoneNumber,
      assignments: [],
    }),

    wasEdited: event => ({
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      phoneNumber: event.data.phoneNumber,
    }),

    hadTokenAssociated: () => ({}),
    wasDeactivated: () => ({ status: 'inactive' }),
    wasReactivated: () => ({ status: 'active' }),

    wasAssignedJob: (event, state) => ({
      assignments: state.assignments.concat(event.data.jobId),
    }),

    wasUnassignedJob: (event, state) => ({
      assignments: state.assignments
        .filter(jobId => jobId !== event.data.jobId),
    }),

    completedJob: (event, state) => ({
      assignments: state.assignments
        .filter(jobId => jobId !== event.data.jobId),
    }),
  },

  customer: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'active',
      ...customerDetails(event),
    }),

    wasModified: event => ({
      ...customerDetails(event),
    }),

    wasDeactivated: () => ({ status: 'inactive' }),
    wasReactivated: () => ({ status: 'active' }),

    hadAddressAdded: (event, state) => ({
      addresses: state.addresses.concat(event.data.address),
      modifiedTime: event.timestamp,
    }),

    hadAddressDeprecated: (event, state) => ({
      modifiedTime: event.timestamp,
      addresses: state.addresses
        .filter(address => address.id !== event.data.id),
    }),

    hadLeadCreated: (event, state) => ({
      modifiedTime: event.timestamp,
      leads: state.leads.concat(event.data.leadId),
    }),

    hadJobCreated: (event, state) => ({
      modifiedTime: event.timestamp,
      jobs: state.jobs.concat(event.data.jobId),
    }),
  },

  lead: {
    wasCreated: event => ({
      id: event.data.id,
      addressId: event.data.addressId,
      isTaxExempt: event.data.isTaxExempt,
      status: 'initial',
      customerId: event.data.customerId,
      salesAgentId: false,
      visitTimestamp: false,
      createdTime: event.timestamp,
      modifiedTime: event.timestamp,
    }),

    hadSalesAgentAssigned: event => ({
      salesAgentId: event.data.agentId,
      modifiedTime: event.timestamp,
    }),

    hadVisitScheduled: event => ({
      visitTimestamp: event.data.scheduledTimestamp,
      modifiedTime: event.timestamp,
      status: 'pending-visit',
    }),

    wasConverted: event => ({
      status: 'converted',
      modifiedTime: event.timestamp,
      jobId: event.data.jobId,
      convertedMemo: event.data.memo,
    }),

    wasDropped: event => ({
      status: 'dropped',
      modifiedTime: event.timestamp,
      droppedMemo: event.data.memo,
    }),

    wasExpired: event => ({
      status: 'expired',
      modifiedTime: event.timestamp,
    }),
  },

  job: {
    wasDrafted: event => newJob(event),

    wasPublished: () => ({
      status: 'initial',
    }),

    wasCreated: event => ({
      ...newJob(event),
      status: 'initial',
    }),

    wasModified: (event, state) => ({
      stages: event.data.stages || state.stages,
      materials: event.data.materials || state.materials,
      startTimestamp: event.data.startTimestamp || state.startTimestamp,
      modifiedTime: event.timestamp,
      modificationMemos: event.data.memo
        ? state.modificationMemos.concat(event.data.memo)
        : state.modificationMemos,
    }),

    wasProposed: (event, state) => ({
      status: 'pending-proposal',
      modifiedTime: event.timestamp,
      proposals: state.proposals.concat(event.data.proposalId),
    }),

    hadProposalAccepted: (event, state) => ({
      status: 'pending-installer-assignment',
      modifiedTime: event.timestamp,
      stages: state.stages.map(stage => ({
        ...stage,
        status: event.data.stageIds.includes(stage.id)
          ? 'pending'
          : 'rejected',
      })),
    }),

    hadProposalRejected: event => ({
      modifiedTime: event.timestamp,
      status: 'rejected',
    }),

    hadProposalCancelled: event => ({
      modifiedTime: event.timestamp,
      status: 'initial',
    }),

    hadProposalExpired: event => ({
      modifiedTime: event.timestamp,
      status: 'expired',
    }),

    hadInstallerAssigned: (event, state) => ({
      installers: state.installers.concat(event.data.installerId),
      status: 'pending-installation',
    }),

    hadInstallerUnassigned: (event, state) => ({
      status: state.installers.length === 1
        ? 'pending-installer-assignment'
        : state.status,

      installers: state.installers
        .filter(installerId => installerId !== event.data.installerId),
    }),

    hadWindowsCompleted: (event, state) => {
      const windows = stage => stage
        .windows
        .map(window => (event.data.windowIds.includes(window.id)
          ? { ...window, status: 'completed' }
          : window));

      const stages = state.stages
        .map(stage => (stage.id === event.data.stageId
          ? {
            ...stage,
            windows: windows(state.stages
              .find(s => s.id === event.data.stageId)),
          }
          : stage))
        .map(stage => ({
          ...stage,
          status: stage.windows.every(window => window.status === 'completed')
            ? 'completed'
            : stage.status,
        }));

      return ({
        modifiedTime: event.timestamp,
        stages,
        status: stages.every(stage => (
          (stage.status === 'completed') || (stage.status === 'rejected')
        )) ? 'completed' : state.status,
      });
    },
  },

  proposal: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'initial',
      jobId: event.data.jobId,
      salesAgentId: event.data.salesAgentId,
      films: event.data.films,

      stages: event.data.stages.map(stage => ({
        ...stage,
        status: 'initial',
      })),

      subtotal: event.data.subtotal,
      isTaxExempt: event.data.isTaxExempt,
      taxAmount: event.data.taxAmount,
      total: event.data.total,

      createdTime: event.timestamp,
      modifiedTime: event.timestamp,
    }),

    wasCancelled: event => ({
      status: 'cancelled',
      modifiedTime: event.timestamp,
    }),

    wasSuperseded: event => ({
      status: 'superseded',
      modifiedTime: event.timestamp,
      supersededBy: event.data.supersededBy,
    }),

    wasExpired: event => ({
      status: 'expired',
      modifiedTime: event.timestamp,
    }),

    wasRejected: event => ({
      status: 'rejected',
      modifiedTime: event.timestamp,
    }),

    wasAccepted: (event, state) => ({
      status: 'accepted',
      modifiedTime: event.timestamp,
      stasges: state.stages.map(stage => ({
        ...stage,
        status: event.data.stageIds.includes(stage.id)
          ? 'accepted'
          : 'rejected',
      })),
    }),
  },

  material: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'active',
      name: event.data.name,
      price: event.data.price,
      unit: event.data.unit,
      currencyCode: event.data.currencyCode,
    }),

    wasModified: event => ({
      price: event.data.price,
      unit: event.data.unit,
      currencyCode: event.data.currencyCode,
    }),

    wasDeprecated: () => ({
      status: 'deprecated',
    }),

    reinstateMaterial: () => ({
      status: 'active',
    }),
  },
};
