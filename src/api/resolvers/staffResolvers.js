// TODO: function to check first if targetId (etc) is a valid uuid and if it
// exists and points to the correct type of agent/aggregate
const assert = require('assert').strict;

module.exports = {
  Query: {
    staffSelf: async (_, __, { actor, tools }) => {
      const self = tools.read.self(actor);

      const leads = Promise.all(
        (await tools.read.standardList('lead'))
          .map(async l => tools.read.standard('lead', l)),
      );

      const jobs = Promise.all(
        (await tools.read.standardList('job'))
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
  },
};
