import test from 'node:test';
import assert from 'node:assert';
import { crearStore } from '../public/js/store.js';

function almacenFalso(inicial = null) {
  const d = new Map(inicial === null ? [] : [['pnk.pedido.v1', inicial]]);
  return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, v), _d: d };
}

test('agregar, contar y quitar líneas por restaurante', () => {
  const s = crearStore(almacenFalso());
  assert.strictEqual(s.cantidad(1), 0);
  assert.deepStrictEqual(s.agregar(1, 5), { ok: true, cantidad: 1 });
  s.agregar(1, 5);
  s.agregar(2, 9);
  assert.strictEqual(s.cantidad(1), 2);
  assert.strictEqual(s.cantidad(2), 1);
  const [primera] = s.leer(1);
  s.quitar(1, primera.uid);
  assert.strictEqual(s.cantidad(1), 1);
  s.vaciar(1);
  assert.strictEqual(s.cantidad(1), 0);
  assert.strictEqual(s.cantidad(2), 1);
});

test('los uid no se repiten tras quitar', () => {
  const s = crearStore(almacenFalso());
  s.agregar(1, 5); s.agregar(1, 6);
  s.quitar(1, 1);
  s.agregar(1, 7);
  const uids = s.leer(1).map((l) => l.uid);
  assert.strictEqual(new Set(uids).size, uids.length);
});

test('límite de 50 líneas', () => {
  const s = crearStore(almacenFalso());
  for (let i = 0; i < 50; i++) assert.ok(s.agregar(1, 1).ok);
  assert.deepStrictEqual(s.agregar(1, 1), { ok: false, cantidad: 50 });
});

test('datos corruptos o manipulados en localStorage se descartan', () => {
  for (const basura of ['no es json', '[1,2]', '{"1":"x"}', '{"abc":[{"uid":1,"itemId":2}]}', '{"1":[{"uid":"1","itemId":2},{"uid":-1,"itemId":2},{"uid":1,"itemId":"<script>"},null]}']) {
    const s = crearStore(almacenFalso(basura));
    assert.strictEqual(s.cantidad(1), 0, basura);
  }
  const bueno = crearStore(almacenFalso('{"1":[{"uid":1,"itemId":5,"precio":1}]}'));
  assert.deepStrictEqual(bueno.leer(1), [{ uid: 1, itemId: 5 }]); // se ignoran campos extra (p. ej. "precio")
});

test('funciona aunque localStorage falle (queda en memoria)', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  const s = crearStore(roto);
  s.agregar(1, 5);
  assert.strictEqual(s.cantidad(1), 1);
});

test('quitarProductos elimina los ids que ya no existen', () => {
  const s = crearStore(almacenFalso());
  s.agregar(1, 5); s.agregar(1, 6); s.agregar(1, 5);
  s.quitarProductos(1, [5]);
  assert.deepStrictEqual(s.leer(1).map((l) => l.itemId), [6]);
});
