# syntax=docker/dockerfile:1
# Imagen del BACKEND de la Carta Digital (los estáticos los sirve el contenedor frontend). Etapas:
#   dev  -> con nodemon y devDependencies (ambiente Desarrollo)
#   prod -> mínima, usuario no-root (ambientes QA y Producción)
ARG NODE_VERSION=22

# ---------- dependencias de producción ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Si existe package-lock.json se usa "npm ci" (reproducible); si no, "npm install".
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm cache clean --force

# ---------- DESARROLLO ----------
FROM node:${NODE_VERSION}-alpine AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- QA / PRODUCCIÓN ----------
FROM node:${NODE_VERSION}-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
# Nunca corre como root
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
CMD ["node", "src/server.js"]
