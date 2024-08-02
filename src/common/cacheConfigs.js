const assert = require('assert').strict;

const configs = [
  {
    name: 'active_leads',
    conditionFn: x => [
      'initial',
      'pending-visit',
    ].includes(x.status),
    aggregateTypes: ['lead'],
  },
  {
    name: 'dropped_leads',
    conditionFn: x => [
      'rejected',
      'expired',
    ].includes(x.status),
    aggregateTypes: ['lead'],
  },
  {
    name: 'active_jobs',
    conditionFn: x => [
      'initial',
      'pending-proposal',
      'pending-installer-assignment',
      'pending-installation',
    ].includes(x.status),
    aggregateTypes: ['job'],
  },
  {
    name: 'dropped_jobs',
    conditionFn: x => [
      'expired',
      'rejected',
    ].includes(x.status),
    aggregateTypes: ['job'],
  },
  {
    name: 'completed_jobs',
    conditionFn: x => x.status === 'completed',
    aggregateTypes: ['job'],
  },
];

assert(configs.map(x => x.name)
  .map(x => typeof x === 'string')
  .every(x => x));

assert(configs.map(x => x.conditionFn)
  .map(x => typeof x === 'function')
  .every(x => x));

module.exports = configs;
