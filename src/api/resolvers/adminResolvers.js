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
      return tools.read.aggregateFromDatabase({
        type: 'material',
        id: materialId,
      });
    },

    editMaterial: async (_, { id, details }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const materialExists = await tools.read.exists(`material:${id}`);
      assert(materialExists, 'material not found');
      const event = {
        key: `material:${id}`,
        type: 'wasModified',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.standard('material', id);
    },

    deprecateMaterial: async (_, { id }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const material = await tools.read.standard('material', id);
      if (!material) { throw new Error('material not found'); }

      if (material.status === 'deprecated') { return material; }

      const event = {
        key: `material:${id}`,
        type: 'wasDeprecated',
        data: {},
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'material',
        id,
      });
    },

    reinstateMaterial: async (_, { id }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const material = await tools.read.standard('material', id);
      if (!material) { throw new Error('material not found'); }
      if (material.status === 'active') { return material; }

      const event = {
        key: `material:${id}`,
        type: 'wasReinstated',
        data: {},
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'material',
        id,
      });
    },

    createAdmin: async (_, { memo, details }, { tools }) => {
      const adminId = tools.uuidv4();
      const event = {
        key: `admin:${adminId}`,
        type: 'wasCreated',
        data: {
          memo,
          id: adminId,
          ...details,
        },
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'admin',
        id: adminId,
      });
    },

    editAdmin: async (_, { id, details }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const admin = await tools.read.exists(`admin:${id}`);
      if (!admin) { throw new Error('admin not found'); }

      const event = {
        key: `admin:${id}`,
        type: 'wasEdited',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'admin',
        id,
      });
    },

    deactivateAdmin: async (_, { id, memo }, { tools, actor }) => {
      if (!tools.isUUID(id)) { throw new Error('target id is invalid.'); }
      const admin = await tools.read.standard('admin', id);
      if (!admin) { throw new Error('admin not found'); }

      if (actor.id === id) { throw new Error('cannot deactivate self'); }

      if (admin.status === 'deactivated') { return admin; }

      const response = await tools.write({
        event: {
          key: `admin:${id}`,
          type: 'wasDeactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'admin',
        id,
      });
    },

    reactivateAdmin: async (_, { id, memo }, { tools }) => {
      if (!tools.isUUID(id)) { throw new Error('target id is invalid.'); }
      const admin = await tools.read.standard('admin', id);
      if (!admin) { throw new Error('admin not found'); }
      if (admin.status === 'active') { return admin; }
      const response = await tools.write({
        event: {
          key: `admin:${id}`,
          type: 'wasReactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'admin',
        id,
      });
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
      return tools.read.aggregateFromDatabase({
        type: 'staff',
        id: staffId,
      });
    },

    editStaff: async (_, { id, details }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const staff = await tools.read.standard('staff', id);
      if (!staff) { throw new Error('staff not found'); }

      const event = {
        key: `staff:${id}`,
        type: 'wasEdited',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'staff',
        id,
      });
    },

    deactivateStaff: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const staff = tools.read.standard('staff', id);
      assert(staff, 'staff not found');
      if (staff.status === 'deactivated') { return staff; }

      const event = {
        key: `staff:${id}`,
        type: 'wasDeactivated',
        data: { memo },
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'staff',
        id,
      });
    },

    reactivateStaff: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const staff = tools.read.standard('staff', id);
      assert(staff, 'staff not found');
      if (staff.status === 'active') { return staff; }

      const event = {
        key: `staff:${id}`,
        type: 'wasReactivated',
        data: { memo },
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'staff',
        id,
      });
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
      return tools.read.aggregateFromDatabase({
        type: 'salesAgent',
        id: agentId,
      });
    },

    editSalesAgent: async (_, { id, details }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const agent = await tools.read.standard('salesAgent', id);
      if (!agent) { throw new Error('agent not found'); }

      const event = {
        key: `salesAgent:${id}`,
        type: 'wasEdited',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'salesAgent',
        id,
      });
    },

    deactivateSalesAgent: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const agent = await tools.read.standard('salesAgent', id);
      if (!agent) { throw new Error('agent not found'); }
      if (agent.status === 'deactivated') { return agent; }
      const response = await tools.write({
        event: {
          key: `salesAgent:${id}`,
          type: 'wasDeactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'salesAgent',
        id,
      });
    },

    reactivateSalesAgent: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const agent = await tools.read.standard('salesAgent', id);
      if (!agent) { throw new Error('agent not found'); }
      if (agent.status === 'active') { return agent; }
      const response = await tools.write({
        event: {
          key: `salesAgent:${id}`,
          type: 'wasReactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'salesAgent',
        id,
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
      return tools.read.aggregateFromDatabase({
        type: 'installer',
        id: installerId,
      });
    },

    editInstaller: async (_, { id, details }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const installer = await tools.read.standard('installer', id);
      if (!installer) { throw new Error('installer not found'); }

      const event = {
        key: `installer:${id}`,
        type: 'wasEdited',
        data: details,
      };

      const response = await tools.write({ event });
      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'installer',
        id,
      });
    },

    deactivateInstaller: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const installer = await tools.read.standard('installer', id);
      if (!installer) { throw new Error('installer not found'); }
      if (installer.status === 'deactivated') { return installer; }
      const response = await tools.write({
        event: {
          key: `installer:${id}`,
          type: 'wasDeactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'installer',
        id,
      });
    },

    reactivateInstaller: async (_, { id, memo }, { tools }) => {
      assert(tools.isUUID(id), 'target id is invalid');
      const installer = await tools.read.standard('installer', id);
      if (!installer) { throw new Error('installer not found'); }
      if (installer.status === 'active') { return installer; }
      const response = await tools.write({
        event: {
          key: `installer:${id}`,
          type: 'wasReactivated',
          data: { memo },
        },
      });

      assert(response === 'OK', 'write failed');
      return tools.read.aggregateFromDatabase({
        type: 'installer',
        id,
      });
    },
  },
};
