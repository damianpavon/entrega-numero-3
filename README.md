# Carta Digital — PNK Security

Trabajo de Desarrollo Seguro (INACAP La Serena) — 3ª entrega. Autores: Carlos Araya y Matías Puelles.

Carta digital de restaurantes: **frontend** estático (Nginx) + **API REST** (Node.js 22 + Express) + **PostgreSQL 16**, en dos contenedores Docker más la base de datos, con tres ambientes y despliegue en AWS como código.

```
frontend/   SPA (HTML/CSS/JS) + Nginx + Dockerfile
backend/    API REST (MVC: models, controllers, routes) + Dockerfile + pruebas
docker/     docker-compose dev / qa / prod y env/*.env.example
infra/      deploy.sh y aws/carta-digital.yml (CloudFormation)
docs/       Manual_de_Implementacion.pdf (procedimiento completo) y diagrama
```

## Inicio rápido (desarrollo)

```bash
cp docker/env/dev.env.example docker/env/dev.env
docker compose --env-file docker/env/dev.env -f docker/docker-compose.dev.yml up --build
# http://localhost:8080   usuario demo (solo desarrollo): demo@carta.cl / Demo#Dev2026
```

QA: `docker-compose.qa.yml` (puerto 8081). Producción / AWS: `./infra/deploy.sh prod --aws`. Cloudflare es el único paso manual. Todo el detalle está en **docs/Manual_de_Implementacion.pdf**.

## Pruebas

```bash
cd backend && npm test          # Node 22, sin dependencias de prueba
cd frontend && node --test test/*.test.js
```

Los secretos nunca se suben: solo existen archivos `*.env.example` en `docker/env/`.
