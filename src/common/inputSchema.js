const Joi = require('joi');

module.exports = {
  profile: Joi.object().keys({
    id: Joi.string().uuid({ version: 'uuidv4' }),
    firstName: Joi.string().max(20).required(),
    lastName: Joi.string().max(20).required(),
  }).required(),

  geohash: Joi.string().min(8).max(12).pattern(/^[^ailo]+$/, 'valid')
    .required(),
};
