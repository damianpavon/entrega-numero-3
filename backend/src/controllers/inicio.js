'use strict';
const Restaurante = require('../models/restaurante');

async function inicio(req, res) {
  const restaurantes = await Restaurante.listar();
  res.render('inicio', { titulo: 'Carta Digital', restaurantes });
}

module.exports = { inicio };
