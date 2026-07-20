import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addEventAndGetScore, clearScore } from '../src/services/scoring/scoring.js';
import { redis } from '../src/infrastructure/redis.js';

vi.mock('../src/infrastructure/redis.js', () => ({
  redis: {
    eval: vi.fn(),
    del: vi.fn(),
  },
}));

describe('scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns score from lua script', async () => {
    vi.mocked(redis.eval).mockResolvedValue([1, 42]);

    const score = await addEventAndGetScore({
      id: 'evt-1',
      guildId: 'g1',
      executorId: 'u1',
      auditLogEntryId: 'a1',
      action: 'CHANNEL_DELETE',
      resourceType: 'CHANNEL',
      resourceId: 'c1',
      weight: 20,
      timestamp: Date.now(),
      raw: {},
    });

    expect(score).toBe(42);
  });

  it('returns 0 when event is a duplicate', async () => {
    vi.mocked(redis.eval).mockResolvedValue([-1, 0]);

    const score = await addEventAndGetScore({
      id: 'evt-2',
      guildId: 'g1',
      executorId: 'u1',
      auditLogEntryId: 'a2',
      action: 'CHANNEL_DELETE',
      resourceType: 'CHANNEL',
      resourceId: 'c2',
      weight: 20,
      timestamp: Date.now(),
      raw: {},
    });

    expect(score).toBe(0);
  });

  it('clears score key', async () => {
    vi.mocked(redis.del).mockResolvedValue(1);
    await clearScore('g1', 'u1');
    expect(redis.del).toHaveBeenCalledWith('anticrash:score:g1:u1');
  });
});
