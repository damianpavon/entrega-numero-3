# Carta Digital PNK Security — 3ª Entrega

Trabajo de **Desarrollo Seguro** (INACAP La Serena) — Carlos Araya y Matías Puelles.

La carta digital (antes PHP + MySQL, vulnerable a propósito) fue migrada a:

| Capa | Tecnología |
|---|---|
| Backend | **Node.js 22 + Express 4** |
| Base de datos | **PostgreSQL 16** |
| Arquitectura | **MVC** (`models/` · `views/` · `controllers/` + `routes/`) |
| Contenedores | **Docker**: un contenedor **frontend** (Nginx), uno **backend** (Node.js) y la BD (PostgreSQL en dev/QA, RDS en AWS) |
| Ambientes | **Desarrollo · QA · Producción** (`docker/`) |
| Publicación | **Git** (rama nueva) → **AWS** (RDS, Auto Scaling, Load Balancer) → **Cloudflare** (DNS + HTTPS) |

## Estructura

```
frontend/                FRONTEND – contenedor Nginx
  public/                CSS, JS, imágenes, vendors (estáticos)
  nginx.conf             Sirve estáticos y reenvía lo demás al backend
  Dockerfile
backend/                 BACKEND – aplicación Node.js
  src/
    config/              Configuración por variables de entorno
    db/                  pool, schema.sql (idempotente), seed.sql (demo), migrate.js
    models/              MODELO  – consultas SQL parametrizadas
    controllers/         CONTROLADOR – lógica de cada ruta
    routes/              Rutas Express
    middlewares/         CSRF, autenticación, variables de vistas
    views/               VISTA – plantillas EJS (escape automático)
  test/                  Pruebas (npm test)
  Dockerfile
docker/                  docker-compose.{dev,qa,prod}.yml + env/*.env.example
infra/
  deploy.sh              Script de despliegue (contenedor + app + BD + AWS como código)
  aws/carta-digital.yml  CloudFormation: RDS + ALB + Auto Scaling
docs/                    Manual de implementación (PDF)
legacy/                  Versión PHP/MySQL original (solo referencia)
```

## Inicio rápido (Desarrollo)

Requisitos: Docker Desktop (o Docker + Compose v2).

```bash
./infra/deploy.sh dev
# → http://localhost:3000     (frontend Nginx → backend Node.js; salud: /health)
```

Usuarios de demo (solo dev/QA; en producción no existen):

| Correo | Contraseña |
|---|---|
| admin@gmail.com | `Admin#2026Pnk` |
| alondra@gmail.com | `Alondra#2026Pnk` |

Carta de ejemplo: http://localhost:3000/carta/1

Sin Docker (necesitas PostgreSQL propio): `cd backend && npm install && cp ../docker/env/dev.env.example .env` (ajusta `DB_HOST=localhost`) y `npm run dev`.

## Otros ambientes

```bash
cp docker/env/qa.env.example docker/env/qa.env      # cambiar secretos
./infra/deploy.sh qa                                # local, puerto 3001

./infra/deploy.sh qa --aws                          # AWS (requiere AWS CLI configurado)
./infra/deploy.sh prod --aws
```

Todo el procedimiento (Git, AWS, Cloudflare manual, verificación y rollback) está en
**`docs/Manual_de_Implementacion.pdf`**.

## Pruebas

```bash
cd backend && npm test
```

## Qué se corrigió respecto a la versión PHP

SQL Injection, XSS almacenado, contraseñas en texto plano, suplantación de autor en comentarios,
falta de CSRF, sesión fija, sin límite de intentos de login, credenciales fijas `root`/vacío en el código,
cabeceras de seguridad ausentes. Detalle en el manual (sección 7).
