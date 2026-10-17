# syntax=docker/dockerfile:1

# Node.js 24 — актуальная LTS-ветка. Меняется одной строкой при переходе на следующую LTS.
ARG NODE_IMAGE=node:24-alpine

# --- Все зависимости (нужны для сборки и для режима разработки) ---------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# --- Сборка Astro -------------------------------------------------------------
FROM deps AS build
COPY . .
RUN npm run build

# --- Только production-зависимости -------------------------------------------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# --- Итоговый образ -----------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    UPLOADS_DIR=/app/data/uploads

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY scripts ./scripts
COPY src/server ./src/server
COPY db ./db
COPY seed ./seed

RUN mkdir -p /app/data/uploads && chown -R node:node /app/data
USER node

EXPOSE 4321
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4321/healthz || exit 1

# Миграции → первый администратор → тестовый контент (если база пустая) → сервер
CMD ["node", "scripts/start.ts"]
