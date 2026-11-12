'use strict';
const { emailValido } = require('../utils/validacion');
const { nuevoToken } = require('../utils/token');

// Hash bcrypt válido de una clave aleatoria: se compara contra él cuando el correo no existe,
// para que la respuesta tarde lo mismo y no se pueda averiguar qué correos están registrados.
const HASH_FALSO = '$2a$10$m3FeGOG.luPsDGEv/k3PAeGvrUF7UI67quu.fq/Ei9ZwGoCpv0Qpu';

module.exports = function crearControladorAuth({ Usuario, comparar }) {
  function sesion(req, res) {
    const u = req.session.usuario;
    if (!req.session.csrf) req.session.csrf = nuevoToken();
    res.json({ usuario: u ? { nombre: u.nombre } : null, csrfToken: req.session.csrf });
  }

  async function login(req, res, next) {
    const { email, password } = req.body || {};
    if (!emailValido(email) || typeof password !== 'string' || password.length < 1 || password.length > 200) {
      return res.status(400).json({ error: 'Ingresa un correo y una contraseña válidos.' });
    }

    const usuario = await Usuario.buscarPorEmail(email.trim());
    const valido = await comparar(password, usuario ? usuario.password_hash : HASH_FALSO);
    if (!usuario || !valido) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Sesión nueva tras autenticar (previene session fixation) con token CSRF nuevo.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.usuario = { id: usuario.id, nombre: usuario.nombre };
      req.session.csrf = nuevoToken();
      req.session.save((err2) => {
        if (err2) return next(err2);
        res.json({ usuario: { nombre: usuario.nombre }, csrfToken: req.session.csrf });
      });
    });
  }

  function logout(req, res, next) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('pnk.sid');
      res.json({ ok: true });
    });
  }

  return { sesion, login, logout };
};
