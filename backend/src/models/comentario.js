'use strict';
const pool = require('../db/pool');

async function listar(restauranteId) {
  const { rows } = await pool.query(
    `SELECT id, usuario, comentario, creado FROM comentarios
      WHERE restaurantes_id = $1 ORDER BY creado DESC, id DESC LIMIT 100`,
    [restauranteId]
  );
  return rows;
}

async function crear({ restauranteId, usuarioId, usuario, comentario }) {
  const { rows } = await pool.query(
    `INSERT INTO comentarios (restaurantes_id, usuario_id, usuario, comentario)
     VALUES ($1, $2, $3, $4) RETURNING id, usuario, comentario, creado`,
    [restauranteId, usuarioId, usuario, comentario]
  );
  return rows[0];
}

module.exports = { listar, crear };
