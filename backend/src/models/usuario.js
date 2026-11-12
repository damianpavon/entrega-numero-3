'use strict';
const pool = require('../db/pool');

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, nombre, email, password_hash FROM usuarios WHERE lower(email) = lower($1) AND estado`,
    [email]
  );
  return rows[0] || null;
}

async function crear({ nombre, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, estado = TRUE
     RETURNING id, nombre, email`,
    [nombre, email, passwordHash]
  );
  return rows[0];
}

module.exports = { buscarPorEmail, crear };
