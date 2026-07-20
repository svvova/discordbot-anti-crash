import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const redisUrl = env.REDIS_URL;
if (!redisUrl && env.NODE_ENV !== 'test') {
  throw new Error('REDIS_URL environment variable is required to connect to Redis');
}

export const redis = new Redis(redisUrl ?? 'redis://localhost:6379', {
  retryStrategy(times: number): number {
    const delay = Math.min(times * 50, 2000);
    logger.warn({ attempt: times, delay }, 'Redis reconnecting');
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}
