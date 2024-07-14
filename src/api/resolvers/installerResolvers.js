const assert = require('assert').strict;

module.exports = {
  Mutation: {
    markWindowsComplete: (_, { jobId, windowIds }, { tools }) => {
      assert(windowIds.length, 'no windows provided');

      const job = tools.read.standard('job', jobId);
      assert(job, 'job not found');

      const { stages } = job;
      assert(stages, 'stages not found');

      const relevantStages = stages.filter(({ windows }) => windows
        .some(({ id }) => windowIds.includes(id)));

      assert(relevantStages.length, 'stages not found');

      const windowEvents = windowIds.map(windowId => ({
        key: `window:${windowId}`,
        type: 'wasCompleted',
        data: {}, // TODO
      }));

      const completedStages = relevantStages
        .filter(({ windows }) => windows
          .filter(({ id }) => !windowIds.includes(id))
          .every(({ status }) => ['complete', 'cancelled', 'rejected'] // TODO
            .includes(status)));

      const jobComplete = stages
        .filter(({ id }) => !completedStages.some(({ id: cid }) => cid === id))
        .every(({ status }) => ['complete', 'cancelled', 'rejected'] // TODO
          .includes(status));

      const installerEvents = jobComplete.map(j => ({
        key: `installer:${j.installerId}`,
        type: 'completedJob',
        data: { jobId: j.id },
      }));

      const salesAgentEvents = jobComplete.map(j => ({
        key: `salesAgent:${j.salesAgentId}`,
        type: 'hadJobCompleted',
        data: { jobId: j.id },
      }));

      const events = [...windowEvents, ...installerEvents, ...salesAgentEvents];
      return tools.write({ events });
    },
  },
};
