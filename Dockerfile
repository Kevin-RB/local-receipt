FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Install dependencies first for layer caching.
COPY pnpm-workspace.yaml package.json .npmrc pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

# Copy source and build.
COPY . .
RUN pnpm --filter @receipt-app/db build
RUN pnpm --filter @receipt-app/web build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "./scripts/check-lmstudio.sh && pnpm --filter @receipt-app/web start"]
