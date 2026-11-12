'use strict';
const { enteroPositivo, listaIds } = require('../utils/validacion');

// CONTROLADOR: valida la entrada, pide datos al MODELO y responde JSON.
module.exports = function crearControladorRestaurantes({ Restaurante, Carta }) {
  async function cargar(req, res) {
    const id = enteroPositivo(req.params.id);
    const restaurante = id ? await Restaurante.buscarPorId(id) : null;
    if (!restaurante) {
      res.status(404).json({ error: 'El restaurante no existe.' });
      return null;
    }
    return restaurante;
  }

  async function listar(req, res) {
    res.json(await Restaurante.listar());
  }

  async function detalle(req, res) {
    const r = await cargar(req, res);
    if (!r) return;
    res.json({
      id: r.id, nombre: r.nombre, fono: r.fono, email: r.email, foto: r.foto,
      direccion: { calle: r.calle, numero: r.numero, comuna: r.comuna, region: r.region },
    });
  }

  async function carta(req, res) {
    const r = await cargar(req, res);
    if (!r) return;
    const [destacados, cartas] = await Promise.all([Carta.destacados(r.id), Carta.cartasConCategorias(r.id)]);
    res.json({ destacados, cartas });
  }

  // Nombre y precio actuales de los productos del pedido (el pedido vive en el navegador,
  // pero los precios SIEMPRE salen de la base de datos).
  async function items(req, res) {
    const r = await cargar(req, res);
    if (!r) return;
    const ids = listaIds(req.query.ids);
    if (ids === null) return res.status(400).json({ error: 'Lista de productos inválida.' });
    res.json({ items: await Carta.itemsDisponibles(r.id, ids) });
  }

  return { listar, detalle, carta, items };
};
