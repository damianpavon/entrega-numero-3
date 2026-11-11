'use strict';
// Crea (o actualiza) un usuario con contraseña hasheada con bcrypt.
// Uso (en producción NO hay usuarios de demo):
//   docker compose -f docker/docker-compose.prod.yml exec app \
//     node scripts/crear-usuario.js "Nombre" correo@dominio.cl "ContraseñaLarga#123"
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');
const { crear } = require('../src/models/usuario');

(async () => {
  const [nombre, email, password] = process.argv.slice(2);
  if (!nombre || !email || !password) {
    console.error('Uso: node scripts/crear-usuario.js "Nombre" correo contraseña');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('La contraseña debe tener al menos 10 caracteres.');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await crear({ nombre, email: email.trim().toLowerCase(), passwordHash });
  console.log(`Usuario listo: ${u.nombre} <${u.email}> (id ${u.id})`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
