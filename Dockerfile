# syntax=docker/dockerfile:1
# Single-image deployment: the API serves the built SPA, so QR URLs, session
# cookies and the live-update stream all share one HTTPS origin.

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts ./artifacts
RUN pnpm install --frozen-lockfile
RUN pnpm run typecheck:libs \
 && pnpm --filter @workspace/seedchain run build \
 && pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080 FRONTEND_DIST_DIR=/app/public RUN_MIGRATIONS_ON_START=true
WORKDIR /app
# The API is a self-contained esbuild bundle (plus its migrations); no node_modules are needed at runtime.
COPY --from=build /repo/artifacts/api-server/dist ./
COPY --from=build /repo/artifacts/seedchain/dist/public ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "index.mjs"]
