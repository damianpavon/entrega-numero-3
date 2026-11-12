'use strict';

/** Entero positivo desde string/número, o null si no es válido (evita inyecciones y NaN). */
function enteroPositivo(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0 && valor < 1e9) return valor;
  if (typeof valor !== 'string' || !/^\d{1,9}$/.test(valor)) return null;
  const n = parseInt(valor, 10);
  return n > 0 ? n : null;
}

/** "1,2,3" -> [1,2,3] (únicos, máx. `max`); null si algún elemento es inválido o la lista es muy larga. */
function listaIds(texto, max = 50) {
  if (typeof texto !== 'string' || texto === '') return [];
  const partes = texto.split(',');
  if (partes.length > max) return null;
  const ids = [];
  for (const p of partes) {
    const n = enteroPositivo(p.trim());
    if (n === null) return null;
    if (!ids.includes(n)) ids.push(n);
  }
  return ids;
}

/** Comentario válido (1 a 1000 caracteres tras recortar) o null. */
function textoComentario(valor) {
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  return t.length >= 1 && t.length <= 1000 ? t : null;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
function emailValido(valor) {
  return typeof valor === 'string' && valor.length <= 255 && EMAIL.test(valor.trim());
}

module.exports = { enteroPositivo, listaIds, textoComentario, emailValido };
