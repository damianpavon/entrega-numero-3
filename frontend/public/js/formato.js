// Funciones puras de formato (sin DOM): se prueban con "npm test".

/** 12500 -> "$ 12.500" (peso chileno). */
export function moneda(valor) {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n)) return '$ 0';
  return `${n < 0 ? '-' : ''}$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export const FOTO_COMODIN = '/img/logo_empresa_comodin.png';

/** Ruta de una foto: /imagenes/cod<restaurante>/<archivo>. Solo nombres de archivo simples. */
export function urlFoto(restauranteId, archivo) {
  const id = Number(restauranteId);
  if (!Number.isInteger(id) || id < 1 || typeof archivo !== 'string' || !/^[\w.-]{1,120}$/.test(archivo) || archivo.includes('..')) {
    return FOTO_COMODIN;
  }
  return `/imagenes/cod${id}/${archivo}`;
}

/** Teléfono apto para href="tel:" (deja solo dígitos y +). */
export function telefono(texto) {
  return String(texto || '').replace(/[^\d+]/g, '');
}

export function textoProductos(n) {
  return n === 1 ? '1 producto' : `${n} productos`;
}
