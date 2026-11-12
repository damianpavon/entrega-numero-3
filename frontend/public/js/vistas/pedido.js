import { h } from '../dom.js';
import { moneda, textoProductos } from '../formato.js';

export async function montarPedido(raiz, ctx, id) {
  const r = await ctx.api.restaurante(id);
  const lineas = ctx.store.leer(id);

  // Los precios SIEMPRE se piden al servidor; lo que ya no esté disponible se descarta.
  const ids = [...new Set(lineas.map((l) => l.itemId))];
  const vigentes = await ctx.api.items(id, ids);
  const porId = new Map(vigentes.map((i) => [i.id, i]));
  const perdidos = ids.filter((i) => !porId.has(i));
  if (perdidos.length) ctx.store.quitarProductos(id, perdidos);

  const filas = ctx.store.leer(id).map((l) => ({ ...l, ...porId.get(l.itemId) }));
  const total = filas.reduce((suma, f) => suma + (f.precio || 0), 0);
  ctx.actualizarBarra(id);

  raiz.replaceChildren(
    h('div', { class: 'columna' },
      h('a', { class: 'volver', href: `#/carta/${id}` }, `Volver a la carta de ${r.nombre}`),
      h('h1', { class: 'titulo' }, 'Mi pedido'),
      perdidos.length > 0 && h('p', { class: 'aviso-pedido' }, 'Quitamos del pedido los productos que ya no están disponibles.'),
      filas.length === 0
        ? h('div', { class: 'vacio-grande' },
            h('p', {}, 'Tu pedido está vacío.'),
            h('a', { class: 'btn', href: `#/carta/${id}` }, 'Ver la carta'))
        : [
            h('p', { class: 'bajada' }, `${textoProductos(filas.length)} en tu pedido.`),
            h('ul', { class: 'pedido' },
              filas.map((f) => h('li', { class: 'pedido__fila' },
                h('span', { class: 'pedido__nombre' }, f.nombre),
                h('span', { class: 'puntos', 'aria-hidden': 'true' }),
                h('span', { class: 'precio' }, moneda(f.precio)),
                h('button', {
                  type: 'button', class: 'btn btn--texto', 'aria-label': `Quitar ${f.nombre}`,
                  onclick: () => { ctx.store.quitar(id, f.uid); ctx.refrescar(); },
                }, 'Quitar')))),
            h('p', { class: 'total' }, h('span', {}, 'Total'), h('span', { class: 'precio' }, moneda(total))),
            h('p', { class: 'bajada' }, 'Listo. Muestra esta lista al garzón para hacer tu pedido.'),
            h('button', {
              type: 'button', class: 'btn btn--linea',
              onclick: () => { ctx.store.vaciar(id); ctx.avisar('Pedido vaciado'); ctx.refrescar(); },
            }, 'Vaciar pedido'),
          ]));

  document.title = `Mi pedido · ${r.nombre}`;
}
