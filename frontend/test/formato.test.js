import test from 'node:test';
import assert from 'node:assert';
import { moneda, urlFoto, telefono, textoProductos, FOTO_COMODIN } from '../public/js/formato.js';

test('moneda chilena', () => {
  assert.strictEqual(moneda(12500), '$ 12.500');
  assert.strictEqual(moneda(900), '$ 900');
  assert.strictEqual(moneda(1234567), '$ 1.234.567');
  assert.strictEqual(moneda(null), '$ 0');
  assert.strictEqual(moneda('abc'), '$ 0');
});

test('urlFoto solo acepta nombres de archivo simples', () => {
  assert.strictEqual(urlFoto(1, 'item5.jpg'), '/imagenes/cod1/item5.jpg');
  for (const malo of ['../../etc/passwd', 'a/b.jpg', 'x"onerror=1', '', null, undefined, '..', 'a b.jpg', 'javascript:1']) {
    assert.strictEqual(urlFoto(1, malo), FOTO_COMODIN, String(malo));
  }
  assert.strictEqual(urlFoto('x', 'a.jpg'), FOTO_COMODIN);
  assert.strictEqual(urlFoto(0, 'a.jpg'), FOTO_COMODIN);
});

test('telefono y textoProductos', () => {
  assert.strictEqual(telefono('+56 51 223-3455'), '+56512233455');
  assert.strictEqual(telefono('javascript:alert(1)'), '1');
  assert.strictEqual(textoProductos(1), '1 producto');
  assert.strictEqual(textoProductos(3), '3 productos');
});
