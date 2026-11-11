'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');

const inicio = require('../controllers/inicio');
const carta = require('../controllers/carta');
const carrito = require('../controllers/carrito');
const auth = require('../controllers/auth');
const comentario = require('../controllers/comentario');
const { requiereLogin } = require('../middlewares/auth');

const router = express.Router();

// Express 4 no captura errores de handlers async: este envoltorio los pasa al manejador de errores.
const a = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Anti fuerza bruta en el login: 10 intentos / 15 min por IP.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.session.flash = { tipo: 'danger', texto: 'Demasiados intentos. Espera unos minutos.' };
    res.redirect(auth.rutaSegura(req.body && req.body.volver));
  },
});

router.get('/', a(inicio.inicio));

router.get('/carta/:id', a(carta.ver));
router.get('/carta/:id/carrito', a(carrito.ver));
router.post('/carta/:id/carrito/agregar', a(carrito.agregar));
router.post('/carta/:id/carrito/eliminar', carrito.eliminar);
router.post('/carta/:id/carrito/vaciar', carrito.vaciar);
router.post('/carta/:id/comentarios', requiereLogin, a(comentario.crear));

router.post('/login', limitadorLogin, a(auth.login));
router.post('/logout', auth.logout);

module.exports = router;
