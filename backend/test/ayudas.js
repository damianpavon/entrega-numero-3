'use strict';
// Utilidades de prueba: req/res simulados (no se necesita Express ni base de datos).
function crearRes() {
  const r = { code: 200, body: undefined, headers: {}, cleared: [] };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.set = (k, v) => { r.headers[k] = v; return r; };
  r.clearCookie = (n) => { r.cleared.push(n); return r; };
  return r;
}

function crearSesion(datos = {}) {
  const s = { ...datos };
  s.regenerate = (cb) => {
    for (const k of Object.keys(s)) if (typeof s[k] !== 'function') delete s[k];
    cb(null);
  };
  s.save = (cb) => cb(null);
  s.destroy = (cb) => cb(null);
  return s;
}

function crearReq({ params = {}, query = {}, body = {}, session = {}, headers = {}, method = 'GET' } = {}) {
  return { params, query, body, method, session: crearSesion(session), get: (h) => headers[h.toLowerCase()] };
}

module.exports = { crearRes, crearReq };
