const assert = require('assert').strict;

const isOld = (item, event) => {
  assert(typeof item.timestamp === 'number', 'item.timestamp not a number');
  assert(typeof event.timestamp === 'number', 'event.timestamp not a number');
  const interval = 60 * 60 * 24 * 14; // 14 days
  return (item.timestamp + interval) <= event.timestamp;
};

const customerDetails = event => ({
  createdTime: event.timestamp,
  modifiedTime: event.timestamp,
  firstName: event.data.firstName,
  lastName: event.data.lastName,
  businessName: event.data.businessName,
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
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },

    }),

    wasEdited: (event, state) => ({
      profile: {
        id: state.profile.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
    }),

    hadTokenAssociated: event => ({
      token: event.data.token,
    }),

    wasDeactivated: () => ({ status: 'inactive' }),
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
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
    }),

    hadTokenAssociated: event => ({
      token: event.data.token,
    }),

    wasEdited: (event, state) => ({
      profile: {
        id: state.profile.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
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
      profile: {
        id: event.data.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
      jobs: [],
      leads: [],
      allJobs: [],
      allLeads: [],
    }),

    wasEdited: (event, state) => ({
      profile: {
        id: state.profile.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
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

    wasUnassignedLead: (event, state) => ({
      leads: state.leads
        .filter(lead => lead.id !== event.data.leadId),

      allLeads: state.allLeads
        .filter(leadId => leadId !== event.data.leadId),
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
      profile: {
        id: event.data.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
      assignments: [],
    }),

    wasEdited: (event, state) => ({
      profile: {
        id: state.profile.id,
        firstName: event.data.firstName,
        lastName: event.data.lastName,
        emailAddress: event.data.emailAddress,
        phoneNumber: event.data.phoneNumber,
      },
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
      modifiedTime: event.timestamp,
      addresses: state.addresses.concat({
        ...event.data.address,
        isActive: true,
      }),
    }),

    hadAddressEdited: (event, state) => ({
      modifiedTime: event.timestamp,
      addresses: state.addresses
        .filter(a => a.id !== event.data.address.id)
        .concat({
          ...event.data.address,
          isActive: state.addresses
            .find(a => a.id === event.data.address.id).isActive,
        }),
    }),

    hadAddressDeprecated: (event, state) => ({
      modifiedTime: event.timestamp,
      addresses: state.addresses
        .map(address => (address.id === event.data.addressId
          ? ({ ...address, isActive: false })
          : address)),
    }),

    hadAddressReinstated: (event, state) => ({
      modifiedTime: event.timestamp,
      addresses: state.addresses
        .map(address => (address.id === event.data.addressId
          ? ({ ...address, isActive: true })
          : address)),
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

      notes: event.data.notes || '',
    }),

    hadNotesEdited: event => ({
      modifiedTime: event.timestamp,
      notes: event.data.notes,
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

    wasRejected: event => ({
      status: 'rejected',
      modifiedTime: event.timestamp,
      rejectedMemo: event.data.memo,
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
      createdTime: event.timestamp,
      modifiedTime: event.timestamp,
      completedTime: false,

      isTaxExempt: event.data.isTaxExempt,
      salesAgentId: event.data.salesAgentId,
      customerId: event.data.customerId,
      addressId: event.data.addressId,
      leadId: event.data.leadId,

      stages: [],
      materials: [],
      proposals: [],
      invoices: [],
      installers: [],

      startTimestamp: event.data.startTimestamp || false,
      notes: event.data.memo || '',
    }),

    wasModified: (event, state) => ({
      stages: (event.data.stages || state.stages)
        .map(stage => ({
          ...stage,
          status: stage.status || 'initial',
          windows: stage.windows.map(window => ({
            ...window,
            status: window.status || 'initial',
          })),
        })),

      materials: event.data.materials,

      modifiedTime: event.timestamp,
      modificationMemos: event.data.memo
        ? state.modificationMemos.concat(event.data.memo)
        : state.modificationMemos,
    }),

    hadNotesEdited: event => ({
      modifiedTime: event.timestamp,
      notes: event.data.notes,
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
      status: 'initial',
    }),

    hadProposalCancelled: event => ({
      modifiedTime: event.timestamp,
      status: 'initial',
    }),

    hadProposalExpired: event => ({
      modifiedTime: event.timestamp,
      status: 'initial',
    }),

    hadInstallerAssigned: (event, state) => ({
      modifiedTime: event.timestamp,
      installers: state.installers.concat(event.data.installerId),
      status: 'pending-installation',
    }),

    hadInstallerUnassigned: (event, state) => ({
      modifiedTime: event.timestamp,
      status: state.installers.length === 1
        ? 'pending-installer-assignment'
        : state.status,

      installers: state.installers
        .filter(installerId => installerId !== event.data.installerId),
    }),

    hadInstallationScheduled: event => ({
      modifiedTime: event.timestamp,
      startTimestamp: event.data.startTimestamp,
    }),

    hadInstallationUnscheduled: event => ({
      modifiedTime: event.timestamp,
      startTimestamp: false,
    }),

    hadWindowsCompleted: (event, state) => {
      const stages = state.stages.map((stage) => {
        const windows = stage.windows.map(window => ({
          ...window,
          status: event.data.windowIds.includes(window.id)
            ? 'completed'
            : window.status,
        }));

        const status = windows.every(window => window.status === 'completed')
          ? 'completed'
          : stage.status;

        return {
          ...stage,
          windows,
          status,
        };
      });

      const status = stages
        .every(stage => ['completed', 'rejected'].includes(stage.status))
        ? 'completed'
        : state.status;

      return ({
        modifiedTime: event.timestamp,
        completedTime: status === 'completed' ? event.timestamp : false,
        stages,
        status,
      });
    },

    hadInvoiceSent: (event, state) => ({
      modifiedTime: event.timestamp,
      invoices: state.invoices.concat({
        id: event.data.invoiceId,
        status: 'sent',
        externalId: event.data.externalId,
        sentTime: event.data.sentTime,
        memo: event.data.memo,
      }),
    }),

    hadInvoicePaid: (event, state) => ({
      modifiedTime: event.timestamp,
      invoices: state.invoices.map(invoice => ({
        ...invoice,
        status: 'paid',
        paidTime: event.data.paidTime,
      })),
    }),

    hadInvoiceCancelled: (event, state) => ({
      modifiedTime: event.timestamp,
      invoices: state.invoices.map(invoice => ({
        ...invoice,
        status: 'cancelled',
        cancelledTime: event.data.cancelledTime,
      })),
    }),

    hadInvoiceRefunded: (event, state) => ({
      modifiedTime: event.timestamp,
      invoices: state.invoices.map(invoice => ({
        ...invoice,
        status: 'refunded',
        refundedTime: event.data.refundedTime,
      })),
    }),

    hadInvoiceVoided: (event, state) => ({
      modifiedTime: event.timestamp,
      invoices: state.invoices.map(invoice => ({
        ...invoice,
        status: 'voided',
        voidedTime: event.data.voidedTime,
      })),
    }),
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
        accepted: false,
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
      cancelledTime: event.timestamp,
    }),

    wasSuperseded: event => ({
      status: 'superseded',
      modifiedTime: event.timestamp,
      supersededBy: event.data.supersededBy,
      supersededTime: event.timestamp,
    }),

    wasExpired: event => ({
      status: 'expired',
      modifiedTime: event.timestamp,
      expiredTime: event.timestamp,
    }),

    wasRejected: event => ({
      status: 'rejected',
      modifiedTime: event.timestamp,
      rejectedTime: event.timestamp,
    }),

    wasAccepted: (event, state) => ({
      status: 'accepted',
      modifiedTime: event.timestamp,
      acceptedTime: event.timestamp,
      stages: state.stages.map(stage => ({
        ...stage,
        accepted: true,
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

    wasReinstated: () => ({
      status: 'active',
    }),
  },
};
