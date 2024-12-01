const assert = require('assert').strict;
const crypto = require('crypto');

const checkIfEmailExists = async (firebase, email) => {
  try {
    const record = await firebase.auth().getUserByEmail(email);
    assert(record, 'record not found');
    return true;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return false;
    }
    throw e;
  }
};

const createFirebaseAccount = async (firebase, email) => {
  const password = crypto.randomBytes(8).toString('hex');

  try {
    const record = await firebase.auth().createUser({
      email,
      password,
    });

    assert(record, 'record not found');

    // console.log(record.toJSON());

    return {
      password,
      alreadyExists: false,
      uid: record.uid,
    };
  } catch (error) {
    switch (error.code) {
      case 'auth/email-already-exists':
        return {
          password: null,
          alreadyExists: true,
        };

      default: throw error;
    }
  }
};

const newAgent = async ({
  implementationConfig,
  databases,
  details,
  tools,
  type,
  memo,
}) => {
  assert({
    implementationConfig,
    databases,
    details,
    tools,
    type,
    memo,
  });

  const exists = await checkIfEmailExists(
    databases.firebase,
    details.emailAddress,
  );

  assert(!exists, 'email address already in use');

  const { alreadyExists, password, uid } = await createFirebaseAccount(
    databases.firebase,
    details.emailAddress,
  );

  const id = tools.uuidv4();

  const event = {
    key: `{type}:${id}`,
    type: 'wasCreated',
    data: { memo, id, ...details },
  };

  const response = await tools.write({ event });
  assert(response === 'OK', 'write failed');

  const { fbtAudience: aud, fbtIssuer: iss } = implementationConfig;
  const idResponse = await tools.writeId({
    token: { sub: uid, aud, iss },
    type,
    id,
  });

  assert(idResponse === 'OK', 'write failed');

  const record = await tools.read.aggregateFromDatabase({ type, id });

  return {
    [type]: record,
    alreadyExists,
    password,
  };
};

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
      return tools.read.aggregateFromDatabase({
        type: 'material',
        id,
      });
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

    createAdmin: async (
      _,
      { memo, details },
      { tools, databases, implementationConfig },
    ) => newAgent({
      type: 'admin',
      implementationConfig,
      databases,
      details,
      tools,
      memo,
    }),

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

    createStaff: async (
      _,
      { memo, details },
      { tools, databases, implementationConfig },
    ) => newAgent({
      type: 'staff',
      implementationConfig,
      databases,
      details,
      tools,
      memo,
    }),

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

    createSalesAgent: async (
      _,
      { memo, details },
      { tools, databases, implementationConfig },
    ) => newAgent({
      type: 'salesAgent',
      implementationConfig,
      databases,
      details,
      tools,
      memo,
    }),

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

    createInstaller: async (
      _,
      { memo, details },
      { tools, databases, implementationConfig },
    ) => newAgent({
      type: 'installer',
      implementationConfig,
      databases,
      details,
      tools,
      memo,
    }),

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
