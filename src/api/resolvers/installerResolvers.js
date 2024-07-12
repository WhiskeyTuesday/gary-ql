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

      const stageEvents = completedStages.map(({ id }) => ({
        key: `stage:${id}`,
        type: 'wasCompleted',
        data: {}, // TODO
      }));

      const jobComplete = stages
        .filter(({ id }) => !completedStages.some(({ id: cid }) => cid === id))
        .every(({ status }) => ['complete', 'cancelled', 'rejected'] // TODO
          .includes(status));

      const jobEvents = jobComplete ? [{
        key: `job:${jobId}`,
        type: 'wasCompleted',
        data: {}, // TODO
      }] : [];

      const events = [
        ...windowEvents,
        ...stageEvents,
        ...jobEvents,
      ];

      return tools.write({ events });
    },
  },
};
