module.exports = {
  user: {
    wasCreated: ({ safe, event }) => safe.write({
      bucket: 'unregisteredUsers',
      key: event.data.id,
      value: {
        id: event.key.split(':')[1],
        createdTime: event.timestamp,
        token: event.data.token,
      },
    }),

    registered: ({ safe, event, _ctx }) => {
      const key = event.key.split(':')[1];

      safe.write({
        key,
        bucket: 'contacts',
        value: [],
      });

      safe.delete({ bucket: 'unregisteredUsers', key });
    },
  },
};
