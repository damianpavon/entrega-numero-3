'use strict';
const crypto = require('crypto');

// Protección CSRF con token por sesión (patrón "synchronizer token").
// El token viaja en un <meta> / campo oculto y en la cabecera X-CSRF-Token (AJAX).
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrf;

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const recibido = req.get('x-csrf-token') || (req.body && req.body._csrf) || '';
  const a = Buffer.from(String(recibido));
  const b = Buffer.from(req.session.csrf);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error('Token CSRF inválido');
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = csrf;
