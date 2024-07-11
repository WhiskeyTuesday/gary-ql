const tt = require('../../lib/src/common/makeTokenTools')
const mt = tt('JWTSECRETLMFAO').mintToken;

console.log(mt({
  type: 'superuser',
  now: Math.floor(Date.now() / 1000), // you shouldn't need to change this
  duration: 86400 * 365, // duration is ignored unless NODE_ENV is production
  iss: 'gwt', // must be equivalent to sstIssuer in config.js
  aud: 'gwt', // must be equivalent to sstAudience in config.js
  sub: 'ers', // list of allowed values is in config.js/superusers
}));
