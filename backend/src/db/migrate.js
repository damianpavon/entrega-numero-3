'use strict';
// "Crea la base de datos": aplica schema.sql (idempotente) y, solo si
// SEED_DEMO=true y no hay restaurantes, carga los datos de demostración.
const fs = require('fs');
const path = require('path');
const pool = require('./pool');
const config = require('../config');

async function migrar() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const cliente = await pool.connect();
  try {
    // Lock consultivo: si arrancan varias instancias a la vez (Autoscaling),
    // solo una aplica el esquema y las demás esperan.
    await cliente.query('SELECT pg_advisory_lock(727272)');
    await cliente.query(schema);

    if (config.cargarDatosDemo) {
      const { rows } = await cliente.query('SELECT count(*)::int AS n FROM restaurantes');
      if (rows[0].n === 0) {
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        await cliente.query(seed);
        console.log('[db] datos de demostración cargados');
      }
    }
    console.log('[db] esquema al día');
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(727272)').catch(() => {});
    cliente.release();
  }
}

module.exports = { migrar };
