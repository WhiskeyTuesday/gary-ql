const jwt = require('jsonwebtoken');

module.exports = (token, secret) => {
  if (!secret || !token) { throw new Error(); }
  const now = Math.round(Date.now() / 1000);
  const newToken = {
    ...jwt.decode(token),
    iat: now,
    exp: now + 86400,
    isImpersonation: true,
  };

  console.log(jwt.sign(newToken, secret));
};
