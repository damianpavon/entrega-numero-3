'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { enteroPositivo, listaIds, textoComentario, emailValido } = require('../src/utils/validacion');

test('enteroPositivo acepta ids válidos y rechaza entradas maliciosas', () => {
  assert.strictEqual(enteroPositivo('5'), 5);
  assert.strictEqual(enteroPositivo(7), 7);
  for (const malo of ['1 OR 1=1', '1;DROP TABLE items', '<script>', '-1', '0', '', '1.5', '9999999999', null, undefined, {}, ['1'], NaN, 1.5]) {
    assert.strictEqual(enteroPositivo(malo), null, String(malo));
  }
});

test('listaIds parsea listas CSV, quita repetidos y rechaza basura', () => {
  assert.deepStrictEqual(listaIds('1,2,3'), [1, 2, 3]);
  assert.deepStrictEqual(listaIds('4,4,5'), [4, 5]);
  assert.deepStrictEqual(listaIds(''), []);
  assert.deepStrictEqual(listaIds(undefined), []);
  assert.strictEqual(listaIds('1,a'), null);
  assert.strictEqual(listaIds('1,2;DROP'), null);
  assert.strictEqual(listaIds(Array.from({ length: 51 }, (_, i) => i + 1).join(',')), null);
});

test('textoComentario recorta y limita a 1000 caracteres', () => {
  assert.strictEqual(textoComentario('  hola  '), 'hola');
  assert.strictEqual(textoComentario('   '), null);
  assert.strictEqual(textoComentario('x'.repeat(1001)), null);
  assert.strictEqual(textoComentario('x'.repeat(1000)).length, 1000);
  assert.strictEqual(textoComentario(42), null);
});

test('emailValido', () => {
  assert.ok(emailValido('demo@carta.cl'));
  for (const malo of ['', 'sin-arroba', 'a@b', 'a b@c.cl', null, 5, 'x'.repeat(300) + '@a.cl']) assert.ok(!emailValido(malo), String(malo));
});
