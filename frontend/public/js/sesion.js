import { h } from './dom.js';

// Zona de sesión del encabezado + diálogo de ingreso.
export function crearSesionUI({ api, ctx, alCambiar }) {
  const zona = document.getElementById('zona-sesion');
  const dlg = document.getElementById('dlg-login');
  const form = document.getElementById('form-login');
  const error = document.getElementById('login-error');
  const enviar = document.getElementById('login-enviar');

  function pintar() {
    if (ctx.usuario) {
      zona.replaceChildren(
        h('span', { class: 'sesion__nombre' }, ctx.usuario.nombre),
        h('button', { type: 'button', class: 'enlace enlace--claro', onclick: salir }, 'Salir'));
    } else {
      zona.replaceChildren(h('button', { type: 'button', class: 'enlace enlace--claro', onclick: abrir }, 'Ingresar'));
    }
  }

  function abrir() {
    form.reset();
    error.hidden = true;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    document.getElementById('login-email').focus();
  }

  async function salir() {
    try { await api.logout(); } catch { /* ya no hay sesión */ }
    ctx.usuario = null;
    pintar();
    ctx.avisar('Sesión cerrada');
    alCambiar();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    enviar.disabled = true;
    try {
      ctx.usuario = await api.login(form.elements.email.value.trim(), form.elements.password.value);
      dlg.close();
      form.reset();
      pintar();
      ctx.avisar(`Hola, ${ctx.usuario.nombre}`);
      alCambiar();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      enviar.disabled = false;
    }
  });
  document.getElementById('login-cancelar').addEventListener('click', () => dlg.close());

  return { pintar, abrir };
}
