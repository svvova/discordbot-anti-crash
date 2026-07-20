# Contributing

Thank you for your interest in improving this project!

## Setup

1. Fork and clone the repository.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env` and set your Discord bot token.
4. Start PostgreSQL and Redis (e.g. `docker compose up postgres redis -d`).
5. Run `pnpm prisma migrate deploy` and `pnpm commands:deploy`.
6. Use `pnpm dev` to run the bot in watch mode.

## Pull Request Process

1. Open an issue first for large changes or new features.
2. Create a feature branch from `main`.
3. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
4. Add tests for new behavior when possible.
5. Keep changes focused and well-scoped.

## Code Style

- TypeScript strict mode is enabled; avoid `any`.
- Prefer explicit return types on exported functions.
- Use structured logging via `pino`; do not use `console.log`.
- Do not log secrets.

## Security

If you discover a security vulnerability, please open a private security advisory on GitHub or email the maintainers directly. Do not open public issues for security bugs.
