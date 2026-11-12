// Cliente de la API REST (/api). El token CSRF se obtiene de GET /api/sesion y se envía
// en la cabecera X-CSRF-Token en cada petición que modifica datos.
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

let csrf = null;

async function pedir(ruta, { metodo = 'GET', cuerpo, reintento = true } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (metodo !== 'GET' && csrf) cabeceras['X-CSRF-Token'] = csrf;

  let resp;
  try {
    resp = await fetch(`/api${ruta}`, {
      method: metodo, headers: cabeceras, credentials: 'same-origin',
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
  }

  let datos = null;
  try { datos = await resp.json(); } catch { /* respuesta sin cuerpo */ }

  // Token vencido (la sesión expiró): se renueva una vez y se reintenta.
  if (resp.status === 403 && metodo !== 'GET' && reintento) {
    await api.sesion();
    return pedir(ruta, { metodo, cuerpo, reintento: false });
  }
  if (!resp.ok) throw new ErrorApi((datos && datos.error) || 'Ocurrió un error inesperado.', resp.status);
  return datos;
}

export const api = {
  async sesion() {
    const d = await pedir('/sesion');
    csrf = d.csrfToken;
    return d.usuario;
  },
  async login(email, password) {
    const d = await pedir('/login', { metodo: 'POST', cuerpo: { email, password } });
    csrf = d.csrfToken;
    return d.usuario;
  },
  async logout() {
    await pedir('/logout', { metodo: 'POST' });
    await api.sesion(); // la sesión se destruyó: se pide un token nuevo
  },
  restaurantes: () => pedir('/restaurantes'),
  restaurante: (id) => pedir(`/restaurantes/${id}`),
  carta: (id) => pedir(`/restaurantes/${id}/carta`),
  items: async (id, ids) => (ids.length ? (await pedir(`/restaurantes/${id}/items?ids=${ids.join(',')}`)).items : []),
  comentarios: (id) => pedir(`/restaurantes/${id}/comentarios`),
  comentar: (id, comentario) => pedir(`/restaurantes/${id}/comentarios`, { metodo: 'POST', cuerpo: { comentario } }),
};
