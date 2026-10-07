# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --no-audit --no-fund
COPY server ./server
RUN npm run build --workspace=server && npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app/server
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/content-media ./content-media
COPY infra/healthcheck.cjs /app/healthcheck.cjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 CMD ["node", "/app/healthcheck.cjs"]
CMD ["node", "dist/main.js"]
