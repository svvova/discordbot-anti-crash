FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodebot -u 1001
COPY --from=deps --chown=nodebot:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodebot:nodejs /app/dist ./dist
COPY --from=build --chown=nodebot:nodejs /app/prisma ./prisma
COPY --from=build --chown=nodebot:nodejs /app/scripts ./scripts
COPY --from=build --chown=nodebot:nodejs /app/package.json ./package.json
USER nodebot
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok) throw new Error('unhealthy')}).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/start.sh"]
