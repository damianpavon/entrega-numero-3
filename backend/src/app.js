'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const config = require('./config');
const pool = require('./db/pool');
const routes = require('./routes');
const csrf = require('./middlewares/csrf');
const locals = require('./middlewares/locals');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', config.trustProxy); // Cloudflare + ALB delante de la app
app.disable('x-powered-by');

// ---- Cabeceras de seguridad (OWASP) ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],                      // sin scripts inline => mitiga XSS
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.sesion.cookieSegura ? [] : null,
      },
    },
  })
);

// ---- Health check (ALB / Docker). Va ANTES de la sesión: no crea cookies ni toca la BD de sesiones. ----
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', env: config.env });
  } catch (e) {
    res.status(503).json({ status: 'error' });
  }
});

// ---- Parseo de cuerpos (con límite de tamaño) ----
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ---- Sesión en PostgreSQL (compartida entre instancias) ----
app.use(
  session({
    store: new PgSession({ pool, tableName: 'sesiones', createTableIfMissing: false }),
    name: config.sesion.nombreCookie,
    secret: config.sesion.secreto,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.sesion.cookieSegura,
      maxAge: config.sesion.duracionMs,
    },
  })
);

app.use(csrf);
app.use(locals);
app.use(routes);

// ---- 404 y manejador de errores (sin filtrar detalles internos) ----
app.use((req, res) => {
  res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La página que buscas no existe.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  const mensaje = status === 403 ? 'Solicitud no autorizada. Recarga la página e inténtalo de nuevo.' : 'Ocurrió un error inesperado.';
  if (req.accepts(['html', 'json']) === 'json' || req.xhr || req.is('json')) {
    return res.status(status).json({ ok: false, error: mensaje });
  }
  res.status(status).render('error', { titulo: 'Error', mensaje, csrfToken: res.locals.csrfToken || '', usuario: null, flash: null, monedaChilena: () => '' });
});

module.exports = app;
