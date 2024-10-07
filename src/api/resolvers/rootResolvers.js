// const assert = require('assert').strict;
// const crypto = require('crypto');

// union Self = Staff | SalesAgent | Installer | Admin | Superuser
module.exports = {
  Material: {
    price: material => ({
      currencyCode: material.currencyCode,
      amount: material.price,
    }),
  },

  Window: {
    film: async ({ filmId }, _, { tools }) => tools.read.standard(
      'material',
      filmId,
    ),
  },

  Customer: {
    leads: async ({ leads }, _, { tools }) => (await Promise.all(
      leads.map(l => tools.read.standard('lead', l)),
    )).sort((a, b) => b.modifiedTime - a.modifiedTime),

    jobs: async ({ jobs }, _, { tools }) => (await Promise.all(
      jobs.map(j => tools.read.standard('job', j)),
    )).sort((a, b) => b.modifiedTime - a.modifiedTime),

    phoneNumber: ({ phoneNumber }) => phoneNumber
      .slice(2) // remove +1 (US country code)
      .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
  },

  Lead: {
    customer: async (lead, _, { tools }) => tools.read.standard(
      'customer',
      lead.customerId,
    ),

    salesAgent: async (lead, _, { tools }) => (lead.salesAgentId
      ? tools.read.standard(
        'salesAgent',
        lead.salesAgentId,
      )
      : undefined),
  },

  Job: {
    proposalStatus: async (job, _, { tools }) => (job.proposals.length
      ? (await tools.read.standard('proposal', job.proposals.at(-1))).status
      : 'unproposed'),

    customer: async (job, _, { tools }) => tools.read.standard(
      'customer',
      job.customerId,
    ),

    materials: async (job, _, { tools }) => Promise.all(
      job.materials.map(m => tools.read.standard('material', m)),
    ),

    proposals: async (job, _, { tools }) => Promise.all(
      job.proposals.map(pid => tools.read.standard('proposal', pid)),
    ),

    address: async (job, _, { tools }) => tools.read.standard(
      'customer',
      job.customerId,
    ).then(c => c.addresses.find(a => a.id === job.addressId)),

    salesAgent: async (job, _, { tools }) => tools.read.standard(
      'salesAgent',
      job.salesAgentId,
    ),

    installers: async (job, _, { tools }) => Promise.all(
      job.installers.map(i => tools.read.standard('installer', i)),
    ),

    invoices: async (job, _, __) => job.invoices.map(i => ({
      sent: true,
      paid: !!i.paidTimestamp,
      cancelled: !!i.cancelledTimestamp,
      refunded: !!i.refundedTimestamp,
      voided: !!i.voidedTimestamp,
      ...i,
    })),
  },

  FilmProposal: {
    film: async (root, _, { tools }) => tools.read.standard(
      'material',
      root.id,
    ),
  },

  WindowProposal: {
    film: async (root, _, { tools }) => tools.read.standard(
      'material',
      root.filmId,
    ),
  },

  Proposal: {
    job: async (root, _, { tools }) => tools.read.standard(
      'job',
      root.jobId,
    ),

    salesAgent: async (root, _, { tools }) => tools.read.standard(
      'salesAgent',
      root.salesAgentId,
    ),

    sent: () => true,
    issuedTimestamp: ({ createdTime }) => createdTime,
    accepted: ({ acceptedTimestamp }) => !!acceptedTimestamp,
    rejected: ({ rejectedTimestamp }) => !!rejectedTimestamp,
    cancelled: ({ cancelledTimestamp }) => !!cancelledTimestamp,
  },

  Query: {
    time: (_, __, { clock }) => clock.now().toString(),
  },

  Mutation: {
    time: (_, __, { clock }) => clock.now().toString(),
  },
};
