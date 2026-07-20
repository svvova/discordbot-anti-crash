import { redis } from '../../infrastructure/redis.js';
import { REDIS_NAMESPACE } from '../../config/constants.js';

export async function isRateLimited(guildId: string, action: string, limit = 30, windowSeconds = 1): Promise<boolean> {
  const key = `${REDIS_NAMESPACE}:ratelimit:${guildId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, windowMs);
  const results = await pipeline.exec();
  if (!results) return false;
  const count = results[2]?.[1] as number | undefined;
  if (typeof count !== 'number') return false;
  return count > limit;
}
