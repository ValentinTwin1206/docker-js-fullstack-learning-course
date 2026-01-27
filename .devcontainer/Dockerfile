FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Set Playwright browsers path to shared location (outside node_modules)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

#
# 1. SYSTEM PACKAGES
# # # # # # # # #
USER root
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y \
        bats \
        bats-support \
        bats-assert \
        bats-file \
        dnsutils \
    && rm -rf /var/lib/apt/lists/*

#
# 2. BUN + PLAYWRIGHT + ARTILLERY
# # # # # # # # #
# Install Bun and create symlinks for both bun and bunx in /usr/local/bin
RUN curl -fsSL https://bun.com/install | bash \
    && cp /root/.bun/bin/bun /usr/local/bin/bun \
    && cp /root/.bun/bin/bunx /usr/local/bin/bunx

# Install Playwright and Artillery globally
RUN mkdir -p /ms-playwright \
    && npm install -g @playwright/test@1.58.0 \
    && npx playwright install --with-deps \ 
    # npx playwright install chromium firefox webkit --with-deps \
    && chown -R node:node /ms-playwright

#
# 3. SETUP WORKSPACE
# # # # # # # # #
USER node
WORKDIR /workspace

# Ensure local node_modules binaries are in the path
ENV PATH=/workspace/node_modules/.bin:$PATH

#
# 4. SANITY CHECKS
# # # # # # # # #
RUN bats --version \
    && bun --version \
    && bunx playwright --version

EXPOSE 9323

CMD ["sleep", "infinity"]