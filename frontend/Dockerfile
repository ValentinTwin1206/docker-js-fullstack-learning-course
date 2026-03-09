#
# FRONTEND DEV LAYER
# Runs the Vite dev server with HMR
# # # # # # # #
FROM oven/bun:1 AS dev
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

EXPOSE 5173
CMD ["bun", "run", "dev"]


#
# FRONTEND PROD LAYER
# Builds static assets, served by the backend
# # # # # # # #
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY . .
RUN bun run build
