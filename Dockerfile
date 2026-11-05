# syntax=docker/dockerfile:1

# Build the PWA once, on the build machine's own platform: the output is
# plain files, the same on every architecture.
FROM --platform=$BUILDPLATFORM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build

# The server needs no packages: node:http and node:sqlite are built in.
FROM node:24-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning
WORKDIR /app
COPY package.json ./
COPY shared ./shared
COPY server ./server
COPY --from=build /app/dist ./dist
RUN rm -f server/*.test.ts && mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/main.ts"]
