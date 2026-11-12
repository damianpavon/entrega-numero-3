'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crearRestaurantes = require('../src/controllers/restaurantes');
const crearComentarios = require('../src/controllers/comentarios');
const crearAuth = require('../src/controllers/auth');
const { crearReq, crearRes } = require('./ayudas');

const resto = { id: 1, nombre: 'Afríca', fono: '223', email: 'a@b.cl', foto: 'r.jpg', calle: 'Argentina', numero: '951', comuna: 'La Serena', region: 'Coquimbo' };
const Restaurante = {
  listar: async () => [{ id: 1, nombre: 'Afríca', comuna: 'La Serena' }],
  buscarPorId: async (id) => (id === 1 ? resto : null),
};

test('detalle devuelve el restaurante con su dirección anidada', async () => {
  const c = crearRestaurantes({ Restaurante, Carta: {} });
  const res = crearRes();
  await c.detalle(crearReq({ params: { id: '1' } }), res);
  assert.strictEqual(res.code, 200);
  assert.deepStrictEqual(res.body.direccion, { calle: 'Argentina', numero: '951', comuna: 'La Serena', region: 'Coquimbo' });
  assert.strictEqual(res.body.nombre, 'Afríca');
});

test('ids inválidos o inexistentes responden 404 sin consultar más datos', async () => {
  const c = crearRestaurantes({ Restaurante, Carta: {} });
  for (const id of ['99', 'abc', '1 OR 1=1', '-3']) {
    const res = crearRes();
    await c.detalle(crearReq({ params: { id } }), res);
    assert.strictEqual(res.code, 404, id);
  }
});

test('carta combina destacados y cartas', async () => {
  const Carta = { destacados: async () => [{ id: 5 }], cartasConCategorias: async () => [{ id: 1, nombre: 'Vinos', categorias: [] }] };
  const res = crearRes();
  await crearRestaurantes({ Restaurante, Carta }).carta(crearReq({ params: { id: '1' } }), res);
  assert.deepStrictEqual(Object.keys(res.body), ['destacados', 'cartas']);
  assert.strictEqual(res.body.cartas[0].nombre, 'Vinos');
});

test('items: valida la lista de ids y entrega precios desde el modelo', async () => {
  let recibido;
  const Carta = { itemsDisponibles: async (rid, ids) => { recibido = { rid, ids }; return [{ id: 5, nombre: 'Lomo', precio: 12500 }]; } };
  const c = crearRestaurantes({ Restaurante, Carta });

  let res = crearRes();
  await c.items(crearReq({ params: { id: '1' }, query: { ids: '5,7' } }), res);
  assert.deepStrictEqual(recibido, { rid: 1, ids: [5, 7] });
  assert.strictEqual(res.body.items[0].precio, 12500);

  res = crearRes();
  await c.items(crearReq({ params: { id: '1' }, query: { ids: '5,x' } }), res);
  assert.strictEqual(res.code, 400);
});

test('comentarios: el autor sale de la sesión, no del cuerpo', async () => {
  let guardado;
  const Comentario = { crear: async (d) => { guardado = d; return { id: 1, usuario: d.usuario, comentario: d.comentario, creado: 'ahora' }; }, listar: async () => [] };
  const c = crearComentarios({ Restaurante, Comentario });
  const res = crearRes();
  await c.crear(crearReq({
    method: 'POST', params: { id: '1' },
    body: { comentario: '  Muy rico  ', usuario: 'Suplantado' },
    session: { usuario: { id: 9, nombre: 'Ana' } },
  }), res);
  assert.strictEqual(res.code, 201);
  assert.strictEqual(guardado.usuario, 'Ana');
  assert.strictEqual(guardado.usuarioId, 9);
  assert.strictEqual(guardado.comentario, 'Muy rico');
});

test('comentarios: texto vacío o demasiado largo responde 400', async () => {
  const c = crearComentarios({ Restaurante, Comentario: { crear: async () => { throw new Error('no debería guardar'); } } });
  for (const comentario of ['', '   ', 'x'.repeat(1001), undefined, 123]) {
    const res = crearRes();
    await c.crear(crearReq({ method: 'POST', params: { id: '1' }, body: { comentario }, session: { usuario: { id: 1, nombre: 'A' } } }), res);
    assert.strictEqual(res.code, 400, String(comentario));
  }
});

const usuarioBD = { id: 3, nombre: 'Ana', email: 'ana@x.cl', password_hash: 'hash-ana' };
const Usuario = { buscarPorEmail: async (e) => (e === 'ana@x.cl' ? usuarioBD : null) };
const comparar = async (pass, hash) => hash === 'hash-ana' && pass === 'ClaveCorrecta#1';

test('login correcto: regenera la sesión y entrega un token CSRF nuevo', async () => {
  const c = crearAuth({ Usuario, comparar });
  const req = crearReq({ method: 'POST', body: { email: 'ana@x.cl', password: 'ClaveCorrecta#1' }, session: { csrf: 'viejo' } });
  const res = crearRes();
  await c.login(req, res, (e) => { throw e; });
  assert.strictEqual(res.code, 200);
  assert.deepStrictEqual(res.body.usuario, { nombre: 'Ana' });
  assert.notStrictEqual(res.body.csrfToken, 'viejo');
  assert.match(res.body.csrfToken, /^[0-9a-f]{64}$/);
  assert.deepStrictEqual(req.session.usuario, { id: 3, nombre: 'Ana' });
  assert.ok(!('password_hash' in res.body.usuario));
});

test('login incorrecto: mismo mensaje 401 para clave errada y correo inexistente', async () => {
  const c = crearAuth({ Usuario, comparar });
  const mensajes = [];
  for (const body of [{ email: 'ana@x.cl', password: 'mala' }, { email: 'nadie@x.cl', password: 'ClaveCorrecta#1' }]) {
    const req = crearReq({ method: 'POST', body });
    const res = crearRes();
    await c.login(req, res, (e) => { throw e; });
    assert.strictEqual(res.code, 401);
    assert.ok(!req.session.usuario);
    mensajes.push(res.body.error);
  }
  assert.strictEqual(mensajes[0], mensajes[1]);
});

test('login con datos mal formados responde 400', async () => {
  const c = crearAuth({ Usuario, comparar });
  for (const body of [{}, { email: 'no-es-correo', password: 'x' }, { email: 'ana@x.cl' }, { email: 'ana@x.cl', password: 'x'.repeat(201) }, { email: { $ne: 1 }, password: 'x' }]) {
    const res = crearRes();
    await c.login(crearReq({ method: 'POST', body }), res, (e) => { throw e; });
    assert.strictEqual(res.code, 400);
  }
});

test('sesion y logout', async () => {
  const c = crearAuth({ Usuario, comparar });
  let res = crearRes();
  c.sesion(crearReq({ session: { csrf: 't' } }), res);
  assert.deepStrictEqual(res.body, { usuario: null, csrfToken: 't' });

  const sinToken = crearReq({ session: {} });
  res = crearRes();
  c.sesion(sinToken, res);
  assert.match(res.body.csrfToken, /^[0-9a-f]{64}$/);
  assert.strictEqual(sinToken.session.csrf, res.body.csrfToken);

  res = crearRes();
  c.sesion(crearReq({ session: { csrf: 't', usuario: { id: 3, nombre: 'Ana' } } }), res);
  assert.deepStrictEqual(res.body.usuario, { nombre: 'Ana' });

  res = crearRes();
  c.logout(crearReq({ method: 'POST', session: { usuario: { id: 3, nombre: 'Ana' } } }), res, (e) => { throw e; });
  assert.deepStrictEqual(res.cleared, ['pnk.sid']);
  assert.deepStrictEqual(res.body, { ok: true });
});
