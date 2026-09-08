# Multi-stage production image. Two deployable targets (from
# docker-compose.coolify.yml):
#   runner  - minimal, non-root Next.js standalone server (the app)
#   migrator- full toolchain for `pnpm db:migrate` (one-shot deploy step)

ARG NODE_VERSION=26-slim

# base: pnpm pinned to the repo's packageManager. Dependencies/builder/migrator
# inherit from here so pnpm exists in every stage that needs it. The runner does
# not (it is a fresh node:26-slim to stay slim).
FROM node:${NODE_VERSION} AS base

# Node 25+ no longer bundles Corepack (removed from the runtime), so install
# pnpm directly. Pinned to the same version as the repo's packageManager.
RUN npm install --global pnpm@11.20.0

WORKDIR /app

# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile


# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================
FROM base AS builder

WORKDIR /app

# Copy project dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY . .

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


# ============================================
# Stage 3: Run Next.js application
# ============================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Set the correct permission for prerender cache
RUN mkdir .next && chown node:node .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Production boot script: best-effort LM Studio check, then `exec node server.js`.
COPY --from=builder --chown=node:node /app/scripts ./scripts
# scripts are committed mode 0644 (core.filemode is unreliable across
# machines); make them executable here so start-production.sh can run
# check-lmstudio.sh without relying on the git mode bit.
RUN chmod +x scripts/*.sh

# Switch to non-root user for security best practices
USER node

EXPOSE 3000

CMD ["sh", "./scripts/start-production.sh"]


# ============================================
# Stage 4: Migrator - one-shot deploy step
# ============================================
FROM base AS migrator

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY lib ./lib

ENTRYPOINT ["pnpm", "db:migrate"]