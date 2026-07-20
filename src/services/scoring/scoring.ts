import { redis } from '../../infrastructure/redis.js';
import { REDIS_NAMESPACE } from '../../config/constants.js';
import { logger } from '../../infrastructure/logger.js';
import type { CorrelatedSecurityEvent } from '../audit/types.js';

const SCORE_SCRIPT = `
local key = KEYS[1]
local dedupKey = KEYS[2]
local eventId = ARGV[1]
local weight = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

if redis.call('exists', dedupKey) == 1 then
  return {-1, 0}
end

redis.call('zremrangebyscore', key, 0, now - window)
redis.call('zadd', key, now, eventId .. ':' .. weight)
redis.call('set', dedupKey, '1', 'px', ttl)
redis.call('pexpire', key, ttl)

local entries = redis.call('zrange', key, 0, -1, 'withscores')
local total = 0
for i = 1, #entries, 2 do
  local w = entries[i]:match(':(%d+)$')
  if w then total = total + tonumber(w) end
end
return {1, total}
`;

export async function addEventAndGetScore(event: CorrelatedSecurityEvent, windowSeconds: number = 60): Promise<number> {
  const key = `${REDIS_NAMESPACE}:score:${event.guildId}:${event.executorId}`;
  const dedupKey = `${REDIS_NAMESPACE}:dedup:${event.guildId}:${event.auditLogEntryId}`;
  const windowMs = windowSeconds * 1000;
  const ttlMs = Math.max(windowMs * 5, 300_000);
  const result = (await redis.eval(
    SCORE_SCRIPT,
    2,
    key,
    dedupKey,
    event.id,
    event.weight,
    windowMs,
    Date.now(),
    ttlMs
  )) as [number, number];

  logger.info(
    { eventId: event.id, auditLogEntryId: event.auditLogEntryId, weight: event.weight, result, key, dedupKey },
    'addEventAndGetScore result'
  );
  if (result[0] === -1) {
    return 0;
  }
  return result[1];
}

export async function clearScore(guildId: string, executorId: string): Promise<void> {
  const key = `${REDIS_NAMESPACE}:score:${guildId}:${executorId}`;
  await redis.del(key);
}
