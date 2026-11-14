FROM node:24.14.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS runtime

ENV PORT=8080
ENV API_BASE_URL=http://localhost:8000
ENV USE_MOCKS=false
ENV NGINX_ENVSUBST_FILTER=^PORT$

USER root
RUN apk update && apk upgrade --no-cache
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chown=101:101 docker/40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh && \
    chown -R 101:101 /usr/share/nginx/html

USER 101

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/healthz" >/dev/null || exit 1
