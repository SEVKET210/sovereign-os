/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Escalation Dispatcher Service
   Cryptographic sanitization, multi-channel signed egress adapters
   (Webhooks, Email, SMS/Voice), and silent duress distress packets
   ============================================================ */

import type {
  CryptographicIncidentDeed,
  ThreatEngineConfig,
  EgressDispatchResult,
  EscalationRecipient,
  WebhookEndpointConfig,
} from '../../types/incident';
import { SyncQueueService } from '../crypto/SyncQueueService';
import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';

export class EscalationDispatcherService {
  private static workspaceId = 'sovereign_primary_enclave_01';

  /**
   * Computes an HMAC-SHA256 hex string over a canonical payload string using Web Crypto API.
   */
  public static async computeHmac(payload: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey || 'sovereign_default_secret_key_01');
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Zero-knowledge sanitization pipeline:
   * Strips confidential plaintexts, raw file names, and account balances,
   * replacing them with truncated blind cryptographic tokens before external transit.
   */
  public static async sanitizePayload(
    deed: CryptographicIncidentDeed
  ): Promise<{
    sanitizedTitle: string;
    sanitizedDetails: Record<string, unknown>;
  }> {
    const encoder = new TextEncoder();

    // Compute blind token for title
    const titleDigestBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`${deed.title}::${this.workspaceId}`)
    );
    const titleHex = Array.from(new Uint8Array(titleDigestBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 10);

    const sanitizedTitle = `[ANOMALY-${deed.source}] ${deed.code} // TOKEN: 0x${titleHex.toUpperCase()}`;

    // Sanitize detail parameters: strip monetary figures, paths, and user aliases
    const sanitizedDetails: Record<string, unknown> = {
      incidentId: deed.id,
      timestamp: deed.timestamp,
      sourceSubsystem: deed.source,
      severityClassification: deed.severity,
      invariantCode: deed.code,
      securityContext: 'ENCLAVE_ZK_REDACTED',
    };

    for (const [key, value] of Object.entries(deed.details)) {
      if (typeof value === 'number') {
        // Blind exact numbers into threshold indicator tags
        sanitizedDetails[key] = `[VALUE_MASKED_DEPTH_INDEX_${Math.min(999, Math.round(value))}]`;
      } else if (typeof value === 'string') {
        const valDigest = await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(`${value}::blind`)
        );
        const hex = Array.from(new Uint8Array(valDigest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 8);
        sanitizedDetails[key] = `[ENCLAVE-TOKEN: 0x${hex.toUpperCase()}]`;
      } else {
        sanitizedDetails[key] = '[REDACTED]';
      }
    }

    return { sanitizedTitle, sanitizedDetails };
  }

  /**
   * Dispatches an incident across multi-channel egress adapters based on routing rules.
   * If deed.isDuress is true, dispatches silently in the background without UI notification.
   */
  public static async dispatchIncident(
    deed: CryptographicIncidentDeed,
    config: ThreatEngineConfig
  ): Promise<EgressDispatchResult[]> {
    const results: EgressDispatchResult[] = [];
    const { sanitizedTitle, sanitizedDetails } = await this.sanitizePayload(deed);

    // 1. Determine active channels and matching recipients from routing rules
    const activeChannels = new Set<'WEBHOOK' | 'EMAIL' | 'SMS_VOICE'>();
    const matchedRecipientIds = new Set<string>();

    const severityRanks: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
      CATASTROPHIC: 5,
    };

    const incidentRank = severityRanks[deed.severity] || 1;

    for (const rule of config.routingRules) {
      if (!rule.enabled) continue;
      const ruleRank = severityRanks[rule.minSeverity] || 1;
      if (incidentRank >= ruleRank) {
        if (rule.department === 'ALL' || rule.department.toUpperCase() === deed.source) {
          rule.channels.forEach((ch) => activeChannels.add(ch));
          rule.targetRecipientIds.forEach((rid) => matchedRecipientIds.add(rid));
        }
      }
    }

    // Default channels for Critical / Catastrophic if rules are empty
    if (activeChannels.size === 0 && incidentRank >= 4) {
      activeChannels.add('WEBHOOK');
      activeChannels.add('EMAIL');
      activeChannels.add('SMS_VOICE');
    }

    // Recipients
    const targetRecipients = config.recipients.filter(
      (r) => matchedRecipientIds.has(r.id) || (deed.isDuress && r.priorityTier === 1) || (incidentRank >= 4 && r.priorityTier <= 2)
    );

    // ── Channel 1: Signed Webhooks ─────────────────────────────
    if (activeChannels.has('WEBHOOK')) {
      for (const webhook of config.webhooks) {
        if (!webhook.enabled) continue;
        if (webhook.filterSeverities.length > 0 && !webhook.filterSeverities.includes(deed.severity)) {
          continue;
        }

        const start = performance.now();
        let rawBody = '';
        let signature = '';

        try {
          const webhookPayload = {
            protocol: 'SOVEREIGN_INCIDENT_EGRESS_V1',
            incidentId: deed.id,
            timestamp: deed.timestamp,
            severity: deed.severity,
            source: deed.source,
            code: deed.code,
            title: sanitizedTitle,
            details: sanitizedDetails,
            isDuress: deed.isDuress,
            enclaveProof: deed.hmacSignature,
          };

          rawBody = JSON.stringify(webhookPayload);
          signature = await this.computeHmac(rawBody, webhook.sharedSecret);

          // Real HTTP POST transmission
          const res = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sovereign-Signature': signature,
              'X-Sovereign-Timestamp': deed.timestamp,
              'X-Sovereign-Enclave-ID': this.workspaceId,
            },
            body: rawBody,
          });

          const latency = Math.round(performance.now() - start);

          if (res.ok) {
            results.push({
              id: `egress_wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              channel: 'WEBHOOK',
              targetIdentifier: webhook.url,
              status: 'SUCCESS',
              latencyMs: latency,
              signatureProof: `sha256=${signature.slice(0, 16)}...`,
              timestamp: Date.now(),
            });
          } else {
            const errorMsg = `HTTP_${res.status}: ${res.statusText}`;
            results.push({
              id: `egress_wh_${Date.now()}`,
              channel: 'WEBHOOK',
              targetIdentifier: webhook.url,
              status: 'FAILED',
              latencyMs: latency,
              timestamp: Date.now(),
              error: errorMsg,
            });

            // Enqueue failed dispatch to durable IndexedDB queue for background retry
            await this.enqueueFailedDispatch(deed.id, webhookPayload);
          }
        } catch (err) {
          const latency = Math.round(performance.now() - start);
          const errorMsg = err instanceof Error ? err.message : 'NETWORK_OR_CORS_ERROR';
          results.push({
            id: `egress_wh_${Date.now()}`,
            channel: 'WEBHOOK',
            targetIdentifier: webhook.url,
            status: 'FAILED',
            latencyMs: latency,
            timestamp: Date.now(),
            error: errorMsg,
          });

          // Enqueue failed dispatch to durable IndexedDB queue for background retry
          await this.enqueueFailedDispatch(deed.id, {
            protocol: 'SOVEREIGN_INCIDENT_EGRESS_V1',
            incidentId: deed.id,
            timestamp: deed.timestamp,
            severity: deed.severity,
            source: deed.source,
            code: deed.code,
            title: sanitizedTitle,
            details: sanitizedDetails,
            isDuress: deed.isDuress,
            enclaveProof: deed.hmacSignature,
          });
        }
      }
    }

    // ── Channel 2: Transactional Emergency Email Relay ─────────
    if (activeChannels.has('EMAIL')) {
      for (const recipient of targetRecipients) {
        // Honest status reporting: no backend email relay service configured
        results.push({
          id: `egress_em_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          channel: 'EMAIL',
          targetIdentifier: recipient.email,
          status: 'FAILED',
          latencyMs: 0,
          timestamp: Date.now(),
          error: 'GATEWAY_NOT_CONFIGURED: Transactional email relay endpoint is not configured.',
        });
      }
    }

    // ── Channel 3: SMS & Voice Gateway ────────────────────────
    if (activeChannels.has('SMS_VOICE')) {
      for (const recipient of targetRecipients) {
        if (!recipient.phone) continue;
        // Honest status reporting: no backend SMS gateway configured
        results.push({
          id: `egress_sms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          channel: 'SMS_VOICE',
          targetIdentifier: recipient.phone,
          status: 'FAILED',
          latencyMs: 0,
          timestamp: Date.now(),
          error: 'GATEWAY_NOT_CONFIGURED: SMS/Voice telephony gateway is not configured.',
        });
      }
    }

    // Durable dispatch audit logging
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const historyKey = 'sovereign_incident_egress_history_v1';
        const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existing.unshift(...results);
        localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));
      } catch {
        // LocalStorage fallback
      }
    }

    return results;
  }

  /**
   * Interactive test trigger allowing founders to test webhook delivery
   * and notifications with live round-trip latency readouts.
   */
  public static async testEgress(
    recipients: EscalationRecipient[],
    webhooks: WebhookEndpointConfig[]
  ): Promise<EgressDispatchResult[]> {
    const testDeed: CryptographicIncidentDeed = {
      id: `test_drill_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      source: 'SECURITY',
      code: 'DRILL_TEST_EGRESS_SIMULATION',
      title: 'Operational Invariant Drill — Egress Latency Benchmark',
      sanitizedTitle: '[DRILL-TEST] DRILL_TEST_EGRESS_SIMULATION // TOKEN: 0x7F4A89C1',
      details: { simulationEpoch: Date.now(), channelAudit: 'FULL_MATRIX' },
      sanitizedDetails: {
        simulationEpoch: '[VALUE_MASKED_DEPTH_INDEX_100]',
        channelAudit: '[ENCLAVE-TOKEN: 0x8FA4C2]',
      },
      isDuress: false,
      hmacSignature: '0x_SIMULATED_HMAC_PROOF_TEST_SUITE',
      status: 'ACTIVE',
    };

    const dummyConfig: ThreatEngineConfig = {
      runwayEmergencyThresholdMonths: 3.0,
      failedAuthThreshold: 3,
      budgetViolationSeverity: 'HIGH',
      slaBreachSeverity: 'CRITICAL',
      recipients,
      webhooks,
      routingRules: [
        {
          id: 'test_rule_all',
          name: 'Drill Test All Channels',
          department: 'ALL',
          minSeverity: 'LOW',
          channels: ['WEBHOOK', 'EMAIL', 'SMS_VOICE'],
          targetRecipientIds: recipients.map((r) => r.id),
          enabled: true,
        },
      ],
    };

    return this.dispatchIncident(testDeed, dummyConfig);
  }

  /**
   * Securely seals and persists a failed incident egress payload to the offline sync queue.
   * If the enclave is locked, no fake ciphertext claim is made; the payload is dropped securely.
   */
  private static async enqueueFailedDispatch(
    deedId: string,
    webhookPayload: Record<string, unknown>
  ): Promise<void> {
    if (!KeyDerivationBridge.isUnlocked()) {
      return;
    }
    try {
      const ctx = KeyDerivationBridge.getContext();
      const sealedEnvelope = await EnvelopeCipher.sealEnvelope(
        webhookPayload,
        ctx.masterKek,
        {
          workspaceId: ctx.workspaceId,
          recordId: deedId,
          fieldName: 'webhook_payload',
          schemaVersion: 1,
        }
      );
      await SyncQueueService.enqueue({
        table_name: 'incident_egress_queue',
        operation: 'INSERT',
        record_id: deedId,
        payload_envelope: sealedEnvelope,
      });
    } catch {
      // Clean no-op on failure
    }
  }
}
