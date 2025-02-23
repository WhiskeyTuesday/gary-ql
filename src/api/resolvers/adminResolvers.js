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
  databases,
  details,
  tools,
  type,
  memo,
}) => {
  assert(
    databases
    && details
    && tools
    && type,
  );

  assert(databases.firebase, 'firebase not initialised');

  const { emailAddress } = details;
  assert(emailAddress, 'email address required');
  assert(typeof emailAddress === 'string', 'email address invalid');
  assert(emailAddress.includes('@'), 'email address invalid');
  assert(emailAddress.includes('.'), 'email address invalid');

  const exists = await checkIfEmailExists(databases.firebase, emailAddress);
  assert(!exists, 'email address already in use');

  const isTestEmail = emailAddress.endsWith('@test.com')
    || emailAddress.endsWith('@example.com');

  const { alreadyExists, password, uid } = isTestEmail
    ? { alreadyExists: false, password: 'fakePassword', uid: tools.uuidv4() }
    : await createFirebaseAccount(databases.firebase, emailAddress);

  const resetLink = isTestEmail
    ? 'fake link lol'
    : await databases.firebase.auth().generatePasswordResetLink(emailAddress);

  // NOTE: loops API already does nothing and returns { success: true }
  // if we provide a test domain email address so we don't have to
  // check for that/branch on it
  const loopsResponse = await tools.loops.sendTransactionalEmail({
    transactionalId: 'cm7cjkyer01gsz09s9eqv0jci',
    email: emailAddress,
    addToAudience: false,
    dataVariables: { link: resetLink },
  });

  if (loopsResponse.success !== true) {
    // eslint-disable-next-line no-console
    console.error('failed to send password reset email');
    // eslint-disable-next-line no-console
    console.error(loopsResponse);
  }

  const id = tools.uuidv4();

  const events = [
    {
      key: `${type}:${id}`,
      type: 'wasCreated',
      data: { memo, id, ...details },
    },
    {
      key: `${type}:${id}`,
      type: 'hadTokenAssociated',
      data: {
        token: { sub: uid, iss: tools.fbtIssuer, aud: tools.fbtAudience },
      },
    },
  ];

  const response = await tools.write({ events });
  assert(response === 'OK', 'write failed');

  const idResponse = await tools.writeFirebaseId({ uid, type, id });
  assert(idResponse === 'OK', 'write failed');

  const aggregate = await tools.read.aggregateFromDatabase({ type, id });

  return {
    [type]: aggregate,
    alreadyExists,
    password,
  };
};

const changeFirebaseEmail = async (firebase, uid, email) => {
  assert(firebase, 'firebase not initialised');

  assert(uid, 'uid required');
  assert(typeof uid === 'string', 'uid invalid');
  assert(email, 'email required');
  assert(typeof email === 'string', 'email invalid');
  assert(email.includes('@'), 'email invalid');
  assert(email.includes('.'), 'email invalid');

  try {
    const record = await firebase.auth().updateUser(uid, { email });
    assert(record, 'record not found');
    return { alreadyExists: false };
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      return { alreadyExists: true };
    }

    throw e;
  }
};

const editAgent = async ({
  databases,
  fbtIssuer,
  details,
  id,
  tools,
  type,
}) => {
  assert(
    databases
    && fbtIssuer
    && details
    && id
    && tools
    && type,
  );

  assert(databases.firebase, 'firebase not initialised');

  assert(tools.isUUID(id), 'target id is invalid');
  const agent = await tools.read.aggregateFromDatabase({ type, id });
  assert(agent, 'agent not found');

  const { emailAddress } = details;
  const existingEmail = agent.profile.emailAddress;

  const maybeValidEmail = (adr) => {
    assert(adr, 'email address required');
    assert(typeof adr === 'string', 'email address invalid');
    assert(adr.includes('@'), 'email address invalid');
    assert(adr.includes('.'), 'email address invalid');
  };

  maybeValidEmail(emailAddress);
  maybeValidEmail(existingEmail);

  const emailChanged = emailAddress && emailAddress !== existingEmail;

  // if the existing OR new email address is a test domain don't touch firebase
  const isTestEmail = emailAddress.endsWith('@test.com')
    || emailAddress.endsWith('@example.com')
    || existingEmail.endsWith('@test.com')
    || existingEmail.endsWith('@example.com');

  // what if there are multiple? should be fine
  const token = agent.tokens.find(t => t.iss === fbtIssuer);
  assert(token, 'token not found');
  const firebaseUid = token.sub;
  assert(firebaseUid, 'firebase uid not found');

  const emailChangedResponse = emailChanged && !isTestEmail
    ? await changeFirebaseEmail(databases.firebase, firebaseUid, emailAddress)
    : { alreadyExists: false };

  if (emailChanged && emailChangedResponse.alreadyExists) {
    throw new Error('email already in use');
  } else if (emailChanged && !emailChangedResponse) {
    throw new Error('email change failed. Details are in the server logs.');
  }

  const event = {
    key: `${type}:${id}`,
    type: 'wasEdited',
    data: details,
  };

  const response = await tools.write({ event });
  if (response !== 'OK') {
    // if write failed reverse firebase I guess?
    // but then if the reversal fails...
    // for now I'm just going to cowboy it
    // there's a console log to maybe hopefully help

    // eslint-disable-next-line no-console
    console.error(
      'agent edit event write failed',
      { event, response },
    );

    throw new Error('agent edit event write failed');
  }

  if (emailChanged && !emailChangedResponse.alreadyExists) {
    // update iddb
    const iddbResponse = await tools.writeFirebaseId(
      { uid: firebaseUid, type, id },
    );

    if (iddbResponse !== 'OK') {
      // if iddb fails should reverse... everything?
      // again just going to cowboy it for now
      // eslint-disable-next-line no-console
      console.error(
        'agent edit id write failed',
        { iddbResponse },
      );
    }
  }

  return tools.read.aggregateFromDatabase({ type, id });
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
      { tools, databases },
    ) => newAgent({
      type: 'admin',
      databases,
      details,
      tools,
      memo,
    }),

    editAdmin: async (
      _,
      { id, details },
      { tools, databases },
    ) => editAgent({
      fbtIssuer: tools.fbtIssuer,
      type: 'admin',
      databases,
      details,
      tools,
      id,
    }),

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

    reactivateAdmin: async (_, { id, memo }, { tools, actor }) => {
      if (!tools.isUUID(id)) { throw new Error('target id is invalid.'); }
      const admin = await tools.read.standard('admin', id);
      if (actor.id === id) { throw new Error('cannot reactivate self'); }
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
      { tools, databases },
    ) => newAgent({
      type: 'staff',
      databases,
      details,
      tools,
      memo,
    }),

    editStaff: async (
      _,
      { id, details },
      { tools, databases },
    ) => editAgent({
      fbtIssuer: tools.fbtIssuer,
      type: 'staff',
      databases,
      details,
      tools,
      id,
    }),

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
      { tools, databases },
    ) => newAgent({
      type: 'salesAgent',
      databases,
      details,
      tools,
      memo,
    }),

    editSalesAgent: async (
      _,
      { id, details },
      { tools, databases },
    ) => editAgent({
      fbtIssuer: tools.fbtIssuer,
      type: 'salesAgent',
      databases,
      details,
      tools,
      id,
    }),

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
      { tools, databases },
    ) => newAgent({
      type: 'installer',
      databases,
      details,
      tools,
      memo,
    }),

    editInstaller: async (
      _,
      { id, details },
      { tools, databases },
    ) => editAgent({
      fbtIssuer: tools.fbtIssuer,
      type: 'installer',
      databases,
      details,
      tools,
      id,
    }),

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
