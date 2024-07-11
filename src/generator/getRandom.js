module.exports = async ({
  type,
  faker,
  cache,
  howMany = 0,
  excludingProperties = [],
}) => {
  const list = await cache.list(type);

  const hasExcludingProperty = user => (excludingProperties.flatMap(prop => (
    user[prop] ? prop : []))).length || false;

  const results = [];

  let tries = 0;
  while ((results.length < howMany) && tries < list.length) {
    tries += 1;
    const id = faker.helpers.arrayElement(list);
    // eslint-disable-next-line no-await-in-loop
    const maybe = await cache.entry(type, id);

    if (!excludingProperties.length || !hasExcludingProperty(maybe)) {
      if (!results.map(x => x.id).includes(maybe.id)) { results.push(maybe); }
    }
  }

  return results;
};
