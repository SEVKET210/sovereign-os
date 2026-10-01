/* ============================================================
   SOVEREIGN-OS — Cryptographic Incident & Emergency Escalation Types
   Standardized contracts for threat detection, zero-knowledge
   sanitization, multi-channel signed egress, and governance
   ============================================================ */

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'CATASTROPHIC';

export type IncidentSource =
  | 'TREASURY'
  | 'BLUEPRINT'
  | 'AUTH'
  | 'VAULT'
  | 'COMMS'
  | 'SECURITY';

export type IncidentStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface CryptographicIncidentDeed {
  id: string; // e.g. inc_178903...
  timestamp: string; // ISO UTC
  severity: IncidentSeverity;
  source: IncidentSource;
  code: string; // e.g. INVARIANT_RUNWAY_DEPLETION, INVARIANT_BUDGET_CEILING, SLA_BREACH, AUTH_RATE_LIMIT, SECURITY_CLEARANCE_BREACH, DURESS_PANIC_SILENT
  title: string;
  sanitizedTitle: string; // stripped of plaintexts for ZK egress
  details: Record<string, unknown>;
  sanitizedDetails: Record<string, unknown>; // blinded tokens, zero raw amounts
  isDuress: boolean; // true for silent duress alarm -> silent, no audio/visual alert on UI
  hmacSignature: string; // HMAC-SHA256 computed over canonical string
  status: IncidentStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  ledgerTxId?: string; // hash of chained ledger block if committed
}

export interface EscalationRecipient {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string; // E.164 format (+1..., +90..., etc.)
  verified: boolean;
  priorityTier: 1 | 2 | 3; // 1 = Founder/Exec, 2 = Team Lead, 3 = On-call engineer
}

export interface WebhookEndpointConfig {
  id: string;
  name: string;
  url: string;
  sharedSecret: string; // shared key used to compute X-Sovereign-Signature HMAC-SHA256
  customHeaders?: Record<string, string>;
  enabled: boolean;
  filterSeverities: IncidentSeverity[];
}

export interface EscalationRoutingRule {
  id: string;
  name: string;
  department: string | 'ALL';
  minSeverity: IncidentSeverity;
  channels: Array<'WEBHOOK' | 'EMAIL' | 'SMS_VOICE'>;
  targetRecipientIds: string[];
  enabled: boolean;
}

export interface ThreatEngineConfig {
  runwayEmergencyThresholdMonths: number; // default 3.0 months
  failedAuthThreshold: number; // default 3 consecutive failures
  budgetViolationSeverity: IncidentSeverity; // default HIGH
  slaBreachSeverity: IncidentSeverity; // default CRITICAL
  recipients: EscalationRecipient[];
  webhooks: WebhookEndpointConfig[];
  routingRules: EscalationRoutingRule[];
}

export interface EgressDispatchResult {
  id: string;
  channel: 'WEBHOOK' | 'EMAIL' | 'SMS_VOICE';
  targetIdentifier: string; // URL, email, or masked phone
  status: 'SUCCESS' | 'QUEUED' | 'FAILED';
  latencyMs: number;
  signatureProof?: string;
  timestamp: number;
  error?: string;
}
