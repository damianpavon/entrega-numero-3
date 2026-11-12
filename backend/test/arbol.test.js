'use strict';
const test = require('node:test');
const assert = require('node:assert');

// armarArbol es una función pura, pero vive en un modelo que importa "pg" (dependencia).
// Se carga con un "pg" falso para poder probarla sin instalar nada.
const Module = require('module');
const original = Module._load;
Module._load = function (request, ...resto) {
  if (request === 'pg') return { Pool: class { on() {} } };
  return original.call(this, request, ...resto);
};
const { armarArbol } = require('../src/models/carta');
Module._load = original;

const fila = (o) => ({ carta_id: 1, carta_nombre: 'Vinos', cat_id: null, cat_nombre: null, item_id: null, item_nombre: null, ...o });

test('armarArbol agrupa filas planas en cartas > categorías > ítems', () => {
  const arbol = armarArbol([
    fila({ cat_id: 1, cat_nombre: 'Blancos', item_id: 10, item_nombre: 'A', precio: 100 }),
    fila({ cat_id: 1, cat_nombre: 'Blancos', item_id: 11, item_nombre: 'B', precio: 200 }),
    fila({ cat_id: 2, cat_nombre: 'Tintos' }),
    fila({ carta_id: 2, carta_nombre: 'Postres' }),
  ]);
  assert.strictEqual(arbol.length, 2);
  assert.strictEqual(arbol[0].categorias.length, 2);
  assert.deepStrictEqual(arbol[0].categorias[0].items.map((i) => i.nombre), ['A', 'B']);
  assert.deepStrictEqual(arbol[0].categorias[1].items, []);
  assert.deepStrictEqual(arbol[1].categorias, []);
});
