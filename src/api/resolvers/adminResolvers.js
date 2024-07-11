const assert = require('assert').strict;

module.exports = {
  Query: {
    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),
  },

  Mutation: {
    createStaff: async (_, { memo, details }, { tools }) => {
      const staffId = tools.uuidv4();
      const event = {
        key: `staff:${staffId}`,
        type: 'wasCreated',
        data: {
          memo,
          id: staffId,
          ...details,
        },
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return staffId;
    },

    deactivateStaff: (_, { staffId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(staffId)) { throw new Error('target staffId is invalid.'); }

      const event = {
        key: `staff:${staffId}`,
        type: 'wasDeactivated',
        data: { memo },
      };

      return tools.write({ event });
    },

    reactivateStaff: (_, { staffId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(staffId)) { throw new Error('target staffId is invalid.'); }

      const event = {
        key: `staff:${staffId}`,
        type: 'wasReactivated',
        data: { memo },
      };

      return tools.write({ event });
    },

    createSalesAgent: async (_, { memo, details }, { tools }) => {
      const agentId = tools.uuidv4();

      const event = {
        key: `salesAgent:${agentId}`,
        type: 'wasCreated',
        data: {
          id: agentId,
          firstName: details.firstName,
          lastName: details.lastName,
          emailAddress: details.emailAddress,
          phoneNumber: details.phoneNumber,

          memo,
        },
      };

      const res = await tools.write({ event });
      assert(res === 'OK', 'write failed');
      return agentId;
    },

    deactivateSalesAgent: async (_, { salesAgentId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(salesAgentId)) { throw new Error('target id is invalid.'); }
      const agent = await tools.read.standard('salesAgent', salesAgentId);
      if (!agent) { throw new Error('agent not found'); }
      assert(agent.status === 'active', 'agent is already deactivated');
      return tools.write({
        event: {
          key: `salesAgent:${salesAgentId}`,
          type: 'wasDeactivated',
          data: { memo },
        },
      });
    },

    reactivateSalesAgent: async (_, { salesAgentId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(salesAgentId)) { throw new Error('target id is invalid.'); }
      const agent = await tools.read.standard('salesAgent', salesAgentId);
      if (!agent) { throw new Error('agent not found'); }
      assert(agent.status === 'deactivated', 'agent is already active');
      return tools.write({
        event: {
          key: `salesAgent:${salesAgentId}`,
          type: 'wasReactivated',
          data: { memo },
        },
      });
    },
  },
};
