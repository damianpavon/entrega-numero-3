import { h } from '../dom.js';
import { moneda, urlFoto, telefono, FOTO_COMODIN } from '../formato.js';

function foto(restauranteId, archivo, clase) {
  const img = h('img', { class: clase, src: urlFoto(restauranteId, archivo), alt: '', loading: 'lazy', decoding: 'async' });
  // Si la foto no existe se muestra la imagen genérica (una sola vez).
  img.addEventListener('error', () => { if (!img.src.endsWith(FOTO_COMODIN)) img.src = FOTO_COMODIN; }, { once: true });
  return img;
}

function puntuacion(valor) {
  const n = Math.max(0, Math.min(5, Number(valor) || 0));
  const puntos = [];
  for (let i = 1; i <= 5; i++) puntos.push(h('span', { class: i <= n ? 'punto punto--lleno' : 'punto' }));
  return h('span', { class: 'estrellas', role: 'img', 'aria-label': `Puntuación ${n} de 5` }, puntos);
}

function botonAgregar(item, restauranteId, ctx) {
  return h('button', {
    type: 'button', class: 'btn btn--linea',
    'aria-label': `Agregar ${item.nombre} al pedido`,
    onclick: () => ctx.agregarAlPedido(restauranteId, item),
  }, 'Agregar');
}

function lineaItem(item, restauranteId, ctx) {
  const detalle = [item.descripcion, item.observaciones].filter(Boolean).join(' ');
  return h('article', { class: 'item' },
    h('div', { class: 'item__texto' },
      h('div', { class: 'item__linea' },
        h('h4', { class: 'item__nombre' }, item.nombre),
        h('span', { class: 'puntos', 'aria-hidden': 'true' }),
        h('span', { class: 'precio' }, moneda(item.precio))),
      detalle && h('p', { class: 'item__detalle' }, detalle),
      h('div', { class: 'item__meta' },
        item.tiempo && h('span', {}, `Listo en ${item.tiempo}`),
        puntuacion(item.puntuacion)),
      botonAgregar(item, restauranteId, ctx)),
    foto(restauranteId, item.foto, 'item__foto'));
}

function tileDestacado(item, restauranteId, ctx) {
  return h('article', { class: 'tile' },
    foto(restauranteId, item.foto, 'tile__foto'),
    h('div', { class: 'tile__cuerpo' },
      h('h3', { class: 'tile__nombre' }, item.nombre),
      h('p', { class: 'precio' }, moneda(item.precio)),
      botonAgregar(item, restauranteId, ctx)));
}

function panelCarta(carta, restauranteId, ctx) {
  if (!carta.categorias.length) return h('p', { class: 'vacio' }, 'Esta carta todavía no tiene productos.');
  return carta.categorias.map((cat) =>
    h('section', { class: 'categoria' },
      h('h3', { class: 'categoria__nombre' }, cat.nombre),
      cat.items.length
        ? cat.items.map((it) => lineaItem(it, restauranteId, ctx))
        : h('p', { class: 'vacio' }, 'Sin productos por ahora.')));
}

function pestanas(cartas, restauranteId, ctx) {
  if (!cartas.length) return h('p', { class: 'vacio' }, 'Este restaurante todavía no publica su carta.');
  const botones = [];
  const paneles = [];

  const activar = (i, enfocar = false) => {
    botones.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
      paneles[k].hidden = k !== i;
    });
    if (enfocar) botones[i].focus();
  };

  cartas.forEach((c, i) => {
    const idPanel = `panel-carta-${c.id}`;
    const boton = h('button', {
      type: 'button', role: 'tab', class: 'pestana', id: `pestana-carta-${c.id}`,
      'aria-controls': idPanel, 'aria-selected': 'false',
      onclick: () => activar(i),
      onkeydown: (e) => {
        const ultimo = cartas.length - 1;
        const destino = { ArrowRight: i === ultimo ? 0 : i + 1, ArrowLeft: i === 0 ? ultimo : i - 1, Home: 0, End: ultimo }[e.key];
        if (destino !== undefined) { e.preventDefault(); activar(destino, true); }
      },
    }, c.nombre);
    botones.push(boton);
    paneles.push(h('div', { role: 'tabpanel', id: idPanel, class: 'panel', 'aria-labelledby': boton.id, hidden: true, tabindex: '0' },
      panelCarta(c, restauranteId, ctx)));
  });
  const conProductos = cartas.findIndex((c) => (c.categorias || []).some((k) => (k.items || []).length));
  activar(Math.max(conProductos, 0));

  return h('div', { class: 'carta' },
    h('div', { class: 'pestanas', role: 'tablist', 'aria-label': 'Secciones de la carta' }, botones),
    paneles);
}

function seccionComentarios(restauranteId, comentarios, ctx) {
  const lista = h('div', { class: 'comentarios__lista' });
  const pintar = (items) => {
    lista.replaceChildren(...(items.length
      ? items.map((c) => h('article', { class: 'comentario' },
          h('header', { class: 'comentario__cabecera' },
            h('strong', {}, c.usuario),
            h('time', { datetime: c.creado }, new Date(c.creado).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }))),
          h('p', { class: 'comentario__texto' }, c.comentario)))
      : [h('p', { class: 'vacio' }, 'Aún no hay comentarios.')]));
  };
  let actuales = comentarios;
  pintar(actuales);

  let formulario;
  if (ctx.usuario) {
    const area = h('textarea', { id: 'comentario', name: 'comentario', rows: '4', maxlength: '1000', required: true });
    const error = h('p', { class: 'error', role: 'alert', hidden: true });
    const enviar = h('button', { type: 'submit', class: 'btn' }, 'Comentar');
    formulario = h('form', { class: 'comentarios__form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.hidden = true;
        enviar.disabled = true;
        try {
          const nuevo = await ctx.api.comentar(restauranteId, area.value);
          actuales = [nuevo, ...actuales];
          pintar(actuales);
          area.value = '';
          ctx.avisar('Comentario publicado');
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
        } finally {
          enviar.disabled = false;
        }
      } },
      h('label', { for: 'comentario' }, `Tu comentario, ${ctx.usuario.nombre}`),
      area, error, enviar);
  } else {
    formulario = h('p', { class: 'comentarios__ingreso' },
      'Para comentar necesitas una cuenta. ',
      h('button', { type: 'button', class: 'enlace', onclick: () => ctx.abrirLogin() }, 'Ingresar'));
  }

  return h('section', { class: 'comentarios', 'aria-labelledby': 'tit-comentarios' },
    h('h2', { id: 'tit-comentarios', class: 'seccion' }, 'Comentarios'),
    formulario, lista);
}

export async function montarCarta(raiz, ctx, id) {
  const [r, { destacados, cartas }, comentarios] = await Promise.all([
    ctx.api.restaurante(id), ctx.api.carta(id), ctx.api.comentarios(id),
  ]);
  const d = r.direccion;

  raiz.replaceChildren(
    h('div', { class: 'columna' },
      h('a', { class: 'volver', href: '#/' }, 'Restaurantes'),
      h('header', { class: 'restaurante' },
        foto(r.id, r.foto, 'restaurante__foto'),
        h('div', {},
          h('h1', { class: 'titulo' }, r.nombre),
          h('p', { class: 'restaurante__dato' }, `${d.calle} ${d.numero}, ${d.comuna}`),
          h('p', { class: 'restaurante__dato' },
            r.fono && h('a', { href: `tel:${telefono(r.fono)}` }, r.fono),
            r.fono && r.email && ' / ',
            r.email && h('a', { href: `mailto:${r.email}` }, r.email)))),

      destacados.length > 0 && h('section', { class: 'destacados', 'aria-labelledby': 'tit-destacados' },
        h('h2', { id: 'tit-destacados', class: 'seccion' }, 'Destacados'),
        h('div', { class: 'destacados__tira' }, destacados.map((it) => tileDestacado(it, r.id, ctx)))),

      pestanas(cartas, r.id, ctx),
      seccionComentarios(r.id, comentarios, ctx)));

  document.title = `${r.nombre} · Carta Digital`;
}
