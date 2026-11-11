'use strict';
const Restaurante = require('../models/restaurante');
const Carta = require('../models/carta');
const { enteroPositivo } = require('../utils/formato');

const MAX_LINEAS = 50;

// El carrito vive en la sesión (guardada en PostgreSQL) y SOLO guarda ids.
// Nombre y precio se leen siempre desde la BD: el cliente no puede alterarlos.
function lineas(req, restauranteId) {
  req.session.carrito = req.session.carrito || {};
  req.session.carrito[restauranteId] = req.session.carrito[restauranteId] || [];
  return req.session.carrito[restauranteId];
}

async function ver(req, res) {
  const id = enteroPositivo(req.params.id);
  const restaurante = id && (await Restaurante.buscarPorId(id));
  if (!restaurante) {
    return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La carta que buscas no existe.' });
  }

  const guardadas = lineas(req, id);
  const items = await Carta.itemsDisponibles(id, [...new Set(guardadas.map((l) => l.itemId))]);
  const porId = new Map(items.map((i) => [i.id, i]));

  const filas = guardadas
    .filter((l) => porId.has(l.itemId))
    .map((l) => ({ uid: l.uid, ...porId.get(l.itemId) }));
  const total = filas.reduce((s, f) => s + (f.precio || 0), 0);

  res.render('carrito', { titulo: `Pedido - ${restaurante.nombre}`, restaurante, filas, total });
}

async function agregar(req, res) {
  const id = enteroPositivo(req.params.id);
  const itemId = enteroPositivo(req.body.itemId);
  if (!id || !itemId) return res.status(400).json({ ok: false, error: 'Datos inválidos' });

  const [item] = await Carta.itemsDisponibles(id, [itemId]);
  if (!item) return res.status(404).json({ ok: false, error: 'Producto no disponible' });

  const carrito = lineas(req, id);
  if (carrito.length >= MAX_LINEAS) return res.status(409).json({ ok: false, error: 'Carrito lleno' });

  req.session.contadorLineas = (req.session.contadorLineas || 0) + 1;
  carrito.push({ uid: req.session.contadorLineas, itemId });
  res.json({ ok: true, cantidad: carrito.length });
}

function eliminar(req, res) {
  const id = enteroPositivo(req.params.id);
  const uid = enteroPositivo(req.body.uid);
  if (!id || !uid) return res.status(400).json({ ok: false, error: 'Datos inválidos' });
  req.session.carrito = req.session.carrito || {};
  req.session.carrito[id] = (req.session.carrito[id] || []).filter((l) => l.uid !== uid);
  res.json({ ok: true });
}

function vaciar(req, res) {
  const id = enteroPositivo(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: 'Datos inválidos' });
  // El original hacía session_destroy() y cerraba la sesión del usuario; ahora solo se vacía el carrito.
  if (req.session.carrito) delete req.session.carrito[id];
  res.json({ ok: true });
}

module.exports = { ver, agregar, eliminar, vaciar };
