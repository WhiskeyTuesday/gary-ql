const { cacheUpdater: server } = process.env.LOCAL_LIB === 'true'
  ? require('../lib')
  : require('@gather-social/lib');

const config = require('./config');

server(config);
