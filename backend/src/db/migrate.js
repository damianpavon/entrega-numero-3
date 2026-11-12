'use strict';
// "Crea la base de datos": aplica schema.sql (idempotente) y, solo con SEED_DEMO=true,
// carga los restaurantes de demostración y el usuario demo.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const config = require('../config');

async function migrar() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const cliente = await pool.connect();
  try {
    // Lock consultivo: si arrancan varias instancias a la vez (Auto Scaling),
    // solo una aplica el esquema y las demás esperan.
    await cliente.query('SELECT pg_advisory_lock(727272)');
    await cliente.query(schema);

    if (config.cargarDatosDemo) {
      const { rows } = await cliente.query('SELECT count(*)::int AS n FROM restaurantes');
      if (rows[0].n === 0) {
        await cliente.query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
        console.log('[db] datos de demostración cargados');
      }
      const demo = config.usuarioDemo;
      if (demo.password && !config.esProduccion) {
        const hash = await bcrypt.hash(demo.password, 10);
        await cliente.query(
          `INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, nombre = EXCLUDED.nombre, estado = TRUE`,
          [demo.nombre, demo.email, hash]
        );
        console.log(`[db] usuario demo listo: ${demo.email}`);
      }
    }
    console.log('[db] esquema al día');
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(727272)').catch(() => {});
    cliente.release();
  }
}

module.exports = { migrar };
