/* eslint-disable no-console */

const { v4: uuid } = require('uuid');

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
      ...[
        'AIR65GNSRHPR',
        'AIR75SRHPR',
        'AIR80BLSRHPR',
        'AU85 UV SR HPR (UV CL)',
        'Ceramic 35',
        'Ceramic 45',
        'Ceramic 55',
        'Ceramic 65',
        'Deco Color Frost Bronze',
        'Deco Color Frost Dusk',
        'Deco Color Frost Graphite',
        'Deco Color Frost Silver',
        'Deco Gradient Series (all)',
        'Deco Matte Frost Series (all)',
        'Deco Nature Series (all)',
        'Deco Pattern Series (all)',
        'Deco Specialty 100% Whiteout',
        'Deco Specialty Black',
        'Deco Specialty Blue',
        'Deco Specialty Green',
        'Deco Specialty Red',
        'Deco Specialty Temp Blackout',
        'Deco Specialty Temp Whiteout',
        'Deco Specialty White',
        'Deco Specialty White Light Diffuser',
        'Deco Specialty Yellow',
        'Deco Textile Series (all)',
        'Deco Textured Frost Series (all)',
        'DL-05GR SR CDF',
        'DL-15B SR CDF',
        'DL-15G SR CDF',
        'DL-30GN SR CDF',
        'DR-05 SR CDF',
        'DR-15 SR CDF',
        'DR15 SR PS5 and DR15 SR PS9',
        'DR25 SR PS5 and DR25 SR PS9',
        'DRN-25 SR CDF',
        'DRN-35 SR CDF',
        'E-1220 SR CDF',
        'GCLSRRPS4 and 6',
        'LR20SISRHPR',
        'LS60SRCDF',
        'LS65GNSRCDF',
        'LS75GNSRCDF',
        'N-1020 SR CDF',
        'N-1020 SR PS4 and PS8',
        'N-1020B SR CDF',
        'N-1035B SR CDF',
        'N-1040 SR CDF',
        'N-1040 SR PS4 and PS8',
        'N-1050 SR CDF',
        'N-1050 SR PS4 and PS8',
        'N-1050B SR CDF',
        'N-1065 SR CDF',
        'NUV-65 SR PS4',
        'NXA20ERHPR or NHE20ERHPR',
        'NXA35ERHPR or NHE35ERHPR',
        'R-15B SR CDF',
        'R-15BL SR PS',
        'R-15G SR CDF',
        'R-15GO SR PS',
        'R-20 SR CDF',
        'R-20 SR PS4 and PS8',
        'R-35 SR CDF',
        'R-50 SR CDF',
        'R20 SR PS5 and R20 SR PS9',
        'RN-07G SR PS/CDF',
        'RXA20ERHPR or RHE20ERHPR',
        'RXA35ERHPR or RHE35ERHPR',
        'RXA50ERHPR or RHE50ERHPR',
        'SCL SR PS4,7, 8, 13',
        'SXA and SHE Clear Safety Films',
        'TXA80ERHPR or THE80ERHPR',
        'V14 (Ultima)',
        'V18 (Celeste)',
        'V28 (Luminance)',
        'V31 (Harmony Terre)',
        'V33 (Soft Horizons)',
        'V33 BR (Sunrise)',
        'V38 (Mirage)',
        'V40 (Harmony Ciel)',
        'V41 (Harmony Terre)',
        'V45 (Dayview)',
        'V48 (Nuance)',
        'V50 (Harmony Ciel)',
        'V51 (Harmony Terre)',
        'V58 (Crystal Elegance)',
        'VE35 (Ambiance)',
        'VE50 (Radiance)',
        'VS20 SR CDF',
        'VS30 SR CDF',
        'VS50 SR CDF',
        'VS60SRCDF',
        'VS61SRCDF',
        'VS70SRCDF',
        'VS80BL SR CDF',
        'VXA14ERHPR',
      ].map((name) => {
        const id = uuid();
        return {
          key: `material:${id}`,
          type: 'wasCreated',
          metadata: { actor: systemAgent },
          data: { id, name, price: 100, unit: 'SQ_FT', currencyCode: 'USD' },
        };
      }),
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
