/* eslint-disable no-console */

const { v4: uuid } = require('uuid');
const films = require('../../in/films.json');

module.exports = async (databases, implementationConfig) => {
  const systemAgent = {
    type: 'systemAgent',
    id: '7815d6cf-1aef-4b81-a3a8-954f8487fbc5',
  };

  const cold = await (async () => {
    // check if we need cold start data
    const events = await databases.events.get('hot');
    const state = await databases.state.get('hot');
    return !events || !state;
  })();

  if (cold) { // if so, make it
    console.log('coldstart running');

    const events = [
      ...implementationConfig.superusers.flatMap((sub) => {
        const id = uuid();
        const token = {
          aud: implementationConfig.sstAudience,
          iss: implementationConfig.sstIssuer,
          sub,
        };
        return [
          {
            key: `superuser:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              token,
            },
          },
          {
            key: `superuser:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: { token },
          },
        ];
      }),
      ...films.map(({ name, price }) => {
        const id = uuid();
        return {
          key: `material:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: { id, name, price, unit: 'SQ_FT', currencyCode: 'USD' },
        };
      }),
      (() => {
        const id = uuid();
        return {
          key: `admin:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: {
            id,
            memo: 'created on cold start',
            firstName: 'Gary',
            lastName: 'Cooper',
            emailAddress: 'gtinting@gmail.com',
          },
        };
      })(),
      (() => {
        const id = uuid();
        return {
          key: `salesAgent:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: {
            id,
            memo: 'created on cold start',
            firstName: 'Ted',
            lastName: 'Riggs',
            emailAddress: 'tariggs67@gmail.com',
          },
        };
      })(),
      (() => {
        const id = uuid();
        return {
          key: `salesAgent:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: {
            id,
            memo: 'created on cold start',
            firstName: 'Jack',
            lastName: 'Lowe',
            emailAddress: 'jack-gwt@att.net',
          },
        };
      })(),
      (() => {
        const id = uuid();
        return {
          key: `installer:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: {
            id,
            memo: 'created on cold start',
            firstName: 'James',
            lastName: 'Brown',
            emailAddress: 'jbrown.gwt@att.net',
          },
        };
      })(),
      (() => {
        const id = uuid();
        return {
          key: `staff:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: {
            id,
            memo: 'created on cold start',
            firstName: 'Shiela',
            lastName: 'Bongio',
            emailAddress: 'shiela-gwt@att.net',
          },
        };
      })(),
    ];

    await databases.events.flushdb();
    await databases.state.flushdb();

    const eSetRes = await databases.events.set('hot', 'true');
    const sSetRes = await databases.state.set('hot', 'true');
    if (eSetRes !== 'OK' || sSetRes !== 'OK') {
      throw new Error('hot marker set failed');
    } else {
      return events;
    }
  } else {
    return [];
  }
};
