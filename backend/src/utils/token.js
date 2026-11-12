'use strict';
const crypto = require('crypto');

const nuevoToken = () => crypto.randomBytes(32).toString('hex');

/** Comparación en tiempo constante. */
function tokensIguales(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { nuevoToken, tokensIguales };
