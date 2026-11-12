'use strict';
const { enteroPositivo, textoComentario } = require('../utils/validacion');

module.exports = function crearControladorComentarios({ Restaurante, Comentario }) {
  async function restauranteId(req, res) {
    const id = enteroPositivo(req.params.id);
    const r = id ? await Restaurante.buscarPorId(id) : null;
    if (!r) {
      res.status(404).json({ error: 'El restaurante no existe.' });
      return null;
    }
    return r.id;
  }

  async function listar(req, res) {
    const id = await restauranteId(req, res);
    if (!id) return;
    res.json(await Comentario.listar(id));
  }

  async function crear(req, res) {
    const id = await restauranteId(req, res);
    if (!id) return;
    const texto = textoComentario(req.body && req.body.comentario);
    if (!texto) return res.status(400).json({ error: 'El comentario debe tener entre 1 y 1000 caracteres.' });
    // El autor sale de la sesión, no del cuerpo de la petición (no se puede suplantar).
    const u = req.session.usuario;
    const creado = await Comentario.crear({ restauranteId: id, usuarioId: u.id, usuario: u.nombre, comentario: texto });
    res.status(201).json(creado);
  }

  return { listar, crear };
};
