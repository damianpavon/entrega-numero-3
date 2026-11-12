'use strict';
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const config = require('./config');
const pool = require('./db/pool');
const api = require('./routes/api');
const csrf = require('./middlewares/csrf');
const { noEncontrado, manejador } = require('./middlewares/errores');

const app = express();

app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// El backend solo responde JSON: CSP mínima + cabeceras de helmet.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  })
);

// Liveness (Load Balancer): no toca la BD, así una caída de la BD no reemplaza las instancias.
app.get('/api/live', (req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));

// Health check (Docker / diagnóstico, comprueba la BD). Va ANTES de la sesión: no crea cookies.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.set('Cache-Control', 'no-store').json({ status: 'ok', env: config.env });
  } catch (e) {
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '10kb' }));

// Sesión en PostgreSQL: compartida por todas las instancias detrás del Load Balancer.
app.use(
  session({
    store: new PgSession({ pool, tableName: 'sesiones', createTableIfMissing: false }),
    name: config.sesion.nombreCookie,
    secret: config.sesion.secreto,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.sesion.cookieSegura, maxAge: config.sesion.duracionMs },
  })
);

app.use('/api', csrf, api);
app.use(noEncontrado);
app.use(manejador);

module.exports = app;
