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

      const windowEvent = {
        key: `job:${jobId}`,
        type: 'hadWindowsCompleted',
        data: { windowIds },
      };

      const completedStages = relevantStages.filter(({ windows }) => windows
        .filter(({ id }) => !windowIds.includes(id))
        .every(({ status }) => ['complete', 'cancelled', 'rejected']
          .includes(status)));

      const jobComplete = stages
        .filter(({ id }) => !completedStages.some(({ id: cid }) => cid === id))
        .every(({ status }) => ['complete', 'rejected'].includes(status));

      const installerEvent = jobComplete ? [{
        key: `installer:${job.installerId}`,
        type: 'completedJob',
        data: { jobId: job.id },
      }] : [];

      const salesAgentEvent = jobComplete ? [{
        key: `salesAgent:${job.salesAgentId}`,
        type: 'hadJobCompleted',
        data: { jobId: job.id },
      }] : [];

      const events = [windowEvent, ...installerEvent, ...salesAgentEvent];
      return tools.write({ events });
    },
  },
};
