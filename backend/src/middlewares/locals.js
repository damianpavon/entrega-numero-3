'use strict';
const { monedaChilena } = require('../utils/formato');

// Variables disponibles en todas las vistas EJS.
function locals(req, res, next) {
  res.locals.usuario = req.session.usuario || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.monedaChilena = monedaChilena;
  res.locals.rutaActual = req.originalUrl;
  next();
}

module.exports = locals;
