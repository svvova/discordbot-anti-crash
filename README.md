# Simple Anti-Crash Bot

Production-ready open-source Discord bot that detects and mitigates server "nuke" / crash attempts by monitoring audit-log-correlated actions, scoring them, and optionally recovering deleted channels and roles.

## Features

- Audit-log correlation for all major destructive events (roles, channels, webhooks, emojis, stickers, bans, kicks, guild updates, member role updates).
- Rolling score threshold with Redis-backed atomic scoring and deduplication.
- Owner and application-owner immunity.
- Configurable punishment mode: WARN, TIMEOUT, KICK, BAN.
- Best-effort recovery of deleted channels and roles from snapshots.
- `/settings` and `/stats` slash commands (Administrator permission required).
- Structured logging, health endpoint, and Docker Compose stack.

## Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL 15+
- Redis 7+

## Discord Setup

1. Create an application at https://discord.com/developers/applications.
2. Under **OAuth2 > General**, note the **Client ID** and reset/copy the **Token**.
3. Under **OAuth2 > URL Generator**, select scopes `bot` and `applications.commands`, and bot permissions:
   - View Audit Log
   - Manage Roles
   - Manage Channels
   - Manage Webhooks
   - Kick Members
   - Ban Members
   - Moderate Members
4. Invite the bot to your server with the generated URL.

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
# Optional: register slash commands in a specific guild during development
DISCORD_DEV_GUILD_ID=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anticrash?schema=public
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

## Local Development

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm commands:deploy
pnpm dev
```

Use `DISCORD_DEV_GUILD_ID` for near-instant command updates; remove it for production to deploy commands globally (may take up to an hour).

## Docker Compose

```bash
cp .env.example .env
# fill in .env
docker compose up --build
```

The `bot` container waits for PostgreSQL and Redis healthchecks, runs Prisma migrations, and then starts the bot. A health endpoint is exposed on port `3000`.

## Production / PM2

You can also run the bot directly on a host with [PM2](https://pm2.keymetrics.io/).

Requirements:

- PostgreSQL and Redis running and reachable (use Docker Compose for them if you want: `docker compose up -d postgres redis`).
- PM2 installed globally: `pnpm add -g pm2`.

Prepare the app once:

```bash
pnpm install
pnpm build
pnpm prisma migrate deploy
pnpm commands:deploy
```

Start and manage the process:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Common commands:

```bash
pm2 logs anticrash-bot
pm2 restart anticrash-bot
pm2 stop anticrash-bot
pm2 delete anticrash-bot
```

After any code change, run `pnpm build` and then `pm2 restart anticrash-bot`.

## Commands

- `/settings view` — Show effective settings and missing bot permissions.
- `/settings threshold-set value:` — Set the score threshold.
- `/settings threshold-show` — Show the current threshold.
- `/settings logchannel-set channel:` — Set the alert log channel.
- `/settings logchannel-disable` — Disable the log channel.
- `/settings recovery-toggle enabled:` — Enable or disable recovery.
- `/settings punishment-mode mode:` — Set punishment mode.
- `/protectedroles add role:` — Add a role to the protected list for `STRIP_ROLES` punishment.
- `/protectedroles remove role:` — Remove a role from the protected list.
- `/protectedroles list` — Show protected roles.
- `/stats` — Show incident statistics for the server.
- `/language code:` — Set the bot language (`en`, `ru`, `uk`).

## How It Works

1. Gateway events are normalized into `SecurityEvent`s.
2. The correlator fetches the matching audit log entry with bounded retry/backoff.
3. If a single, reliable executor is found, the event weight is added to that user's rolling score in Redis using an atomic Lua script.
4. When the score crosses the configured threshold, a distributed lock is acquired and one punishment is applied.
5. For `CHANNEL_DELETE` and `ROLE_DELETE`, the bot attempts to restore the resource from the latest snapshot if recovery is enabled.

## Architecture

- `src/index.ts` — Bootstrap and graceful shutdown.
- `src/client.ts` — Discord client setup.
- `src/config/` — Environment validation and constants.
- `src/events/` — Gateway event adapters.
- `src/commands/` — Slash commands.
- `src/services/audit/` — Audit log correlation.
- `src/services/scoring/` — Redis score tracking and rate limiting.
- `src/services/immunity/` — Owner/team immunity.
- `src/services/punishment/` — Punishment strategies and incident persistence.
- `src/services/recovery/` — Snapshots and restore logic.
- `src/services/logging/` — Alert embeds.
- `src/infrastructure/` — Prisma, Redis, logger, health server.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
