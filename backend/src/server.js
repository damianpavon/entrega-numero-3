'use strict';
const config = require('./config');
const app = require('./app');
const pool = require('./db/pool');
const { migrar } = require('./db/migrate');

async function iniciar() {
  if (config.ejecutarMigraciones) await migrar();

  const servidor = app.listen(config.puerto, () => {
    console.log(`[api] Carta Digital escuchando en :${config.puerto} (${config.env})`);
  });

  // Cierre ordenado: Docker y el Auto Scaling envían SIGTERM al apagar el contenedor.
  const cerrar = (senal) => {
    console.log(`[api] ${senal} recibido, cerrando...`);
    servidor.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

iniciar().catch((err) => {
  console.error('[api] no se pudo iniciar:', err);
  process.exit(1);
});
