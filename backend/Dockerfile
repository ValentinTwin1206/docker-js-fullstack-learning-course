#
# BASE LAYER
# # # # # # # #
FROM oven/bun:1 AS base
WORKDIR /app/backend

RUN echo "Base Build: Checking versions..." && \
    bun --version

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install


#
# DEV LAYER
# # # # # # # #
FROM base AS dev
COPY . .

RUN echo "Dev Target: Checking tool availability..." && \
    bun --version

EXPOSE 3000
CMD ["bun", "run", "start:dev"]


#
# PROD LAYER
# # # # # # # #
FROM base AS prod
ENV NODE_ENV=production
COPY . .

EXPOSE 3000
CMD ["bun", "run", "start"]