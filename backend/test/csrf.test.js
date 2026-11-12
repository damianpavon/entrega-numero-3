'use strict';
const test = require('node:test');
const assert = require('node:assert');
const csrf = require('../src/middlewares/csrf');
const { crearReq, crearRes } = require('./ayudas');

test('GET deja pasar sin crear sesión nueva', () => {
  const req = crearReq({ method: 'GET' });
  let paso = false;
  csrf(req, crearRes(), () => { paso = true; });
  assert.ok(paso);
  assert.strictEqual(req.session.csrf, undefined);
});

test('POST sin token en la sesión es rechazado', () => {
  const req = crearReq({ method: 'POST', headers: { 'x-csrf-token': '' } });
  const res = crearRes();
  csrf(req, res, () => assert.fail('no debe pasar'));
  assert.strictEqual(res.code, 403);
});

test('POST sin token o con token incorrecto es rechazado con 403', () => {
  for (const headers of [{}, { 'x-csrf-token': 'incorrecto' }, { 'x-csrf-token': '' }]) {
    const req = crearReq({ method: 'POST', session: { csrf: 'a'.repeat(64) }, headers });
    const res = crearRes();
    let paso = false;
    csrf(req, res, () => { paso = true; });
    assert.ok(!paso);
    assert.strictEqual(res.code, 403);
    assert.ok(res.body.error);
  }
});

test('POST con el token correcto pasa', () => {
  const token = 'b'.repeat(64);
  const req = crearReq({ method: 'POST', session: { csrf: token }, headers: { 'x-csrf-token': token } });
  let paso = false;
  csrf(req, crearRes(), () => { paso = true; });
  assert.ok(paso);
});
