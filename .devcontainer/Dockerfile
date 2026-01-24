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
# 2. PLAYWRIGHT + PLAYWRIGHT BROWSERS (as root)
# # # # # # # # #
RUN mkdir -p /ms-playwright \
    && npm install -g @playwright/test@1.57.0 \
    && npx playwright install chromium firefox webkit --with-deps \
    && chown -R node:node /ms-playwright


#
# 3. SETUP WORKSPACE
# # # # # # # # #
USER node
WORKDIR /workspace

COPY --chown=node:node package.json package-lock.json* ./


#
# 4. INSTALL DEPENDENCIES
# # # # # # # # #
RUN npm install --omit=prod --no-audit --no-fund

ENV PATH=/workspace/node_modules/.bin:$PATH


#
# 5. SANITY CHECKS
# # # # # # # #
RUN bats --version \
    && npx playwright --version \
    && npx artillery --version

EXPOSE 9323

CMD ["sleep", "infinity"]