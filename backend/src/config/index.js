'use strict';
// Configuración central. TODO viene de variables de entorno (12-factor):
// el mismo código corre en dev, QA y producción; solo cambia el .env.
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const bool = (v, def = false) => (v === undefined || v === '' ? def : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

const config = {
  env,
  esProduccion: env === 'production',
  puerto: parseInt(process.env.PORT || '3000', 10),

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'carta_digital',
    user: process.env.DB_USER || 'carta',
    password: process.env.DB_PASSWORD || '',
    // RDS (PostgreSQL 15+) exige SSL. DB_SSL=true lo activa.
    ssl: bool(process.env.DB_SSL) ? { rejectUnauthorized: bool(process.env.DB_SSL_VERIFY) } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  sesion: {
    secreto: process.env.SESSION_SECRET || '',
    nombreCookie: 'pnk.sid',
    duracionMs: 1000 * 60 * 60 * 8, // 8 horas
    // true cuando el usuario llega por HTTPS (Cloudflare/ALB). En http local debe ser false.
    cookieSegura: bool(process.env.COOKIE_SECURE, env === 'production'),
  },

  // Cantidad de proxies delante de la app (Cloudflare + ALB = 2 en AWS).
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),

  ejecutarMigraciones: bool(process.env.RUN_MIGRATIONS, true),
  cargarDatosDemo: bool(process.env.SEED_DEMO, false),
};

// Falla rápido si la configuración es insegura en producción / QA.
if (env !== 'development' && env !== 'test') {
  if (!config.sesion.secreto || config.sesion.secreto.length < 32) {
    throw new Error('SESSION_SECRET debe definirse con al menos 32 caracteres fuera de desarrollo.');
  }
}
if (!config.sesion.secreto) {
  config.sesion.secreto = 'solo-para-desarrollo-local-no-usar-en-qa-ni-prod';
}

module.exports = config;
