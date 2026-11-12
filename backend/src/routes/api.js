'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const Restaurante = require('../models/restaurante');
const Carta = require('../models/carta');
const Comentario = require('../models/comentario');
const Usuario = require('../models/usuario');

const crearRestaurantes = require('../controllers/restaurantes');
const crearComentarios = require('../controllers/comentarios');
const crearAuth = require('../controllers/auth');
const { requiereLogin } = require('../middlewares/autenticado');
const a = require('../utils/asincrono');

// Aquí (y solo aquí) se conectan los controladores con los modelos reales.
const restaurantes = crearRestaurantes({ Restaurante, Carta });
const comentarios = crearComentarios({ Restaurante, Comentario });
const auth = crearAuth({ Usuario, comparar: bcrypt.compare });

// Anti fuerza bruta: 10 intentos de login cada 15 minutos por IP.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

const router = express.Router();

router.get('/sesion', auth.sesion);
router.post('/login', limitadorLogin, a(auth.login));
router.post('/logout', auth.logout);

router.get('/restaurantes', a(restaurantes.listar));
router.get('/restaurantes/:id', a(restaurantes.detalle));
router.get('/restaurantes/:id/carta', a(restaurantes.carta));
router.get('/restaurantes/:id/items', a(restaurantes.items));

router.get('/restaurantes/:id/comentarios', a(comentarios.listar));
router.post('/restaurantes/:id/comentarios', requiereLogin, a(comentarios.crear));

module.exports = router;
