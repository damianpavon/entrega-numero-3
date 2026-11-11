'use strict';
const pool = require('../db/pool');

// MODELO: acceso a datos. Todas las consultas son parametrizadas ($1, $2...),
// nunca se concatenan valores del usuario en el SQL (evita SQL Injection).

async function listar() {
  const { rows } = await pool.query(
    `SELECT id, nombre FROM restaurantes WHERE eliminado IS NULL ORDER BY nombre`
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT r.id, r.nombre, r.fono, r.email, r.foto,
            d.calle, d.numero, d.comuna, d.region
       FROM restaurantes r
       JOIN direcciones d ON d.id = r.direcciones_id
      WHERE r.id = $1 AND r.eliminado IS NULL`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { listar, buscarPorId };
