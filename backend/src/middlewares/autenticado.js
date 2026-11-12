'use strict';

function requiereLogin(req, res, next) {
  if (req.session && req.session.usuario) return next();
  res.status(401).json({ error: 'Inicia sesión para continuar.' });
}

module.exports = { requiereLogin };
