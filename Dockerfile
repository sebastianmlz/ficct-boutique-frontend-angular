ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Development build keeps backend URLs pointing at localhost:* which is what
# the browser running on the developer machine needs. For a real prod deploy,
# either reverse-proxy via nginx or rebuild after editing environment.prod.ts.
RUN npm run build:dev

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ficct-admin/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost/ || exit 1
