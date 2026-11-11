'use strict';

/** 12500 -> "$ 12.500" (formato moneda chilena, igual que el sitio original). */
function monedaChilena(numero) {
  const n = Math.trunc(Number(numero));
  if (!Number.isFinite(n)) return '$ 0';
  const signo = n < 0 ? '-' : '';
  return `${signo}$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** Convierte un parámetro de URL en entero positivo, o null si no es válido. */
function enteroPositivo(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor;
  if (typeof valor !== 'string' || !/^\d{1,9}$/.test(valor)) return null;
  const n = parseInt(valor, 10);
  return n > 0 ? n : null;
}

module.exports = { monedaChilena, enteroPositivo };
