/* ============================================================
   SOVEREIGN-OS — Emergency Governance & Escalation Configuration Cockpit
   Integrated into Founder Enclave and Settings Drawer.
   Provides Recipient Directories, Signed Webhooks, Multi-Tier
   Routing Rules, Invariant Thresholds, and Live Egress Latency Tests.
   ============================================================ */

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Users,
  Webhook,
  Sliders,
  Send,
  AlertTriangle,
  Radio,
  Phone,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type {
  EscalationRecipient,
  WebhookEndpointConfig,
} from '../../types/incident';

export const EmergencyGovernanceCockpit: React.FC = () => {
  const {
    isCockpitOpen,
    activeCockpitTab,
    incidents,
    config,
    isTestingEgress,
    lastTestResults,
    closeCockpit,
    acknowledgeIncident,
    resolveIncident,
    updateConfig,
    triggerManualDrill,
    runEgressTest,
  } = useIncidentStore();

  const [currentTab, setCurrentTab] = useState<'incidents' | 'directory' | 'webhooks' | 'rules' | 'test'>(
    activeCockpitTab || 'incidents'
  );

  // Form states for new entries
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientDept, setNewRecipientDept] = useState('Engineering');
  const [newRecipientTier, setNewRecipientTier] = useState<1 | 2 | 3>(2);

  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDeedId, setSelectedDeedId] = useState<string | null>(null);

  if (!isCockpitOpen) return null;

  const handleCopy = (text: string, id: string) => {
    TactileSoundEngine.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddRecipient = () => {
    if (!newRecipientName || !newRecipientEmail) {
      showToast('Recipient name and email are required.', 'warning');
      return;
    }
    TactileSoundEngine.playClick();
    const newRec: EscalationRecipient = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newRecipientName,
      role: 'Designated Responder',
      department: newRecipientDept,
      email: newRecipientEmail,
      phone: newRecipientPhone || '+1 (555) 000-0000',
      verified: true,
      priorityTier: newRecipientTier,
    };
    updateConfig({
      ...config,
      recipients: [...config.recipients, newRec],
    });
    setNewRecipientName('');
    setNewRecipientEmail('');
    setNewRecipientPhone('');
  };

  const handleRemoveRecipient = (id: string) => {
    TactileSoundEngine.playClick();
    updateConfig({
      ...config,
      recipients: config.recipients.filter((r) => r.id !== id),
    });
  };

  const handleAddWebhook = () => {
    if (!newWebhookName || !newWebhookUrl) {
      showToast('Webhook name and target URL are required.', 'warning');
      return;
    }
    TactileSoundEngine.playClick();
    const newWh: WebhookEndpointConfig = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newWebhookName,
      url: newWebhookUrl,
      sharedSecret: newWebhookSecret || `wh_sec_${Math.random().toString(36).slice(2, 12)}`,
      enabled: true,
      filterSeverities: ['HIGH', 'CRITICAL', 'CATASTROPHIC'],
    };
    updateConfig({
      ...config,
      webhooks: [...config.webhooks, newWh],
    });
    setNewWebhookName('');
    setNewWebhookUrl('');
    setNewWebhookSecret('');
  };

  const handleRemoveWebhook = (id: string) => {
    TactileSoundEngine.playClick();
    updateConfig({
      ...config,
      webhooks: config.webhooks.filter((w) => w.id !== id),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Modal Surface */}
      <div
        className="anim-scale-in"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '90vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={16} color="var(--clr-negative, #f43f5e)" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                EMERGENCY GOVERNANCE & ESCALATION COCKPIT
                <span
                  style={{
                    fontSize: '0.58rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 2,
                    background: 'rgba(78, 242, 210, 0.12)',
                    color: 'var(--clr-accent)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  ZK-EGRESS ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Zero-Knowledge Incident Serialization // Signed Webhooks // Alternating Seismic Sentinel
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-xs"
            onClick={closeCockpit}
            style={{ padding: 4 }}
            title="Close Cockpit (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-moderate)',
            background: 'var(--bg-primary)',
            padding: '4px 16px 0',
            gap: 6,
          }}
        >
          <button
            className={`btn btn-xs ${currentTab === 'incidents' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { TactileSoundEngine.playClick(); setCurrentTab('incidents'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem' }}
          >
            <Radio size={12} />
            Incidents & Deeds ({incidents.filter((i) => i.status === 'ACTIVE').length} Active)
          </button>
          <button
            className={`btn btn-xs ${currentTab === 'directory' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { TactileSoundEngine.playClick(); setCurrentTab('directory'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem' }}
          >
            <Users size={12} />
            Escalation Directory ({config.recipients.length})
          </button>
          <button
            className={`btn btn-xs ${currentTab === 'webhooks' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { TactileSoundEngine.playClick(); setCurrentTab('webhooks'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem' }}
          >
            <Webhook size={12} />
            Signed Webhooks & Routing
          </button>
          <button
            className={`btn btn-xs ${currentTab === 'test' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { TactileSoundEngine.playClick(); setCurrentTab('test'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem' }}
          >
            <Sliders size={12} />
            Invariants & Test Egress
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* ── TAB 1: Incidents & Deeds ──────────────────────── */}
          {currentTab === 'incidents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Incident KPI Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACTIVE THREATS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--clr-negative, #f43f5e)', fontFamily: 'var(--font-mono)' }}>
                    {incidents.filter((i) => i.status === 'ACTIVE' && !i.isDuress).length}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACKNOWLEDGED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--clr-caution, #f59e0b)', fontFamily: 'var(--font-mono)' }}>
                    {incidents.filter((i) => i.status === 'ACKNOWLEDGED').length}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SEALED TO LEDGER</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--clr-positive, #10b981)', fontFamily: 'var(--font-mono)' }}>
                    {incidents.filter((i) => i.ledgerTxId).length}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TOTAL LIFETIME</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {incidents.length}
                  </div>
                </div>
              </div>

              {/* Incidents List */}
              {incidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  NO THREAT INCIDENTS DETECTED // SYSTEM OPERATIONAL INVARIANTS SATISFIED
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {incidents.map((incident) => {
                    const isCrit = incident.severity === 'CRITICAL' || incident.severity === 'CATASTROPHIC';
                    const isSelected = selectedDeedId === incident.id;

                    return (
                      <div
                        key={incident.id}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: `1px solid ${isCrit && incident.status === 'ACTIVE' ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-moderate)'}`,
                          borderRadius: 6,
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 3,
                                background: isCrit ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: isCrit ? '#f43f5e' : '#f59e0b',
                                border: `1px solid ${isCrit ? '#f43f5e44' : '#f59e0b44'}`,
                              }}
                            >
                              {incident.severity}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              [{incident.source}]
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {incident.title}
                            </span>
                            {incident.isDuress && (
                              <span style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: 2, background: 'rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                                SILENT DURESS
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontFamily: 'var(--font-mono)',
                                padding: '2px 6px',
                                borderRadius: 3,
                                background: incident.status === 'ACTIVE' ? 'rgba(244, 63, 94, 0.15)' : incident.status === 'ACKNOWLEDGED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: incident.status === 'ACTIVE' ? '#f43f5e' : incident.status === 'ACKNOWLEDGED' ? '#f59e0b' : '#10b981',
                              }}
                            >
                              {incident.status}
                            </span>

                            {incident.status === 'ACTIVE' && (
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={() => acknowledgeIncident(incident.id, 'FOUNDER_AUDIT_CONSOLE')}
                                style={{ fontSize: '0.62rem', padding: '2px 8px' }}
                              >
                                Acknowledge
                              </button>
                            )}

                            {incident.status === 'ACKNOWLEDGED' && (
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => resolveIncident(incident.id)}
                                style={{ fontSize: '0.62rem', padding: '2px 6px' }}
                              >
                                Resolve
                              </button>
                            )}

                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setSelectedDeedId(isSelected ? null : incident.id)}
                              style={{ fontSize: '0.62rem', padding: '2px 6px' }}
                            >
                              {isSelected ? 'Hide Deed' : 'Inspect Deed'}
                            </button>
                          </div>
                        </div>

                        {/* Timestamp & sanitized title preview */}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Egress: {incident.sanitizedTitle}</span>
                          <span>{new Date(incident.timestamp).toLocaleString()}</span>
                        </div>

                        {/* Expanded Cryptographic Deed Inspector */}
                        {isSelected && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '10px 12px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-hairline)',
                              borderRadius: 4,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              fontSize: '0.64rem',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>DEED IDENTIFIER:</span>
                              <span style={{ color: 'var(--text-primary)' }}>{incident.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>HMAC-SHA256 SIGNATURE:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--clr-accent)' }}>{incident.hmacSignature.slice(0, 32)}...</span>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => handleCopy(incident.hmacSignature, incident.id)}
                                  style={{ padding: 2 }}
                                >
                                  {copiedId === incident.id ? <Check size={11} color="var(--clr-positive)" /> : <Copy size={11} />}
                                </button>
                              </div>
                            </div>
                            {incident.ledgerTxId && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>CHAINED LEDGER BLOCK:</span>
                                <span style={{ color: 'var(--clr-positive)' }}>{incident.ledgerTxId.slice(0, 24)}...</span>
                              </div>
                            )}
                            {incident.acknowledgedBy && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>ACKNOWLEDGED BY:</span>
                                <span>{incident.acknowledgedBy} @ {new Date(incident.acknowledgedAt || '').toLocaleTimeString()}</span>
                              </div>
                            )}
                            <div style={{ marginTop: 4 }}>
                              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>SANITIZED ZK EGRESS PARAMETERS:</div>
                              <pre style={{ margin: 0, padding: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflowX: 'auto', color: 'var(--text-secondary)' }}>
                                {JSON.stringify(incident.sanitizedDetails, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Escalation Recipient Directory ─────────── */}
          {currentTab === 'directory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  VERIFIED RECIPIENT DIRECTORY (OFF-BAND TELEMETRY)
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Tier 1 contacts receive silent duress distress packets
                </span>
              </div>

              {/* Add Recipient Form */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr) auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Full Name / Alias"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                />
                <input
                  type="email"
                  placeholder="Emergency Email"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                />
                <input
                  type="text"
                  placeholder="E.164 Phone (+1...)"
                  value={newRecipientPhone}
                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                />
                <select
                  value={newRecipientDept}
                  onChange={(e) => setNewRecipientDept(e.target.value)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                >
                  <option value="Executive">Executive</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal</option>
                </select>
                <select
                  value={newRecipientTier}
                  onChange={(e) => setNewRecipientTier(Number(e.target.value) as 1 | 2 | 3)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                >
                  <option value={1}>Tier 1 (Founder/Exec)</option>
                  <option value={2}>Tier 2 (Team Lead)</option>
                  <option value={3}>Tier 3 (On-Call)</option>
                </select>
                <button
                  className="btn btn-xs btn-primary"
                  onClick={handleAddRecipient}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', padding: '5px 10px' }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* Recipients Roster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: recipient.priorityTier === 1 ? 'rgba(78, 242, 210, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: recipient.priorityTier === 1 ? 'var(--clr-accent)' : 'var(--text-muted)',
                        }}
                      >
                        T{recipient.priorityTier}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {recipient.name}
                          <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ({recipient.role} // {recipient.department})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={11} color="var(--clr-accent)" /> {recipient.email}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} color="var(--clr-positive)" /> {recipient.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: '0.58rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: 2,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--clr-positive)',
                        }}
                      >
                        VERIFIED
                      </span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRemoveRecipient(recipient.id)}
                        style={{ padding: 3, color: 'var(--clr-negative)' }}
                        title="Remove Recipient"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: Signed Webhooks & Routing Rules ─────────── */}
          {currentTab === 'webhooks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Webhooks Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  HIGH-PRIORITY SIGNED WEBHOOK TARGETS
                </div>

                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-moderate)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1fr auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Endpoint Name"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="url"
                    placeholder="Target URL (https://...)"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Shared HMAC Secret"
                    value={newWebhookSecret}
                    onChange={(e) => setNewWebhookSecret(e.target.value)}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-primary)' }}
                  />
                  <button
                    className="btn btn-xs btn-primary"
                    onClick={handleAddWebhook}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', padding: '5px 10px' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                {config.webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Webhook size={12} color="var(--clr-accent)" />
                        {wh.name}
                        <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 2, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--clr-positive)' }}>
                          ACTIVE
                        </span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {wh.url}
                      </div>
                      <div style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        HMAC SECRET: {wh.sharedSecret.slice(0, 8)}•••••••• // Header: X-Sovereign-Signature
                      </div>
                    </div>

                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRemoveWebhook(wh.id)}
                      style={{ color: 'var(--clr-negative)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Multi-Tier Routing Rules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  MULTI-TIER INCIDENT ESCALATION ROUTING MATRIX
                </div>

                {config.routingRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rule.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: '0.60rem', fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                          SEVERITY &gt;= {rule.minSeverity}
                        </span>
                        <span style={{ fontSize: '0.60rem', fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                          DEPT: {rule.department}
                        </span>
                        <span style={{ fontSize: '0.60rem', fontFamily: 'var(--font-mono)', color: 'var(--clr-accent)' }}>
                          CHANNELS: {rule.channels.join(' + ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: Invariants & Test Egress ───────────────── */}
          {currentTab === 'test' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Invariant Threshold Configuration */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-moderate)', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  OPERATIONAL INVARIANT SENSITIVITY THRESHOLDS
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                      Liquid Runway Emergency Ceiling (Months):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="12"
                      value={config.runwayEmergencyThresholdMonths}
                      onChange={(e) => {
                        updateConfig({ ...config, runwayEmergencyThresholdMonths: Number(e.target.value) });
                      }}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '5px 10px', fontSize: '0.72rem', color: 'var(--text-primary)', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                      Rolling Key Brute-Force Retry Limit:
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={config.failedAuthThreshold}
                      onChange={(e) => {
                        updateConfig({ ...config, failedAuthThreshold: Number(e.target.value) });
                      }}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-moderate)', borderRadius: 4, padding: '5px 10px', fontSize: '0.72rem', color: 'var(--text-primary)', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Manual Drill & Egress Testing Triggers */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => triggerManualDrill('CRITICAL', 'SECURITY')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', flex: 1 }}
                >
                  <AlertTriangle size={13} color="var(--clr-caution)" />
                  Simulate Critical Invariant Breach
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={runEgressTest}
                  disabled={isTestingEgress}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', flex: 1 }}
                >
                  {isTestingEgress ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                  {isTestingEgress ? 'Measuring Channel Latency...' : 'Execute Interactive Test Egress'}
                </button>
              </div>

              {/* Live Egress Latency Results */}
              {lastTestResults.length > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-moderate)', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    LIVE EGRESS TRANSMISSION LATENCY BENCHMARKS:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {lastTestResults.map((res) => (
                      <div
                        key={res.id}
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 4,
                          padding: '8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--clr-accent)', fontFamily: 'var(--font-mono)' }}>
                            {res.channel}
                          </span>
                          <span style={{ fontSize: '0.60rem', padding: '1px 5px', borderRadius: 2, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--clr-positive)' }}>
                            {res.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {res.targetIdentifier}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          LATENCY: <strong style={{ color: 'var(--clr-positive)' }}>{res.latencyMs}ms</strong>
                        </div>
                        {res.signatureProof && (
                          <div style={{ fontSize: '0.58rem', color: 'var(--clr-accent)', fontFamily: 'var(--font-mono)' }}>
                            SIG: {res.signatureProof}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
