# =============================================================================
# Pisairtel SMS — Dockerfile (multi-stage)
# Stage 1: Build the Vite frontend
# Stage 2: Runtime with Express + tsx for API handlers
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:22-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy lockfile and package manifest for reproducible installs
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copy source and build frontend
COPY . .

RUN pnpm build

# ---- Stage 2: Runtime ----
FROM node:22-slim AS runtime

RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lockfile and package manifest
COPY package.json pnpm-lock.yaml ./

# Install all deps (need tsx for runtime TypeScript execution)
RUN pnpm install --frozen-lockfile

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy API handlers, server, and config
COPY api ./api
COPY server.mjs ./
COPY vercel.json ./
COPY scripts ./scripts
COPY prisma ./prisma
COPY docker ./docker

# Expose the Express server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/tenant/system-health || exit 1

# Run the Express server with tsx for TypeScript API handler support
# --import flag loads our custom resolver that redirects @vercel/postgres to pg-based shim
CMD ["npx", "tsx", "--import", "./docker/import-shim.mjs", "server.mjs"]
