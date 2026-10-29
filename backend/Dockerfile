FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY docker-entrypoint.sh ./docker-entrypoint.sh
USER node
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
