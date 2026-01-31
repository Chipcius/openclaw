FROM ubuntu:25.10

# Base system packages + development tools
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      # Core
      ca-certificates curl gnupg git unzip \
      # Languages & SDKs
      dotnet-sdk-10.0 openssh-client golang-go rustc cargo zig \
      # Essential CLI tools (P0)
      jq python3-pip less tree file wget zip gettext-base \
      # Development tools (P1)
      build-essential sqlite3 postgresql-client \
      # DevOps & debugging (P2)
      htop rsync netcat-openbsd dnsutils iputils-ping \
      # Media processing (for Maven)
      ffmpeg imagemagick \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

# Node 22 required by OpenClaw (engines: >=22.12.0)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Bun runtime
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
