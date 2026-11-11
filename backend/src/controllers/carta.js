'use strict';
const Restaurante = require('../models/restaurante');
const Carta = require('../models/carta');
const Comentario = require('../models/comentario');
const { enteroPositivo } = require('../utils/formato');

// CONTROLADOR: recibe la petición, valida, pide datos al MODELO y elige la VISTA.
async function ver(req, res) {
  const id = enteroPositivo(req.params.id);
  const restaurante = id && (await Restaurante.buscarPorId(id));
  if (!restaurante) {
    return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La carta que buscas no existe.' });
  }

  const [destacados, cartas, comentarios] = await Promise.all([
    Carta.destacados(id),
    Carta.cartasConCategorias(id),
    Comentario.listar(id),
  ]);

  res.render('carta', {
    titulo: restaurante.nombre,
    restaurante, destacados, cartas, comentarios,
    cantidadCarrito: (req.session.carrito?.[id] || []).length,
  });
}

module.exports = { ver };
