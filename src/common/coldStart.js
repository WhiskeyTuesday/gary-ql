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
      ...(() => {
        const id = uuid();
        return [
          {
            key: `admin:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Gary',
              lastName: 'Cooper',
              emailAddress: 'gtinting@gmail.com',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `admin:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'bnf4o5JqI1dzZcwq3tPkJ5cGZto1',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `admin:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Elija',
              lastName: 'Sorensen',
              emailAddress: '1@test.com',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `admin:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'Er587AJ69yVvXlcQeMZqIEaTZ2Y2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `admin:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Butch',
              lastName: 'Ewing',
              emailAddress: 'butch+test@bruceandeddy.com',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `admin:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'XJ6RKGrWEHTqFC61oJvMHa4kj9J2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `salesAgent:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Ted',
              lastName: 'Riggs',
              emailAddress: 'tariggs67@gmail.com',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `salesAgent:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'eDVQKOVM7qRXoelhldMNsgg4I4b2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `salesAgent:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Jack',
              lastName: 'Lowe',
              emailAddress: 'jack-gwt@att.net',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `salesAgent:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'driQykM9GRTDVJi3dAJgbF4nFtj2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `installer:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'James',
              lastName: 'Brown',
              emailAddress: 'jbrown.gwt@att.net',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `installer:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'pnfatDxF5fbuT6Ym324RECrpmrj2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
      })(),
      ...(() => {
        const id = uuid();
        return [
          {
            key: `staff:${id}`,
            type: 'wasCreated',
            metadata: { actor: systemAgent },
            data: {
              id,
              memo: 'created on cold start',
              firstName: 'Shiela',
              lastName: 'Bongio',
              emailAddress: 'shiela-gwt@att.net',
              phoneNumber: '+15555555555',
            },
          },
          {
            key: `staff:${id}`,
            type: 'hadTokenAssociated',
            metadata: { actor: systemAgent },
            data: {
              token: {
                sub: 'Ocf6qWpgGxeco6zabNb6CdYi84n2',
                aud: implementationConfig.fbtAudience,
                iss: implementationConfig.fbtIssuer,
              },
            },
          },
        ];
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
