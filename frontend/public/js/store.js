// El pedido vive en el navegador (localStorage) y SOLO guarda ids de productos:
// nombres y precios se piden siempre al servidor. Es una función pura con almacenamiento
// inyectable, por eso se puede probar fuera del navegador.
const CLAVE = 'pnk.pedido.v1';
const MAX_LINEAS = 50;

export function crearStore(almacen) {
  let memoria = null; // respaldo si localStorage no está disponible (modo privado, etc.)

  function leerTodo() {
    let datos = memoria;
    if (datos === null) {
      try {
        datos = JSON.parse(almacen.getItem(CLAVE) || '{}');
      } catch {
        datos = {};
      }
    }
    // Sanea lo leído: el almacenamiento del navegador no es de fiar.
    const limpio = {};
    if (datos && typeof datos === 'object') {
      for (const [rid, lineas] of Object.entries(datos)) {
        if (!/^\d{1,9}$/.test(rid) || !Array.isArray(lineas)) continue;
        limpio[rid] = lineas
          .filter((l) => l && Number.isInteger(l.uid) && l.uid > 0 && Number.isInteger(l.itemId) && l.itemId > 0)
          .slice(0, MAX_LINEAS)
          .map((l) => ({ uid: l.uid, itemId: l.itemId }));
      }
    }
    return limpio;
  }

  function guardar(datos) {
    memoria = datos;
    try {
      almacen.setItem(CLAVE, JSON.stringify(datos));
    } catch {
      /* se mantiene solo en memoria */
    }
  }

  const leer = (rid) => leerTodo()[String(rid)] || [];

  function agregar(rid, itemId) {
    const datos = leerTodo();
    const lineas = datos[String(rid)] || [];
    if (lineas.length >= MAX_LINEAS) return { ok: false, cantidad: lineas.length };
    const uid = lineas.reduce((m, l) => Math.max(m, l.uid), 0) + 1;
    datos[String(rid)] = [...lineas, { uid, itemId }];
    guardar(datos);
    return { ok: true, cantidad: datos[String(rid)].length };
  }

  function quitar(rid, uid) {
    const datos = leerTodo();
    datos[String(rid)] = (datos[String(rid)] || []).filter((l) => l.uid !== uid);
    guardar(datos);
  }

  /** Elimina todas las líneas de productos que ya no existen en el servidor. */
  function quitarProductos(rid, itemIds) {
    const fuera = new Set(itemIds);
    const datos = leerTodo();
    datos[String(rid)] = (datos[String(rid)] || []).filter((l) => !fuera.has(l.itemId));
    guardar(datos);
  }

  function vaciar(rid) {
    const datos = leerTodo();
    delete datos[String(rid)];
    guardar(datos);
  }

  const cantidad = (rid) => leer(rid).length;

  return { leer, agregar, quitar, quitarProductos, vaciar, cantidad };
}
