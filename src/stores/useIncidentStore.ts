/* ============================================================
   SOVEREIGN-OS — Threat Incident & Emergency Escalation Store
   Central authority for active incident deeds, seismic alarm coordination,
   acknowledgment audit trail, and escalation governance cockpit
   ============================================================ */

import { create } from 'zustand';
import { ThreatDetectionEngine, DEFAULT_THREAT_CONFIG } from '../services/security/ThreatDetectionEngine';
import { EscalationDispatcherService } from '../services/security/EscalationDispatcherService';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { LedgerHashChain } from '../services/crypto/LedgerHashChain';
import { showToast } from '../components/Toast';
import type {
  CryptographicIncidentDeed,
  ThreatEngineConfig,
  EgressDispatchResult,
  IncidentSeverity,
  IncidentSource,
} from '../types/incident';
import type { ChainedLedgerEntry } from '../types';

interface IncidentState {
  incidents: CryptographicIncidentDeed[];
  config: ThreatEngineConfig;
  isCockpitOpen: boolean;
  activeCockpitTab: 'incidents' | 'directory' | 'webhooks' | 'rules' | 'test';
  selectedIncidentId: string | null;
  isTestingEgress: boolean;
  lastTestResults: EgressDispatchResult[];
  isAlarmPlaying: boolean;

  // Actions
  initialize: () => Promise<void>;
  reportIncident: (deed: CryptographicIncidentDeed) => void;
  acknowledgeIncident: (id: string, signatory?: string) => Promise<void>;
  resolveIncident: (id: string) => Promise<void>;
  updateConfig: (config: ThreatEngineConfig) => void;
  openCockpit: (tab?: 'incidents' | 'directory' | 'webhooks' | 'rules' | 'test') => void;
  closeCockpit: () => void;
  setSelectedIncidentId: (id: string | null) => void;
  triggerManualDrill: (severity?: IncidentSeverity, source?: IncidentSource) => Promise<void>;
  runEgressTest: () => Promise<void>;
  silenceAlarm: () => void;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  config: DEFAULT_THREAT_CONFIG,
  isCockpitOpen: false,
  activeCockpitTab: 'incidents',
  selectedIncidentId: null,
  isTestingEgress: false,
  lastTestResults: [],
  isAlarmPlaying: false,

  initialize: async () => {
    const config = ThreatDetectionEngine.loadConfig();
    const persistedIncidents = await ThreatDetectionEngine.loadAllIncidents();

    set({ config, incidents: persistedIncidents });

    // Check if there is an active unacknowledged critical/catastrophic incident
    const hasUnacknowledgedCritical = persistedIncidents.some(
      (inc) =>
        (inc.severity === 'CRITICAL' || inc.severity === 'CATASTROPHIC') &&
        inc.status === 'ACTIVE' &&
        !inc.isDuress
    );

    if (hasUnacknowledgedCritical) {
      TactileSoundEngine.startEmergencySeismicAlarm();
      set({ isAlarmPlaying: true });
    }

    // Subscribe to real-time engine dispatch events
    ThreatDetectionEngine.subscribe((deed) => {
      get().reportIncident(deed);
    });
  },

  reportIncident: (deed: CryptographicIncidentDeed) => {
    set((state) => {
      const filtered = state.incidents.filter((i) => i.id !== deed.id);
      return { incidents: [deed, ...filtered] };
    });

    // Start seismic alarm sequence for Critical/Catastrophic non-duress events
    if ((deed.severity === 'CRITICAL' || deed.severity === 'CATASTROPHIC') && !deed.isDuress) {
      TactileSoundEngine.startEmergencySeismicAlarm();
      set({ isAlarmPlaying: true });
      showToast(`CRITICAL THREAT DETECTED: [${deed.code}] ${deed.sanitizedTitle}`, 'error');
    }
  },

  acknowledgeIncident: async (id: string, signatory = 'LEAD_OPERATOR_01') => {
    const state = get();
    const target = state.incidents.find((i) => i.id === id);
    if (!target) return;

    TactileSoundEngine.playLedgerSealThud();

    const timestamp = new Date().toISOString();
    const updated: CryptographicIncidentDeed = {
      ...target,
      status: 'ACKNOWLEDGED',
      acknowledgedBy: signatory,
      acknowledgedAt: timestamp,
    };

    // Append operator acknowledgment audit deed to chained hash ledger
    try {
      const rawChain = localStorage.getItem('sovereign_chained_ledger_v1');
      const chain: ChainedLedgerEntry[] = rawChain ? JSON.parse(rawChain) : [];
      const ledgerEntry = await LedgerHashChain.appendEntry(
        chain,
        'commercial_reserve',
        0,
        'USD',
        'CREDIT',
        `INCIDENT ACKNOWLEDGED // ${target.id} [${target.code}] SIG:${signatory}`,
        signatory
      );
      updated.ledgerTxId = ledgerEntry.hash;
      chain.push(ledgerEntry);
      localStorage.setItem('sovereign_chained_ledger_v1', JSON.stringify(chain));
    } catch (err) {
      console.warn('[INCIDENT_STORE] Failed to append acknowledgment to ledger:', err);
    }

    // Persist updated deed to encrypted local storage
    await ThreatDetectionEngine.persistIncidentDeed(updated);

    const newIncidents = state.incidents.map((i) => (i.id === id ? updated : i));

    // Check if remaining active critical incidents exist
    const hasRemainingActive = newIncidents.some(
      (inc) =>
        (inc.severity === 'CRITICAL' || inc.severity === 'CATASTROPHIC') &&
        inc.status === 'ACTIVE' &&
        !inc.isDuress
    );

    if (!hasRemainingActive) {
      TactileSoundEngine.stopEmergencySeismicAlarm();
      set({ isAlarmPlaying: false });
    }

    set({ incidents: newIncidents });
    showToast(`Incident ${id} acknowledged and sealed to ledger.`, 'success');
  },

  resolveIncident: async (id: string) => {
    TactileSoundEngine.playClick();
    const state = get();
    const target = state.incidents.find((i) => i.id === id);
    if (!target) return;

    const updated: CryptographicIncidentDeed = {
      ...target,
      status: 'RESOLVED',
    };

    await ThreatDetectionEngine.persistIncidentDeed(updated);

    const newIncidents = state.incidents.map((i) => (i.id === id ? updated : i));
    set({ incidents: newIncidents });
    showToast(`Incident ${id} resolved.`, 'info');
  },

  updateConfig: (newConfig: ThreatEngineConfig) => {
    TactileSoundEngine.playClick();
    ThreatDetectionEngine.saveConfig(newConfig);
    set({ config: newConfig });
    showToast('Threat escalation configuration saved.', 'success');
  },

  openCockpit: (tab = 'incidents') => {
    TactileSoundEngine.playMechanicalTransient();
    set({ isCockpitOpen: true, activeCockpitTab: tab });
  },

  closeCockpit: () => {
    TactileSoundEngine.playClick();
    set({ isCockpitOpen: false });
  },

  setSelectedIncidentId: (id) => {
    set({ selectedIncidentId: id });
  },

  triggerManualDrill: async (severity = 'CRITICAL', source = 'SECURITY') => {
    TactileSoundEngine.playNodeConnectSnap();
    showToast(`Instantiating manual incident drill (${severity})...`, 'warning');
    await ThreatDetectionEngine.triggerManualDrill(severity, source);
  },

  runEgressTest: async () => {
    TactileSoundEngine.playMechanicalTransient();
    set({ isTestingEgress: true });
    try {
      const config = get().config;
      const results = await EscalationDispatcherService.testEgress(config.recipients, config.webhooks);
      set({ lastTestResults: results, isTestingEgress: false });
      showToast(`Egress test drill complete: ${results.length} channels verified.`, 'success');
    } catch {
      set({ isTestingEgress: false });
      showToast('Egress test encountered errors.', 'error');
    }
  },

  silenceAlarm: () => {
    TactileSoundEngine.stopEmergencySeismicAlarm();
    set({ isAlarmPlaying: false });
    showToast('Emergency seismic alarm silenced by operator override.', 'warning');
  },
}));
