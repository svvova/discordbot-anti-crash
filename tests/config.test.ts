import { describe, it, expect } from 'vitest';
import { AuditActionWeights, DEFAULT_THRESHOLD, DEFAULT_WINDOW_SECONDS, PunishmentMode } from '../src/config/constants.js';

describe('config constants', () => {
  it('has positive weights for destructive actions', () => {
    expect(AuditActionWeights.CHANNEL_DELETE).toBeGreaterThan(0);
    expect(AuditActionWeights.ROLE_DELETE).toBeGreaterThan(0);
    expect(AuditActionWeights.MEMBER_BAN_ADD).toBeGreaterThan(0);
  });

  it('defines all punishment modes', () => {
    expect(Object.values(PunishmentMode)).toContain('WARN');
    expect(Object.values(PunishmentMode)).toContain('TIMEOUT');
    expect(Object.values(PunishmentMode)).toContain('KICK');
    expect(Object.values(PunishmentMode)).toContain('BAN');
  });

  it('has reasonable defaults', () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThan(0);
    expect(DEFAULT_WINDOW_SECONDS).toBeGreaterThan(0);
  });
});
