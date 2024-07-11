const assert = require('assert').strict;

module.exports = {
  Mutation: {
    markWindowComplete: (_, { jobId, windowId }, { tools }) => {
      assert(jobId, 'jobId is required');
      assert(windowId, 'windowId is required');

      // check if stage is complete
      const stageCompleteEvents = []; // TODO
      // check if job is complete
      const jobCompleteEvents = []; // TODO

      const events = [
        {
          type: 'windowCompleted',
          jobId,
          windowId,
        },
        ...stageCompleteEvents(jobId),
        ...jobCompleteEvents(jobId),
      ];

      return tools.write({ events });
    },
  },
};
