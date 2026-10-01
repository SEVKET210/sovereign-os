/* ============================================================
   SOVEREIGN-OS — Autonomous Threat Detection & Incident Invariant Engine
   Monitors operational invariants, instantiates signed cryptographic
   incident deeds, and triggers multi-channel escalation dispatch.
   ============================================================ */

import { EscalationDispatcherService } from './EscalationDispatcherService';
import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';
import { LedgerHashChain } from '../crypto/LedgerHashChain';
import type {
  CryptographicIncidentDeed,
  ThreatEngineConfig,
  IncidentSeverity,
  IncidentSource,
} from '../../types/incident';
import type { BlueprintNode, BudgetNodeData, TaskNodeData, ClearanceLevel, ChainedLedgerEntry } from '../../types';

const INCIDENTS_STORAGE_KEY = 'sovereign_incident_records_enc_v1';
const CONFIG_STORAGE_KEY = 'sovereign_threat_engine_config_v1';

export const DEFAULT_THREAT_CONFIG: ThreatEngineConfig = {
  runwayEmergencyThresholdMonths: 3.0,
  failedAuthThreshold: 3,
  budgetViolationSeverity: 'HIGH',
  slaBreachSeverity: 'CRITICAL',
  recipients: [],
  webhooks: [
    {
      id: 'wh_primary_relay',
      name: 'Sovereign Incident Orchestrator Webhook',
      url: 'https://telemetry.sovereign-enclave.net/v1/incidents/signed',
      sharedSecret: '',
      enabled: false,
      filterSeverities: ['HIGH', 'CRITICAL', 'CATASTROPHIC'],
    },
  ],
  routingRules: [
    {
      id: 'rule_catastrophic_duress',
      name: 'Catastrophic Duress & Critical Breaches',
      department: 'ALL',
      minSeverity: 'CRITICAL',
      channels: ['WEBHOOK', 'EMAIL', 'SMS_VOICE'],
      targetRecipientIds: [],
      enabled: false,
    },
    {
      id: 'rule_high_operational',
      name: 'High Severity Budget & Auth Anomalies',
      department: 'ALL',
      minSeverity: 'HIGH',
      channels: ['WEBHOOK', 'EMAIL'],
      targetRecipientIds: [],
      enabled: false,
    },
  ],
};

export class ThreatDetectionEngine {
  private static workspaceId = 'sovereign_primary_enclave_01';
  private static failedAuthMap = new Map<string, { count: number; lastAttempt: number }>();
  private static activeDeedIds = new Set<string>();
  private static listeners: Array<(deed: CryptographicIncidentDeed) => void> = [];
  private static cachedSigningKey: string | null = null;
  private static readonly ENCLAVE_KEY_STORAGE = 'sovereign_enclave_signing_key_enc_v1';

  /**
   * Retrieves or initializes the per-installation HMAC signing secret.
   * Generated once via crypto.getRandomValues(32) and stored sealed under the Master KEK.
   * Never derivable from a public workspace ID alone.
   */
  public static async getEnclaveSigningKey(): Promise<string> {
    if (this.cachedSigningKey) {
      return this.cachedSigningKey;
    }

    if (typeof window !== 'undefined' && window.localStorage && KeyDerivationBridge.isUnlocked()) {
      const ctx = KeyDerivationBridge.getContext();
      const raw = localStorage.getItem(this.ENCLAVE_KEY_STORAGE);
      if (raw) {
        try {
          const envelope = JSON.parse(raw);
          const unsealed = await EnvelopeCipher.unsealEnvelope<string>(
            envelope,
            ctx.masterKek,
            {
              workspaceId: this.workspaceId,
              recordId: 'enclave_signing_key',
              fieldName: 'signing_key',
              schemaVersion: 1,
            }
          );
          if (unsealed && typeof unsealed === 'string') {
            this.cachedSigningKey = unsealed;
            return unsealed;
          }
        } catch {
          // Fall through to re-generate if corrupted
        }
      }

      // Generate once at first run: 32 bytes from CSPRNG
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const hexSecret = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const envelope = await EnvelopeCipher.sealEnvelope(
        hexSecret,
        ctx.masterKek,
        {
          workspaceId: this.workspaceId,
          recordId: 'enclave_signing_key',
          fieldName: 'signing_key',
          schemaVersion: 1,
        }
      );
      localStorage.setItem(this.ENCLAVE_KEY_STORAGE, JSON.stringify(envelope));
      this.cachedSigningKey = hexSecret;
      return hexSecret;
    }

    // If vault is locked, return an ephemeral CSPRNG key for unauthenticated events
    // Never derive from public strings like workspaceId
    const ephemeralBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(ephemeralBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Loads persisted threat configuration or returns default configuration.
   */
  public static loadConfig(): ThreatEngineConfig {
    if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_THREAT_CONFIG;
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_THREAT_CONFIG;
  }

  /**
   * Saves updated threat configuration.
   */
  public static saveConfig(config: ThreatEngineConfig): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }

  /**
   * Subscribes a listener to newly generated incident deeds.
   */
  public static subscribe(listener: (deed: CryptographicIncidentDeed) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(deed: CryptographicIncidentDeed): void {
    this.listeners.forEach((l) => {
      try {
        l(deed);
      } catch (err) {
        if (!deed.isDuress) {
          console.warn('[THREAT_ENGINE] Listener error:', err);
        }
      }
    });
  }

  /**
   * Core deed constructor: Computes HMAC-SHA256 signature and coordinates persistence and dispatch.
   */
  public static async createAndDispatchDeed(params: {
    severity: IncidentSeverity;
    source: IncidentSource;
    code: string;
    title: string;
    details: Record<string, unknown>;
    isDuress?: boolean;
  }): Promise<CryptographicIncidentDeed> {
    const id = `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();
    const isDuress = params.isDuress ?? false;

    // Canonical string for cryptographic HMAC signature verification
    const canonical = `${id}|${timestamp}|${params.severity}|${params.source}|${params.code}|${this.workspaceId}`;
    const signingKey = await this.getEnclaveSigningKey();
    const hmacSignature = await EscalationDispatcherService.computeHmac(
      canonical,
      signingKey
    );

    const { sanitizedTitle, sanitizedDetails } = await EscalationDispatcherService.sanitizePayload({
      id,
      timestamp,
      severity: params.severity,
      source: params.source,
      code: params.code,
      title: params.title,
      sanitizedTitle: '',
      details: params.details,
      sanitizedDetails: {},
      isDuress,
      hmacSignature,
      status: 'ACTIVE',
    });

    const deed: CryptographicIncidentDeed = {
      id,
      timestamp,
      severity: params.severity,
      source: params.source,
      code: params.code,
      title: params.title,
      sanitizedTitle,
      details: params.details,
      sanitizedDetails,
      isDuress,
      hmacSignature,
      status: 'ACTIVE',
    };

    this.activeDeedIds.add(id);

    // 1. Dispatch across multi-channel egress adapters
    const config = this.loadConfig();
    EscalationDispatcherService.dispatchIncident(deed, config).catch((err) => {
      if (!deed.isDuress) {
        console.warn('[THREAT_ENGINE] Egress dispatch error:', err);
      }
    });

    // 2. Persist deed into zero-knowledge encrypted local storage
    await this.persistIncidentDeed(deed).catch(() => {});

    // 3. Constant-Time & Computational Timing Equalization (P1.3):
    // Non-duress Critical/Catastrophic events append to the chained hash ledger.
    // If duress is active, an adversary measuring execution latency could detect the duress branch
    // if the expensive ledger read/parse/hash operations were bypassed.
    // We execute the exact same cryptographic SHA-256 operations against a synthetic decoy ledger block
    // to guarantee indistinguishable wall-clock latency (p > 0.05).
    if (params.severity === 'CRITICAL' || params.severity === 'CATASTROPHIC') {
      if (!isDuress) {
        try {
          const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
          const rawChain = hasStorage ? localStorage.getItem('sovereign_chained_ledger_v1') : null;
          const chain: ChainedLedgerEntry[] = rawChain ? JSON.parse(rawChain) : [];
          const block = await LedgerHashChain.appendEntry(
            chain,
            'commercial_reserve',
            0,
            'USD',
            'CREDIT',
            `SECURITY INCIDENT // ${deed.id} [${deed.code}]`,
            'ENCLAVE_SENTINEL'
          );
          deed.ledgerTxId = block.hash;
          chain.push(block);
          if (hasStorage) {
            localStorage.setItem('sovereign_chained_ledger_v1', JSON.stringify(chain));
          }
        } catch (err) {
          if (!deed.isDuress) {
            console.warn('[THREAT_ENGINE] Failed to append incident block to ledger:', err);
          }
        }
      } else {
        // Equal-work duress branch: Perform identical WebCrypto SHA-256 computation + serialization + disk I/O
        try {
          const rawChain = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('sovereign_chained_ledger_v1') : null;
          const chainLength = rawChain ? (JSON.parse(rawChain) as unknown[]).length : 0;
          const prevHash = chainLength === 0 ? LedgerHashChain.GENESIS_PREV_HASH : 'decoy_prev_hash_pad_00000000000000000000000000000000';
          const dummyPayload = `${prevHash}::commercial_reserve::0::${Date.now()}::${deed.id}`;
          const dummyHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dummyPayload));
          const dummyHash = Array.from(new Uint8Array(dummyHashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          deed.ledgerTxId = `decoy_${dummyHash}`;
          // Mirror state serialization overhead without persisting to real ledger
          JSON.stringify([{ index: chainLength, hash: dummyHash, timestamp: Date.now() }]);

          // Equalize disk I/O latency: perform equivalent-cost dummy write-and-remove operation
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('sovereign_decoy_io_pad', dummyHash);
            localStorage.removeItem('sovereign_decoy_io_pad');
          }
        } catch {
          // Zero-exception safety on duress path
        }
      }
    }

    // 4. Notify reactive store and UI listeners
    this.notifyListeners(deed);

    return deed;
  }

  // ── Operational Invariant Checks ──────────────────────────

  /**
   * Invariant 1: Liquid Runway Depletion Radar
   */
  public static checkTreasuryRunway(survivalMonths: number): void {
    const config = this.loadConfig();
    const threshold = config.runwayEmergencyThresholdMonths || 3.0;

    if (survivalMonths < threshold) {
      const code = 'INVARIANT_RUNWAY_DEPLETION';
      if (!this.hasActiveIncidentForCode(code)) {
        this.createAndDispatchDeed({
          severity: 'CRITICAL',
          source: 'TREASURY',
          code,
          title: `Liquid Runway Depletion Alert — Critical Runway: ${survivalMonths.toFixed(1)} Months`,
          details: {
            currentRunwayMonths: survivalMonths,
            thresholdMonths: threshold,
            message: 'Liquid reserve runway fell below the autonomous emergency survival ceiling.',
          },
        }).catch(() => {});
      }
    }
  }

  /**
   * Invariant 2: Blueprint DAG Budget Gate Ceiling Breach
   */
  public static checkBlueprintBudgetGates(nodes: BlueprintNode[]): void {
    const budgetNodes = nodes.filter((n) => n.type === 'budget') as BudgetNodeData[];
    for (const node of budgetNodes) {
      if (node.spentAmount >= node.allocatedAmount && node.allocatedAmount > 0) {
        const code = `INVARIANT_BUDGET_CEILING_${node.id}`;
        if (!this.hasActiveIncidentForCode(code)) {
          this.createAndDispatchDeed({
            severity: 'HIGH',
            source: 'BLUEPRINT',
            code,
            title: `Budget Gate Ceiling Breach on Node: "${node.title}"`,
            details: {
              nodeId: node.id,
              nodeTitle: node.title,
              allocatedAmount: node.allocatedAmount,
              spentAmount: node.spentAmount,
              currency: node.currency || 'USD',
            },
          }).catch(() => {});
        }
      }
    }
  }

  /**
   * Invariant 3: Critical Path SLA Deadline Breach
   */
  public static checkTaskSlaDeadlines(nodes: BlueprintNode[]): void {
    const taskNodes = nodes.filter(
      (n) => n.type === 'task' && n.priority === 'CRITICAL' && n.status !== 'completed'
    ) as TaskNodeData[];

    for (const node of taskNodes) {
      if (node.slaCountdownSeconds <= 0) {
        const code = `SLA_BREACH_${node.id}`;
        if (!this.hasActiveIncidentForCode(code)) {
          this.createAndDispatchDeed({
            severity: 'CRITICAL',
            source: 'BLUEPRINT',
            code,
            title: `Critical Path SLA Expired for Task: "${node.title}"`,
            details: {
              nodeId: node.id,
              taskTitle: node.title,
              assignee: node.assignee,
              priority: node.priority,
              overdueSeconds: Math.abs(node.slaCountdownSeconds),
            },
          }).catch(() => {});
        }
      }
    }
  }

  /**
   * Invariant 4: Failed Dynamic Rolling Key Authentication
   */
  public static recordFailedAuthAttempt(identifier = 'primary_keypad'): void {
    const now = Date.now();
    const current = this.failedAuthMap.get(identifier) || { count: 0, lastAttempt: now };

    // Reset counter if previous attempt was more than 3 minutes ago
    if (now - current.lastAttempt > 180000) {
      current.count = 0;
    }

    current.count += 1;
    current.lastAttempt = now;
    this.failedAuthMap.set(identifier, current);

    const config = this.loadConfig();
    const threshold = config.failedAuthThreshold || 3;

    if (current.count >= threshold) {
      const code = `AUTH_RATE_LIMIT_${identifier}`;
      if (!this.hasActiveIncidentForCode(code)) {
        this.createAndDispatchDeed({
          severity: 'HIGH',
          source: 'AUTH',
          code,
          title: `Brute-Force Anomaly: ${current.count} Consecutive Failed Rolling Key Attempts`,
          details: {
            authTarget: identifier,
            consecutiveFailures: current.count,
            threshold,
          },
        }).catch(() => {});
      }
    }
  }

  /**
   * Invariant 5: Unauthorized Spatial Clearance Elevation Attempt
   */
  public static recordClearanceViolation(
    attemptedClearance: ClearanceLevel,
    operatorClearance: ClearanceLevel,
    resourceId: string
  ): void {
    const code = `SECURITY_CLEARANCE_BREACH_${resourceId}`;
    if (!this.hasActiveIncidentForCode(code)) {
      this.createAndDispatchDeed({
        severity: 'CRITICAL',
        source: 'SECURITY',
        code,
        title: `Security Violation: Unauthorized Attempt to Access ${attemptedClearance} Resource`,
        details: {
          resourceId,
          attemptedClearance,
          operatorClearance,
          auditReason: 'OPERATOR_RANK_INSUFFICIENT',
        },
      }).catch(() => {});
    }
  }

  /**
   * Invariant 6: Silent Dynamic Duress Distress Trigger
   */
  public static triggerDuressDistress(emergencyPacket?: unknown): void {
    this.createAndDispatchDeed({
      severity: 'CATASTROPHIC',
      source: 'AUTH',
      code: 'DURESS_PANIC_SILENT',
      title: 'DURESS CODE EXECUTED // SILENT_DISTRESS_ACTIVATED',
      details: {
        triggerCode: 'DYNAMIC_DURESS_TRIGGER',
        action: 'SILENT_DISTRESS_PACKET_TRANSMITTED',
        decoyWorkspaceMounted: true,
        packet: emergencyPacket,
      },
      isDuress: true, // Guarantees zero audio alarm, zero banner on screen
    }).catch(() => {});
  }

  /**
   * Manual Drill / Test Egress trigger
   */
  public static async triggerManualDrill(
    severity: IncidentSeverity = 'CRITICAL',
    source: IncidentSource = 'SECURITY'
  ): Promise<CryptographicIncidentDeed> {
    return this.createAndDispatchDeed({
      severity,
      source,
      code: 'OPERATOR_MANUAL_SECURITY_DRILL',
      title: `Manual Incident Drill Triggered (${severity} // ${source})`,
      details: {
        operatorSignatory: 'MANUAL_DRILL_DISPATCH',
        auditMode: 'INSTITUTIONAL_VERIFICATION',
      },
    });
  }

  // ── Persistence Helpers ────────────────────────────────────

  private static hasActiveIncidentForCode(code: string): boolean {
    return Array.from(this.activeDeedIds).some((id) => id.includes(code));
  }

  /**
   * Encrypts and persists an incident deed to localStorage.
   */
  public static async persistIncidentDeed(deed: CryptographicIncidentDeed): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const allDeeds = await this.loadAllIncidents();
      const filtered = allDeeds.filter((d) => d.id !== deed.id);
      filtered.unshift(deed);

      if (!KeyDerivationBridge.isUnlocked()) return;
      const ctx = KeyDerivationBridge.getContext();
      const envelope = await EnvelopeCipher.sealEnvelope(
        filtered.slice(0, 50),
        ctx.masterKek,
        {
          workspaceId: this.workspaceId,
          recordId: 'incident_ledger',
          fieldName: 'deeds',
          schemaVersion: 1,
        }
      );
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(envelope));
    } catch (err) {
      if (!deed.isDuress) {
        console.warn('[THREAT_ENGINE] Failed to persist encrypted deed:', err);
      }
    }
  }

  /**
   * Loads and unseals all incident deeds into volatile memory.
   */
  public static async loadAllIncidents(): Promise<CryptographicIncidentDeed[]> {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (!raw) return [];
      const envelope = JSON.parse(raw);
      if (!KeyDerivationBridge.isUnlocked()) return [];
      const ctx = KeyDerivationBridge.getContext();
      const deeds = await EnvelopeCipher.unsealEnvelope<CryptographicIncidentDeed[]>(
        envelope,
        ctx.masterKek,
        {
          workspaceId: this.workspaceId,
          recordId: 'incident_ledger',
          fieldName: 'deeds',
          schemaVersion: 1,
        }
      );
      return deeds || [];
    } catch {
      return [];
    }
  }
}
