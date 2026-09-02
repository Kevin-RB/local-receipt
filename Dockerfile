# syntax=docker/dockerfile:1

# Multi-stage production image. Two deployable targets:
#   runner  - minimal, non-root Next.js standalone server (the app)
#   migrator- full toolchain for `pnpm db:migrate` (one-shot deploy step)
# Built once, used by docker-compose.coolify.yml.

FROM node:26-slim AS base

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
# Node 25+ no longer bundles Corepack (removed from the runtime), so install
# pnpm directly. Pinned to the same version as the repo's packageManager.
RUN npm install --global pnpm@11.20.0

WORKDIR /app

# deps: install everything (incl. devDeps: drizzle-kit, tsc, vitest) once.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# builder: compile the app, including the traced standalone server.
FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# runner: the standalone server + static assets only, running as non-root.
FROM node:26-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir .next \
  && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

CMD ["sh", "./scripts/start-production.sh"]

# migrator: runs `pnpm db:migrate` against the production database.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY lib ./lib
ENTRYPOINT ["pnpm", "db:migrate"]
