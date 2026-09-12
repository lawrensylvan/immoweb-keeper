FROM node:22-bookworm-slim AS client-build

WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim AS server-dependencies

WORKDIR /app/server
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=server-dependencies --chown=node:node /app/server/node_modules ./node_modules
COPY --chown=node:node server/ ./
COPY --from=client-build --chown=node:node /build/client/build /app/client/build

RUN mkdir -p routine/logs && chown -R node:node routine/logs

USER node
EXPOSE 5000
CMD ["node", "src/index.js"]
