import { api, ErrorApi } from './api.js';
import { h } from './dom.js';
import { crearStore } from './store.js';
import { textoProductos } from './formato.js';
import { crearSesionUI } from './sesion.js';
import { montarInicio } from './vistas/inicio.js';
import { montarCarta } from './vistas/carta.js';
import { montarPedido } from './vistas/pedido.js';

const raiz = document.getElementById('app');
const barra = document.getElementById('barra-pedido');
const aviso = document.getElementById('aviso');

let almacen;
try { almacen = window.localStorage; } catch { almacen = { getItem: () => null, setItem: () => {} }; }

const ctx = {
  api,
  store: crearStore(almacen),
  usuario: null,
  restauranteActual: null,
  avisar(texto) {
    aviso.replaceChildren(h('p', { class: 'aviso__texto' }, texto));
    aviso.classList.add('aviso--visible');
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => aviso.classList.remove('aviso--visible'), 2600);
  },
  agregarAlPedido(rid, item) {
    const r = ctx.store.agregar(rid, item.id);
    if (!r.ok) return ctx.avisar('El pedido está lleno (máximo 50 productos).');
    ctx.actualizarBarra(rid, true);
    ctx.avisar(`Agregado: ${item.nombre}`);
  },
  actualizarBarra(rid, destacar = false) {
    const n = rid ? ctx.store.cantidad(rid) : 0;
    barra.hidden = !(rid && n > 0 && !location.hash.endsWith('/pedido'));
    if (rid) barra.querySelector('a').setAttribute('href', `#/carta/${rid}/pedido`);
    document.getElementById('barra-cuenta').textContent = String(n);
    barra.querySelector('a').setAttribute('aria-label', `Ver pedido: ${textoProductos(n)}`);
    if (destacar) { barra.classList.remove('barra-pedido--salto'); void barra.offsetWidth; barra.classList.add('barra-pedido--salto'); }
  },
  abrirLogin: () => sesionUI.abrir(),
  refrescar: () => mostrar(),
};
const avisar = ctx.avisar;

const sesionUI = crearSesionUI({
  api, ctx,
  alCambiar: () => mostrar({ conservarScroll: true }),
});

let turno = 0;
async function mostrar({ conservarScroll = false } = {}) {
  const miTurno = ++turno;
  const y = window.scrollY;
  const partes = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  const id = /^\d{1,9}$/.test(partes[1] || '') ? Number(partes[1]) : null;

  ctx.restauranteActual = partes[0] === 'carta' ? id : null;
  ctx.actualizarBarra(ctx.restauranteActual);
  if (!conservarScroll) raiz.replaceChildren(h('p', { class: 'cargando' }, 'Cargando…'));

  try {
    if (partes.length === 0) await montarInicio(raiz, ctx);
    else if (partes[0] === 'carta' && id && partes.length === 2) await montarCarta(raiz, ctx, id);
    else if (partes[0] === 'carta' && id && partes[2] === 'pedido' && partes.length === 3) await montarPedido(raiz, ctx, id);
    else throw new ErrorApi('La página que buscas no existe.', 404);
  } catch (err) {
    if (miTurno !== turno) return;
    const noExiste = err.estado === 404;
    raiz.replaceChildren(h('div', { class: 'columna vacio-grande' },
      h('h1', { class: 'titulo' }, noExiste ? 'No encontramos esta página' : 'No pudimos cargar esta página'),
      h('p', {}, noExiste ? 'Revisa el enlace o vuelve a la lista de restaurantes.' : err.message),
      noExiste ? h('a', { class: 'btn', href: '#/' }, 'Ver restaurantes')
               : h('button', { type: 'button', class: 'btn', onclick: () => mostrar() }, 'Reintentar')));
    document.title = 'Carta Digital';
    return;
  }
  if (miTurno !== turno) return;
  if (conservarScroll) window.scrollTo(0, y);
  else { window.scrollTo(0, 0); }
}

window.addEventListener('hashchange', () => mostrar());

(async function iniciar() {
  try { ctx.usuario = await api.sesion(); } catch { ctx.usuario = null; }
  sesionUI.pintar();
  mostrar();
})();
