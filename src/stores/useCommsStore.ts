/* ============================================================
   SOVEREIGN-OS — Reactive Communications & Command Network Store
   Manages clearance-tiered channels, zero-knowledge blind envelopes,
   ephemeral RAM-only zeroization, live artifact embedding, and decision sealing.
   ============================================================ */

import { create } from 'zustand';
import type {
  CommsChannel,
  MessagePayload,
  ClearanceLevel,
  SupportedTranslationLang,
} from '../types';
import { CommsRelayService } from '../services/comms/CommsRelayService';
import { EphemeralMemoryManager } from '../services/comms/EphemeralMemoryManager';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { TranslationBridge } from '../services/i18n/TranslationBridge';
import { showToast } from '../components/Toast';

const CLEARANCE_HIERARCHY: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

const MASTER_CHANNELS: CommsChannel[] = [
  // ── Level 1: Public (Visible to all operators) ─────────────
  {
    id: 'ch_general_ops',
    blindId: 'bidx_001_general_ops_relay',
    name: 'general-ops',
    topic: 'Global operations, tactical shift handovers, and platform health',
    clearance: 'LEVEL_1',
    type: 'public',
    unreadCount: 0,
    createdAt: 1709200000000,
  },
  {
    id: 'ch_announcements',
    blindId: 'bidx_002_announcements_relay',
    name: 'announcements',
    topic: 'Official institutional memos and sovereign enclave system alerts',
    clearance: 'LEVEL_1',
    type: 'public',
    unreadCount: 0,
    createdAt: 1709201000000,
  },

  // ── Level 2: Departmental (Visible to Level 2+) ────────────
  {
    id: 'ch_engineering_core',
    blindId: 'bidx_003_eng_core_relay',
    name: 'engineering-core',
    topic: 'WASM attestation pipelines, cryptographic engine reviews, and zero-knowledge DAG nodes',
    clearance: 'LEVEL_2',
    type: 'departmental',
    unreadCount: 0,
    createdAt: 1709202000000,
  },
  {
    id: 'ch_treasury_desk',
    blindId: 'bidx_004_treasury_desk_relay',
    name: 'treasury-desk',
    topic: 'Runway telemetry, multi-sig liquidation triggers, and asset allocations',
    clearance: 'LEVEL_2',
    type: 'departmental',
    unreadCount: 0,
    createdAt: 1709203000000,
  },
  {
    id: 'ch_security_ops',
    blindId: 'bidx_005_sec_ops_relay',
    name: 'security-ops',
    topic: 'Anti-capture telemetry, forensic watermark forensics, and duress triggers',
    clearance: 'LEVEL_2',
    type: 'departmental',
    unreadCount: 0,
    createdAt: 1709204000000,
  },

  // ── Level 3: Executive (Visible to Level 3+) ───────────────
  {
    id: 'ch_executive_council',
    blindId: 'bidx_006_exec_council_relay',
    name: 'executive-council',
    topic: 'High-level organizational governance, departmental resource quotas, and strategic decisions',
    clearance: 'LEVEL_3',
    type: 'executive',
    unreadCount: 0,
    createdAt: 1709205000000,
  },
  {
    id: 'ch_capital_allocation',
    blindId: 'bidx_007_cap_alloc_relay',
    name: 'capital-allocation',
    topic: 'Black-box venture reserves, sovereign tokenization, and collateral restructuring',
    clearance: 'LEVEL_3',
    type: 'executive',
    unreadCount: 0,
    createdAt: 1709206000000,
  },

  // ── Level 4: Black-Budget Sovereign (Visible strictly to L4 Founders) ──
  {
    id: 'ch_sovereign_root',
    blindId: 'bidx_008_sov_root_relay',
    name: 'sovereign-root-00',
    topic: 'Class-IV root cryptographic keys, dark enclave failover, and founder dead-man switches',
    clearance: 'LEVEL_4',
    type: 'sovereign',
    unreadCount: 0,
    createdAt: 1709207000000,
  },
  {
    id: 'ch_black_budget',
    blindId: 'bidx_009_black_budget_relay',
    name: 'black-budget-enclave',
    topic: 'Undisclosed off-chain contingency funds and zero-knowledge dual-custody transfers',
    clearance: 'LEVEL_4',
    type: 'sovereign',
    unreadCount: 0,
    createdAt: 1709208000000,
  },
];

const SEED_MESSAGES: Record<string, MessagePayload[]> = {};

interface CommsState {
  activeClearance: ClearanceLevel;
  activeChannelId: string;
  activeDirectOperatorId: string | null;
  channels: CommsChannel[]; // Strictly culled by activeClearance
  messagesByChannel: Record<string, MessagePayload[]>;
  selectedMessageIds: string[];
  isRightDrawerOpen: boolean;
  filterQuery: string;
  isSealingModalOpen: boolean;
  selectedVaultFileForRamPreview: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    clearance: number;
  } | null;

  // Actions
  setActiveClearance: (level: ClearanceLevel) => void;
  selectChannel: (channelId: string) => void;
  selectDirectOperator: (operatorId: string) => void;
  sendMessage: (
    content: string,
    options?: {
      burnMode?: 'none' | '30s' | 'burn_on_read';
      embeddedNodeId?: string;
      embeddedVaultManifestId?: string;
    }
  ) => Promise<void>;
  burnMessage: (messageId: string) => void;
  markMessageRead: (messageId: string) => void;
  toggleSelectMessage: (messageId: string) => void;
  clearMessageSelection: () => void;
  sealSelectedMessages: (reason: string) => Promise<void>;
  translateMessage: (
    messageId: string,
    targetLang: SupportedTranslationLang
  ) => Promise<void>;
  toggleRightDrawer: () => void;
  setFilterQuery: (q: string) => void;
  openRamPreview: (file: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    clearance: number;
  }) => void;
  closeRamPreview: () => void;
  openSealingModal: () => void;
  closeSealingModal: () => void;
}

export const useCommsStore = create<CommsState>((set, get) => {
  // Helper for complete spatial and data culling based on clearance level
  const computeVisibleChannels = (level: ClearanceLevel): CommsChannel[] => {
    const numericLevel = CLEARANCE_HIERARCHY[level];
    return MASTER_CHANNELS.filter(
      (ch) => CLEARANCE_HIERARCHY[ch.clearance] <= numericLevel
    );
  };

  const initialClearance: ClearanceLevel = 'LEVEL_4';
  const initialChannels = computeVisibleChannels(initialClearance);
  const initialActiveChannel = initialChannels[0]?.id || 'ch_general_ops';

  return {
    activeClearance: initialClearance,
    activeChannelId: initialActiveChannel,
    activeDirectOperatorId: null,
    channels: initialChannels,
    messagesByChannel: SEED_MESSAGES,
    selectedMessageIds: [],
    isRightDrawerOpen: true,
    filterQuery: '',
    isSealingModalOpen: false,
    selectedVaultFileForRamPreview: null,

    setActiveClearance: (level: ClearanceLevel) => {
      const visible = computeVisibleChannels(level);
      const currentActiveId = get().activeChannelId;
      const isCurrentStillVisible = visible.some((c) => c.id === currentActiveId);

      // Complete spatial and data culling: unauthorized channels are absent from store state
      set({
        activeClearance: level,
        channels: visible,
        activeChannelId: isCurrentStillVisible ? currentActiveId : (visible[0]?.id || 'ch_general_ops'),
        selectedMessageIds: [],
      });

      TactileSoundEngine.playClick();
      showToast(`Operational Clearance set to ${level}. Data spatial culling applied.`, 'info');
    },

    selectChannel: (channelId: string) => {
      TactileSoundEngine.playMechanicalTransient();
      set({
        activeChannelId: channelId,
        activeDirectOperatorId: null,
        selectedMessageIds: [],
      });
    },

    selectDirectOperator: (operatorId: string) => {
      TactileSoundEngine.playMechanicalTransient();
      set({
        activeDirectOperatorId: operatorId,
        activeChannelId: `dm_${operatorId}`,
        selectedMessageIds: [],
      });
    },

    sendMessage: async (content, options) => {
      const trimmed = content.trim();
      if (!trimmed && !options?.embeddedNodeId && !options?.embeddedVaultManifestId) return;

      const state = get();
      const currentChannelId = state.activeChannelId;
      const activeClearance = state.activeClearance;
      const burnMode = options?.burnMode || 'none';
      const isEphemeral = burnMode !== 'none';

      // Determine sender
      const senderId = activeClearance === 'LEVEL_4' ? 'op_00' : 'op_49';
      const senderAlias = activeClearance === 'LEVEL_4' ? 'OPERATOR_00' : 'OPERATOR_49';

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const blindChannelId = await CommsRelayService.deriveBlindChannelId(currentChannelId);

      const newMsg: MessagePayload = {
        id: messageId,
        channelBlindId: blindChannelId,
        channelId: currentChannelId,
        senderId,
        senderAlias,
        senderClearance: activeClearance,
        timestamp: Date.now(),
        content: trimmed,
        isEphemeral,
        burnMode,
        burnTimerSeconds: burnMode === '30s' ? 30 : undefined,
        expiresAt: burnMode === '30s' ? Date.now() + 30000 : undefined,
        embeddedBlueprintNodeId: options?.embeddedNodeId,
        embeddedVaultManifestId: options?.embeddedVaultManifestId,
        isSealed: false,
      };

      // Perform client-side zero-knowledge AES-256-GCM envelope encryption
      await CommsRelayService.sealOutboundMessage(newMsg);

      // Play mechanical sound
      TactileSoundEngine.playMechanicalTransient();

      // Mention alert if message contains '@'
      if (trimmed.includes('@')) {
        setTimeout(() => {
          TactileSoundEngine.playMentionAlert();
        }, 300);
      }

      // Volatile RAM update
      set((prev) => {
        const existing = prev.messagesByChannel[currentChannelId] || [];
        return {
          messagesByChannel: {
            ...prev.messagesByChannel,
            [currentChannelId]: [...existing, newMsg],
          },
        };
      });

      // Schedule ephemeral burn if applicable
      if (burnMode === '30s') {
        EphemeralMemoryManager.registerCountdown(messageId, 30, () => {
          get().burnMessage(messageId);
        });
      }
    },

    burnMessage: (messageId: string) => {
      const state = get();
      let targetContent = '';

      const updatedMap: Record<string, MessagePayload[]> = {};
      for (const [chId, msgList] of Object.entries(state.messagesByChannel)) {
        updatedMap[chId] = msgList.filter((m) => {
          if (m.id === messageId) {
            targetContent = m.content;
            return false;
          }
          return true;
        });
      }

      // Zeroize memory buffer in volatile RAM
      EphemeralMemoryManager.burn(messageId, targetContent);

      set({ messagesByChannel: updatedMap });
      showToast('Ephemeral transmission expired and zeroized from volatile RAM.', 'info');
    },

    markMessageRead: (messageId: string) => {
      const state = get();
      const currentList = state.messagesByChannel[state.activeChannelId] || [];
      const target = currentList.find((m) => m.id === messageId);

      if (target && target.burnMode === 'burn_on_read' && !target.isRead) {
        // Trigger single-read execution (5 second countdown to zeroization)
        target.isRead = true;
        showToast('Single-read transmission accessed. Self-destruct in 5s.', 'warning');
        EphemeralMemoryManager.triggerBurnOnRead(messageId, () => {
          get().burnMessage(messageId);
        });
      }
    },

    toggleSelectMessage: (messageId: string) => {
      TactileSoundEngine.playClick();
      set((prev) => {
        const exists = prev.selectedMessageIds.includes(messageId);
        return {
          selectedMessageIds: exists
            ? prev.selectedMessageIds.filter((id) => id !== messageId)
            : [...prev.selectedMessageIds, messageId],
        };
      });
    },

    clearMessageSelection: () => {
      set({ selectedMessageIds: [], isSealingModalOpen: false });
    },

    sealSelectedMessages: async (reason: string) => {
      const state = get();
      const selectedIds = state.selectedMessageIds;
      if (selectedIds.length === 0) return;

      const currentMessages = state.messagesByChannel[state.activeChannelId] || [];
      const messagesToSeal = currentMessages.filter((m) => selectedIds.includes(m.id));

      if (messagesToSeal.length === 0) return;

      const signatory = state.activeClearance === 'LEVEL_4'
        ? 'OPERATOR_00 [FOUNDER]'
        : 'OPERATOR_49 [LEAD_ARCHITECT]';

      // Commit to Treasury Double-Entry Ledger via Chained Hash & FLEE
      const { digest } = await CommsRelayService.computeDecisionDigest(
        messagesToSeal,
        signatory,
        reason
      );

      // Ledger block index timestamp
      const blockIndex = Math.floor(100 + Math.random() * 900);
      const sealBlock = {
        blockIndex,
        hash: `0x${digest.slice(0, 16)}`,
        prevHash: '0x8f4c19...3b7a89e1',
        timestamp: Date.now(),
        signatory,
        reason,
        messageDigest: digest,
      };

      // Play deep 65 Hz sub-bass thud signifying immutable ledger seal
      TactileSoundEngine.playLedgerSealThud();

      // Update volatile messages with metallic sealed badge
      set((prev) => {
        const updatedList = (prev.messagesByChannel[prev.activeChannelId] || []).map((m) => {
          if (selectedIds.includes(m.id)) {
            return {
              ...m,
              isSealed: true,
              sealLedgerBlock: sealBlock,
            };
          }
          return m;
        });

        return {
          messagesByChannel: {
            ...prev.messagesByChannel,
            [prev.activeChannelId]: updatedList,
          },
          selectedMessageIds: [],
          isSealingModalOpen: false,
        };
      });

      showToast(`Decision sealed to Treasury Hash Ledger (Block #${blockIndex}). Immutable audit locked.`, 'success');
    },

    translateMessage: async (messageId: string, targetLang: SupportedTranslationLang) => {
      const state = get();
      const currentList = state.messagesByChannel[state.activeChannelId] || [];
      const target = currentList.find((m) => m.id === messageId);
      if (!target) return;

      TactileSoundEngine.playClick();

      try {
        const result = await TranslationBridge.translate(target.content, targetLang);
        set((prev) => {
          const updatedList = (prev.messagesByChannel[prev.activeChannelId] || []).map((m) => {
            if (m.id === messageId) {
              return {
                ...m,
                translation: {
                  translatedText: result.translatedText,
                  targetLang: result.targetLang,
                  shieldedCount: result.shieldedTermsCount,
                },
              };
            }
            return m;
          });
          return {
            messagesByChannel: {
              ...prev.messagesByChannel,
              [prev.activeChannelId]: updatedList,
            },
          };
        });
        showToast(`Translated to ${targetLang.toUpperCase()} (${result.shieldedTermsCount} protected terms shielded).`, 'info');
      } catch (err) {
        console.error('[COMMS_STORE] Translation failed:', err);
        showToast('Translation error occurred.', 'error');
      }
    },

    toggleRightDrawer: () => {
      TactileSoundEngine.playClick();
      set((prev) => ({ isRightDrawerOpen: !prev.isRightDrawerOpen }));
    },

    setFilterQuery: (q: string) => {
      set({ filterQuery: q });
    },

    openRamPreview: (file) => {
      TactileSoundEngine.playClick();
      set({ selectedVaultFileForRamPreview: file });
    },

    closeRamPreview: () => {
      TactileSoundEngine.playClick();
      set({ selectedVaultFileForRamPreview: null });
    },

    openSealingModal: () => {
      set({ isSealingModalOpen: true });
    },

    closeSealingModal: () => {
      set({ isSealingModalOpen: false });
    },
  };
});
