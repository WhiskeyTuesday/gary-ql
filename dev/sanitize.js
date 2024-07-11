const fs = require('fs');
const conf = require('./insomnia.json');

// eslint-disable-next-line no-underscore-dangle
const r = conf.resources.map(x => (x._type === 'environment' && !!x.data.token
  ? { ...x, data: { ...x.data, token: 'insertToken' } }
  : x));

const hasTokens = x => Object.keys(x.data)
  .some(k => k.toLowerCase().endsWith('token'));

const clear = data => Object.fromEntries(
  Object.entries(data).map(([k, v]) => [
    k,
    k.toLowerCase().endsWith('token') ? 'insertToken' : v,
  ]),
);

// eslint-disable-next-line no-underscore-dangle
const rr = conf.resources.map(x => (x._type === 'environment' && hasTokens(x)
  ? { ...x, data: clear(x.data) }
  : x));

const newConf = { ...conf, resources: rr };

fs.writeFileSync('insomnia.json', JSON.stringify(newConf, null, 2));
