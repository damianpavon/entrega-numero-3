'use strict';
// Crea (o actualiza) un usuario con la contraseña guardada como hash bcrypt.
// En producción NO hay usuarios de demo; se crean con este script:
//   docker exec backend node scripts/crear-usuario.js "Nombre" correo@dominio.cl "ClaveLarga#2026"
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');
const { crear } = require('../src/models/usuario');
const { emailValido } = require('../src/utils/validacion');

(async () => {
  const [nombre, email, password] = process.argv.slice(2);
  if (!nombre || !email || !password) {
    console.error('Uso: node scripts/crear-usuario.js "Nombre" correo contraseña');
    process.exit(1);
  }
  if (!emailValido(email)) { console.error('El correo no es válido.'); process.exit(1); }
  if (password.length < 10) { console.error('La contraseña debe tener al menos 10 caracteres.'); process.exit(1); }
  const u = await crear({ nombre, email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Usuario listo: ${u.nombre} <${u.email}> (id ${u.id})`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
