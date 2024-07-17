const assert = require('assert').strict;

module.exports = {
  Query: {
    staff: (_, { id }, { tools }) => tools.read.standard('staff', id),
  },

  Mutation: {
    createMaterial: async (_, { details }, { tools }) => {
      const materialId = tools.uuidv4();
      const event = {
        key: `material:${materialId}`,
        type: 'wasCreated',
        data: {
          id: materialId,
          ...details,
        },
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return materialId;
    },

    editMaterial: async (_, { id, details }, { tools }) => {
      const event = {
        key: `material:${id}`,
        type: 'wasModified',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return id;
    },

    deprecateMaterial: async (_, { id }, { tools }) => {
      const material = await tools.read.standard('material', id);
      if (!material) { throw new Error('material not found'); }

      if (material.status === 'deprecated') { return 'OK'; }

      const event = {
        key: `material:${id}`,
        type: 'wasDeprecated',
        data: {},
      };

      return tools.write({ event });
    },

    reinstateMaterial: async (_, { id }, { tools }) => {
      const material = await tools.read.standard('material', id);
      if (!material) { throw new Error('material not found'); }
      if (material.status === 'active') { return 'OK'; }

      const event = {
        key: `material:${id}`,
        type: 'wasReinstated',
        data: {},
      };

      return tools.write({ event });
    },

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

    editStaff: async (_, { id, details }, { tools }) => {
      const staff = await tools.read.standard('staff', id);
      if (!staff) { throw new Error('staff not found'); }

      const event = {
        key: `staff:${id}`,
        type: 'wasEdited',
        data: details,
      };

      return tools.write({ event });
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

    editSalesAgent: async (_, { salesAgentId, details }, { tools }) => {
      const agent = await tools.read.standard('salesAgent', salesAgentId);
      if (!agent) { throw new Error('agent not found'); }

      const event = {
        key: `salesAgent:${salesAgentId}`,
        type: 'wasEdited',
        data: details,
      };

      return tools.write({ event });
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

    createInstaller: async (_, { memo, details }, { tools }) => {
      const installerId = tools.uuidv4();

      const event = {
        key: `installer:${installerId}`,
        type: 'wasCreated',
        data: {
          id: installerId,
          firstName: details.firstName,
          lastName: details.lastName,
          emailAddress: details.emailAddress,
          phoneNumber: details.phoneNumber,

          memo,
        },
      };

      const res = await tools.write({ event });
      assert(res === 'OK', 'write failed');
      return installerId;
    },

    editInstaller: async (_, { installerId, details }, { tools }) => {
      const installer = await tools.read.standard('installer', installerId);
      if (!installer) { throw new Error('installer not found'); }

      const event = {
        key: `installer:${installerId}`,
        type: 'wasEdited',
        data: details,
      };

      return tools.write({ event });
    },

    deactivateInstaller: async (_, { installerId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(installerId)) { throw new Error('target id is invalid.'); }
      const installer = await tools.read.standard('installer', installerId);
      if (!installer) { throw new Error('installer not found'); }
      assert(installer.status === 'active', 'installer is already deactivated');
      return tools.write({
        event: {
          key: `installer:${installerId}`,
          type: 'wasDeactivated',
          data: { memo },
        },
      });
    },

    reactivateInstaller: async (_, { installerId, memo }, { tools }) => {
      const { isUUID } = tools;
      if (!isUUID(installerId)) { throw new Error('target id is invalid.'); }
      const installer = await tools.read.standard('installer', installerId);
      if (!installer) { throw new Error('installer not found'); }
      assert(installer.status === 'deactivated', 'installer is already active');
      return tools.write({
        event: {
          key: `installer:${installerId}`,
          type: 'wasReactivated',
          data: { memo },
        },
      });
    },
  },
};
