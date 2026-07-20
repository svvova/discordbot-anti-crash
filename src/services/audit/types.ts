export interface SecurityEvent {
  id: string;
  guildId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  executorId?: string;
  weight: number;
  timestamp: number;
  raw: unknown;
}

export interface CorrelatedSecurityEvent extends SecurityEvent {
  executorId: string;
  auditLogEntryId: string;
}

export interface CorrelationResult {
  event: SecurityEvent;
  correlationId?: string;
  executorId?: string;
  reason?: string;
}
