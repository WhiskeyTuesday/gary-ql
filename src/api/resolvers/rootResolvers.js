const assert = require('assert').strict;
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

  StageProposal: {
    accepted: ({ acceptedTimestamp }) => !!acceptedTimestamp,
    rejected: ({ rejectedTimestamp }) => !!rejectedTimestamp,
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
    proposal: (_, { id }, { tools }) => tools.read.standard('proposal', id),
  },

  Mutation: {
    time: (_, __, { clock }) => clock.now().toString(),

    requestPasswordResetEmail: async (
      _,
      { email },
      { tools, databases: { firebase: { auth } } },
    ) => {
      const exists = await auth().getUserByEmail(email);
      assert(exists, 'email not found');

      try {
        const isTestDomain = email.endsWith('@test.com')
          || email.endsWith('@example.com');

        const link = isTestDomain
          ? 'this is a fake link' // TODO
          : await auth().generatePasswordResetLink(email);

        // use loops API to send email
        // NOTE: If email ends with @test.com or @example.com
        // the API will return a response without actually
        // sending an email.
        const response = await tools.loops.sendTransactionalEmail({
          transactionalId: 'cm459f8qc00qwl133akppab0p',
          email,
          addToAudience: false,
          dataVariables: { link },
        });

        if (response.success !== true) {
          throw new Error('failed to send email');
        }
      } catch (e) {
        /* eslint-disable no-console */
        console.error(e);
        throw new Error('failed to send email');
      }

      return true;
    },

    acceptProposal: async (_, { proposalId, stageIds }, { tools }) => {
      // so... first problem, anon client context doesn't provide
      // a writer (I think), partly because agent will be... will
      // have to be... blank?

      const proposal = await tools.read.standard('proposal', proposalId);
      assert(proposal, 'proposal not found');

      // check if it's already been accepted or rejected
      assert(!proposal.acceptedTimestamp, 'proposal already accepted');
      assert(!proposal.rejectedTimestamp, 'proposal already rejected');

      // make sure at least one stage ID is provided
      assert(stageIds.length, 'no stages provided');

      // make sure the stage IDs line up
      assert(stageIds.every(id => proposal.stages.some(s => s.id === id)));

      // construct the events on the proposal and the job
      // and then write them back to the database (assuming we have a writer)
      const response = await tools.write({
        events: [
          {
            key: `job:${proposal.jobId}`,
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

      assert(response === 'OK', 'failed to write events');

      return true;
    },

    rejectProposal: async (_, { proposalId }, { tools }) => {
      const proposal = await tools.read.standard('proposal', proposalId);
      assert(proposal, 'proposal not found');

      assert(!proposal.acceptedTimestamp, 'proposal already accepted');
      assert(!proposal.rejectedTimestamp, 'proposal already rejected');

      const response = await tools.write({
        events: [
          {
            key: `job:${proposal.jobId}`,
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

      assert(response === 'OK', 'failed to write events');

      return true;
    },
  },
};
