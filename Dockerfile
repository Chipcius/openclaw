FROM ubuntu:25.10

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git unzip dotnet-sdk-10.0 \
    && rm -rf /var/lib/apt/lists/*

# Node 22 required by OpenClaw (engines: >=22.12.0)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash
ENV PATH="/usr/local/bin:${PATH}"

RUN useradd -m -s /bin/bash openclaw

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Copy pre-built artifacts from CI
COPY . .

ENV NODE_ENV=production
ENV OPENCLAW_PREFER_PNPM=1

USER openclaw

CMD ["node", "dist/index.js"]
