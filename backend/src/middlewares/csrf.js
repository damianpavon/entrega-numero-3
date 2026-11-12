'use strict';
const { tokensIguales } = require('../utils/token');

// Protección CSRF (synchronizer token). El token se entrega en GET /api/sesion y el
// frontend lo reenvía en la cabecera X-CSRF-Token en cada petición que modifica datos.
function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session.csrf || !tokensIguales(req.get('x-csrf-token'), req.session.csrf)) {
    return res.status(403).json({ error: 'Token de seguridad inválido. Recarga la página.' });
  }
  next();
}

module.exports = csrf;
