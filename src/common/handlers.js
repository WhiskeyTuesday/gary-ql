const assert = require('assert').strict;

const isOld = (item, event) => {
  assert(typeof item.timestamp === 'number', 'item.timestamp not a number');
  assert(typeof event.timestamp === 'number', 'event.timestamp not a number');
  const interval = 60 * 60 * 24 * 14; // 14 days
  return (item.timestamp + interval) <= event.timestamp;
};

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
      },

      settings: {},
    }),

    hadTokenAssociated: event => ({
      token: event.data.token,
    }),

    changedSettings: event => ({
      settings: event.data,
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
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      phoneNumber: event.data.phoneNumber,
      addresses: event.data.addresses,
      isTaxExempt: event.data.isTaxExempt,
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
    wasCreated: event => ({
      id: event.data.id,
      status: 'initial',
      isTaxExempt: event.data.isTaxExempt,
      createdTime: event.timestamp,
      modifiedTime: event.timestamp,
      salesAgentId: event.data.salesAgentId,
      customerId: event.data.customerId,
      addressId: event.data.addressId,
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

      memo: event.data.memo || '',
      modificationMemos: [],
    }),

    wasModified: (event, state) => ({
      stages: event.data.stages,
      modifiedTime: event.timestamp,
      modificationMemos: state.modificationMemos.concat(event.metadata.memo),
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
      stages: event.data.stages,
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
  },

  material: {
    wasCreated: event => ({
      id: event.data.id,
      status: 'initial',
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
  },
};
