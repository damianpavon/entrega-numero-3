'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { monedaChilena, enteroPositivo } = require('../src/utils/formato');

test('monedaChilena formatea con puntos de miles', () => {
  assert.strictEqual(monedaChilena(12500), '$ 12.500');
  assert.strictEqual(monedaChilena(3500), '$ 3.500');
  assert.strictEqual(monedaChilena(900), '$ 900');
  assert.strictEqual(monedaChilena(1234567), '$ 1.234.567');
  assert.strictEqual(monedaChilena(0), '$ 0');
  assert.strictEqual(monedaChilena(null), '$ 0');
});

test('enteroPositivo rechaza entradas maliciosas (SQLi/XSS) y acepta ids válidos', () => {
  assert.strictEqual(enteroPositivo('5'), 5);
  assert.strictEqual(enteroPositivo(7), 7);
  for (const malo of ["1 OR 1=1", "1;DROP TABLE items", "<script>", "-1", "0", "", "1.5", "9999999999", null, undefined, {}, ["1"]]) {
    assert.strictEqual(enteroPositivo(malo), null, String(malo));
  }
});
