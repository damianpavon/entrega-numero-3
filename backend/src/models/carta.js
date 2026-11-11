'use strict';
const pool = require('../db/pool');

/** Ítems destacados (carrusel superior) de un restaurante. */
async function destacados(restauranteId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.nombre, i.descripcion, i.observaciones, i.tiempo,
            i.puntuacion, i.precio, i.foto
       FROM items i
       JOIN categorias k ON k.id = i.categorias_id
       JOIN cartas c     ON c.id = k.cartas_id
      WHERE i.destacado AND i.visible AND i.eliminado IS NULL
        AND k.visible AND k.eliminado IS NULL
        AND c.eliminada IS NULL
        AND c.restaurantes_id = $1
      ORDER BY i.orden NULLS LAST, i.id`,
    [restauranteId]
  );
  return rows;
}

/**
 * Carta completa en UNA consulta (cartas -> categorías -> ítems) y se arma
 * el árbol en memoria. Evita el patrón N+1 del PHP original (una consulta
 * por carta, por categoría...).
 */
async function cartasConCategorias(restauranteId) {
  const { rows } = await pool.query(
    `SELECT c.id AS carta_id, c.nombre AS carta_nombre,
            k.id AS cat_id,   k.nombre AS cat_nombre,
            i.id AS item_id, i.nombre AS item_nombre, i.descripcion, i.observaciones,
            i.tiempo, i.puntuacion, i.precio, i.foto
       FROM cartas c
       LEFT JOIN categorias k ON k.cartas_id = c.id AND k.visible AND k.eliminado IS NULL
       LEFT JOIN items i      ON i.categorias_id = k.id AND i.visible AND i.eliminado IS NULL
      WHERE c.restaurantes_id = $1 AND c.visible AND c.eliminada IS NULL
      ORDER BY c.orden NULLS LAST, c.id, k.orden NULLS LAST, k.id, i.orden NULLS LAST, i.id`,
    [restauranteId]
  );

  const cartas = new Map();
  for (const r of rows) {
    if (!cartas.has(r.carta_id)) cartas.set(r.carta_id, { id: r.carta_id, nombre: r.carta_nombre, categorias: new Map() });
    const carta = cartas.get(r.carta_id);
    if (r.cat_id === null) continue;
    if (!carta.categorias.has(r.cat_id)) carta.categorias.set(r.cat_id, { id: r.cat_id, nombre: r.cat_nombre, items: [] });
    if (r.item_id === null) continue;
    carta.categorias.get(r.cat_id).items.push({
      id: r.item_id, nombre: r.item_nombre, descripcion: r.descripcion,
      observaciones: r.observaciones, tiempo: r.tiempo,
      puntuacion: r.puntuacion, precio: r.precio, foto: r.foto,
    });
  }
  return [...cartas.values()].map((c) => ({ ...c, categorias: [...c.categorias.values()] }));
}

/** Ítems disponibles (visibles y no eliminados) de un restaurante, por lista de ids. */
async function itemsDisponibles(restauranteId, ids) {
  if (!ids.length) return [];
  const { rows } = await pool.query(
    `SELECT i.id, i.nombre, i.precio
       FROM items i
       JOIN categorias k ON k.id = i.categorias_id
       JOIN cartas c     ON c.id = k.cartas_id
      WHERE i.id = ANY($1::int[]) AND i.visible AND i.eliminado IS NULL
        AND k.eliminado IS NULL AND c.eliminada IS NULL
        AND c.restaurantes_id = $2`,
    [ids, restauranteId]
  );
  return rows;
}

module.exports = { destacados, cartasConCategorias, itemsDisponibles };
