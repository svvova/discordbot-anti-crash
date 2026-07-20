import http from 'node:http';
import { prisma } from './prisma.js';
import { redis } from './redis.js';
import { logger } from './logger.js';

let server: http.Server | null = null;

export function startHealthServer(port = 3000): void {
  server = http
    .createServer(async (req, res) => {
      if (req.url === '/health') {
        try {
          await prisma.$queryRaw`SELECT 1`;
          await redis.ping();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch (err) {
          logger.error({ err }, 'Health check failed');
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'unhealthy' }));
        }
        return;
      }
      res.writeHead(404);
      res.end();
    })
    .listen(port, () => {
      logger.info({ port }, 'Health server listening');
    });
}

export async function stopHealthServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
}
