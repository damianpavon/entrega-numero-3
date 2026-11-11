'use strict';
const Restaurante = require('../models/restaurante');
const Comentario = require('../models/comentario');
const { enteroPositivo } = require('../utils/formato');

async function crear(req, res) {
  const id = enteroPositivo(req.params.id);
  const restaurante = id && (await Restaurante.buscarPorId(id));
  if (!restaurante) {
    return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La carta que buscas no existe.' });
  }

  const texto = String(req.body.comentario || '').trim();
  if (texto.length < 1 || texto.length > 1000) {
    req.session.flash = { tipo: 'warning', texto: 'El comentario debe tener entre 1 y 1000 caracteres.' };
    return res.redirect(`/carta/${id}#comentarios`);
  }

  // El autor sale de la sesión, no del formulario (el original permitía suplantar el nombre).
  const u = req.session.usuario;
  await Comentario.crear({ restauranteId: id, usuarioId: u.id, usuario: u.nombre, comentario: texto });
  req.session.flash = { tipo: 'success', texto: 'Comentario publicado.' };
  res.redirect(`/carta/${id}#comentarios`);
}

module.exports = { crear };
