'use strict';
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');

// Hash falso para igualar el tiempo de respuesta cuando el correo no existe
// (evita enumerar usuarios midiendo tiempos).
const HASH_FALSO = '$2a$10$m3FeGOG.luPsDGEv/k3PAeGvrUF7UI67quu.fq/Ei9ZwGoCpv0Qpu';

// Solo se permiten redirecciones internas (evita "open redirect").
function rutaSegura(ruta) {
  return typeof ruta === 'string' && /^\/(?!\/)[\w\-./?=&%]*$/.test(ruta) ? ruta : '/';
}

async function login(req, res, next) {
  const email = String(req.body.email || '').trim().slice(0, 255);
  const password = String(req.body.password || '').slice(0, 200);
  const volver = rutaSegura(req.body.volver);

  const usuario = email ? await Usuario.buscarPorEmail(email) : null;
  const valido = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO);

  if (!usuario || !valido) {
    req.session.flash = { tipo: 'danger', texto: 'Usuario o contraseña incorrectos.' };
    return res.redirect(volver);
  }

  // Nueva sesión tras autenticar (previene session fixation); se conserva el carrito.
  const { carrito, contadorLineas } = req.session;
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuario = { id: usuario.id, nombre: usuario.nombre };
    req.session.carrito = carrito;
    req.session.contadorLineas = contadorLineas;
    req.session.save(() => res.redirect(volver));
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('pnk.sid');
    res.redirect(rutaSegura(req.body.volver));
  });
}

module.exports = { login, logout, rutaSegura };
