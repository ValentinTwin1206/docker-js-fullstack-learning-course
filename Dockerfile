#
# BASE LAYER
# # # # # # # #
FROM oven/bun:1 AS base
WORKDIR /app

RUN echo "Base Build: Checking versions..." && \
    bun --version

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile


#
# DEV LAYER
# # # # # # # # 
FROM base AS dev
COPY backend ./backend
COPY backend/public ./public

RUN echo "Dev Target: Checking tool availability..." && \
    bun --version

EXPOSE 3000
CMD ["bun", "run", "start:dev"]


#
# PROD LAYER
# # # # # # # # 
FROM base AS prod
ENV NODE_ENV=production
COPY backend ./backend
COPY backend/public ./public

EXPOSE 3000
CMD ["bun", "run", "start"]