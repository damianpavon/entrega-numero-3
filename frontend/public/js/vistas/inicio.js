import { h } from '../dom.js';

export async function montarInicio(raiz, ctx) {
  const lista = await ctx.api.restaurantes();
  raiz.replaceChildren(
    h('section', { class: 'columna' },
      h('h1', { class: 'titulo' }, 'Restaurantes'),
      h('p', { class: 'bajada' }, 'Elige uno para ver su carta.'),
      lista.length
        ? h('ul', { class: 'indice' },
            lista.map((r) =>
              h('li', {},
                h('a', { class: 'indice__fila', href: `#/carta/${r.id}` },
                  h('span', { class: 'indice__nombre' }, r.nombre),
                  h('span', { class: 'puntos', 'aria-hidden': 'true' }),
                  h('span', { class: 'indice__lugar' }, r.comuna)))))
        : h('p', { class: 'vacio' }, 'Todavía no hay restaurantes registrados.'))
  );
  document.title = 'Carta Digital';
}
