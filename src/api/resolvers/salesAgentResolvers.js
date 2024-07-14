const assert = require('assert').strict;

module.exports = {
  Mutation: {
    sendProposal: async (_, { jobId, stageIds }, { tools }) => {
      const id = tools.uuidv4();
      assert(stageIds.length > 0, 'must provide at least one stageId');

      // TODO call sendgrid
      // TODO if fail return error
      // otherwise:
      const emailDetails = false; // TODO some kind of identifier or something

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
