// TODO: function to check first if targetId (etc) is a valid uuid and if it
// exists and points to the correct type of agent/aggregate
const assert = require('assert').strict;

module.exports = {
  Query: {
    staffSelf: async (_, __, { actor, tools }) => {
      const self = tools.read.self(actor);

      const leads = Promise.all(
        (await tools.read.cache.list('lead'))
          .map(async l => tools.read.standard('lead', l)),
      );

      const jobs = Promise.all(
        (await tools.read.cache.list('job'))
          .map(async j => tools.read.standard('job', j)),
      );

      const isActive = () => true; // TODO

      const currentLeads = leads.filter(l => isActive(l));
      const currentJobs = jobs.filter(j => isActive(j));

      return {
        ...self,
        dashboard: [...currentLeads, ...currentJobs],
      };
    },
  },

  Mutation: {
    assignSalesAgent: async (_, { leadId, salesAgentId }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(leadId), 'target leadId is invalid.');
      assert(isUUID(salesAgentId), 'target salesAgentId is invalid.');

      const events = [
        {
          key: `lead:${leadId}`,
          type: 'hadSalesCallAssigned',
          data: { salesAgentId },
        },
        {
          key: `salesAgent:${salesAgentId}`,
          type: 'wasAssignedLeadCall',
          data: { leadId },
        },
      ];

      return tools.write({ events });
    },

    unassignSalesAgent: async (_, { jobId }, { tools }) => {
      return 'not implemented';
    },

    assignInstallers: async (_, { jobId, installerIds }, { tools }) => {
      const { isUUID } = tools;
      assert(isUUID(jobId), 'target jobId is invalid.');
      assert(installerIds.every(isUUID), 'target installerIds are invalid.');

      const events = installerIds.map(installerId => ([
        {
          key: `job:${jobId}`,
          type: 'hadInstallerAssigned',
          data: { installerId },
        },
        {
          key: `installer:${installerId}`,
          type: 'wasAssignedJob',
          data: { jobId },
        },
      ]));

      return tools.write({ events });
    },

    unassignInstallers: async (_, { jobId, installerIds }, { tools }) => {
      return 'not implemented';
    },
  },
};
