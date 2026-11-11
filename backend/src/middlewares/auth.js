'use strict';

function requiereLogin(req, res, next) {
  if (req.session.usuario) return next();
  req.session.flash = { tipo: 'warning', texto: 'Debes iniciar sesión para comentar.' };
  return res.redirect(`/carta/${req.params.id}`);
}

module.exports = { requiereLogin };
