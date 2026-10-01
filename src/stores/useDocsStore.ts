/* ============================================================
   SOVEREIGN-OS — Reactive Corporate Notebook & Wiki Store (useDocsStore)
   Enforces Level 1–4 Clearance Spatial Culling, 400ms Debounced FLEE,
   Volatile RAM scrubbing via MemorySanitizer, and Chained Ledger Sealing.
   ============================================================ */

import { create } from 'zustand';
import type {
  CorporateDocument,
  DocumentFolder,
  ClearanceLevel,
  DocumentCoverStyle,
} from '../types';
import { DocsPersistenceService } from '../services/docs/DocsPersistenceService';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';
import { usePermissionStore } from './usePermissionStore';

const CLEARANCE_HIERARCHY: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

const MASTER_FOLDERS: DocumentFolder[] = [
  {
    id: 'f_wiki',
    name: 'Organizational Knowledge',
    clearance: 'LEVEL_1',
    parentId: null,
    icon: 'BookOpen',
  },
  {
    id: 'f_engineering',
    name: 'Engineering & Technical Runbooks',
    clearance: 'LEVEL_2',
    parentId: null,
    icon: 'Terminal',
  },
  {
    id: 'f_executive',
    name: 'Executive Strategy & Roadmaps',
    clearance: 'LEVEL_3',
    parentId: null,
    icon: 'Layers',
  },
  {
    id: 'f_sovereign',
    name: 'Classified Sovereign Charters',
    clearance: 'LEVEL_4',
    parentId: null,
    icon: 'Shield',
  },
];

const MASTER_DOCUMENTS: CorporateDocument[] = [
  // ── Level 1: Public ─────────────────────────────────────────
  {
    id: 'doc_manifesto',
    folderId: 'f_wiki',
    title: 'SOVEREIGN-OS Institutional Manifesto',
    icon: 'ScrollText',
    coverStyle: 'obsidian-mesh',
    clearance: 'LEVEL_1',
    status: 'published',
    category: 'wiki',
    tags: ['Manifesto', 'Architecture', 'Zero-Knowledge', 'Governance'],
    authorAlias: 'OPERATOR_00 [FOUNDER]',
    createdAt: 1709100000000,
    updatedAt: 1709105000000,
    content: `# SOVEREIGN-OS: Institutional Manifesto & System Charter

> [!NOTE]
> Sovereign-OS is an autonomous enterprise workspace built on absolute zero-trust cryptography, field-level envelope encryption (FLEE), and sub-pixel engineering restraint.

## Core Architectural Invariants

The platform operates under the strict assumption that the hosting provider, network router, and physical hypervisor are **completely untrusted**. Root access to the server reveals only opaque cryptographic ciphertext, blind HMAC index tokens, and encrypted chunks.

### Non-Negotiable Operational Mandates
- **Zero-Knowledge FLEE**: Every record is sealed with ephemeral AES-256-GCM data encryption keys wrapped under the volatile Master KEK.
- **Complete Spatial Culling**: Operators lacking designated clearance levels experience 100% data and visual culling; restricted assets are never rendered as locked or dimmed.
- **Diskless RAM Scrubbing**: Ephemeral messages and document edit buffers are strictly scrubbed with null bytes via \`MemorySanitizer\` upon termination.
- **Double-Entry Ledger Integrity**: Significant business decisions and document ratifications are irrevocably sealed to the immutable SHA-256 hash chain.

### Foundational Roadmap Checklist
- [x] Implement multi-vault zero-knowledge ledger engine
- [x] Integrate kinetic Bezier Blueprint DAG Canvas with WebGL / SVG
- [x] Deploy client-side BYO-AI provider bridge with local PII redactor
- [x] Establish bi-directional Kanban matrix and live financial ticker
- [x] Ship Zero-Knowledge Operational Enclave Communications network
- [x] Deploy Hierarchical Documentation Wiki with Ledger Sealing
`,
    isSealed: false,
  },

  // ── Level 2: Departmental ───────────────────────────────────
  {
    id: 'doc_wasm_spec',
    folderId: 'f_engineering',
    title: 'WASM Attestation Pipeline Specification',
    icon: 'FileCode',
    coverStyle: 'blueprint-grid',
    clearance: 'LEVEL_2',
    status: 'published',
    category: 'runbook',
    tags: ['WebAssembly', 'Cryptography', 'DAG Node', 'Attestation'],
    authorAlias: 'OPERATOR_49 [LEAD ARCHITECT]',
    createdAt: 1709200000000,
    updatedAt: 1709210000000,
    boundBlueprintNodeId: 'n_task_1', // Linked to WASM DAG task node
    content: `# WASM Attestation Pipeline Specification

> [!IMPORTANT]
> This runbook is bound to Blueprint DAG Node \`n_task_1\` (WASM Attestation Pipeline). Milestone signoffs in this document synchronize directly with the visual node status.

## Technical Abstract
The WebAssembly attestation layer isolates zero-knowledge cryptographic operations inside isolated linear memory bounds, preventing side-channel cache timing attacks.

### Memory Layout Matrix

| Segment | Base Offset | Size Limit | Allocation Policy |
| :--- | :--- | :--- | :--- |
| Enclave Root | \`0x00000000\` | 64 KB | Guarded Read-Only |
| Ephemeral DEK Buffer | \`0x00010000\` | 256 KB | Zeroized on Free |
| Chained Ledger Cache | \`0x00050000\` | 1024 KB | Hash-Chain Verified |
| Network Transit Inbound | \`0x00150000\` | 2048 KB | AES-256-GCM Unwrapped |

### Verification Checklist
- [x] Audit WebAssembly linear memory bounds
- [x] Verify SHA-256 genesis block hash (\`000000...0000\`)
- [ ] Bind ed25519 duress trigger endpoint
- [ ] Finalize hardware WebAuthn PRF extension handoff
`,
    isSealed: false,
  },

  // ── Level 3: Executive ──────────────────────────────────────
  {
    id: 'doc_q3_roadmap',
    folderId: 'f_executive',
    title: 'Q3 Strategic Compute & Capital Expansion',
    icon: 'TrendingUp',
    coverStyle: 'monastic-amber',
    clearance: 'LEVEL_3',
    status: 'in-review',
    category: 'roadmap',
    tags: ['Compute', 'Treasury', 'Capital Allocation', 'H100'],
    authorAlias: 'OPERATOR_00 [FOUNDER]',
    createdAt: 1709300000000,
    updatedAt: 1709320000000,
    boundBlueprintNodeId: 'n_budget_1', // Linked to H100 budget node
    content: `# Q3 Strategic Compute & Capital Expansion

> [!WARNING]
> EXECUTIVE CLEARANCE REQUIRED. This strategic charter governs the deployment of $180,000 USD from the Commercial Reserve Vault for specialized GPU cluster leasehold.

## Capital Allocation Overview
To maintain decentralized inference autonomy, SOVEREIGN-OS is expanding dedicated private compute clusters running containerized Ollama and Whisper instances.

### Financial Telemetry
- **Base Reserve Commitment**: $180,000.00 USD
- **Disbursed to Date**: $142,000.00 USD
- **Remaining Cap**: $38,000.00 USD
- **Expected Runway Impact**: -0.4 months (absorbed by foreign exchange appreciation)

### Milestone Objectives
- [x] Secure 8x NVIDIA H100 SXM5 node allocation
- [x] Deploy wireguard zero-trust tunnel to private datacenter
- [ ] Implement dual-signatory liquidation approval threshold
- [ ] Seal ratification record into Treasury Ledger
`,
    isSealed: false,
  },

  // ── Level 4: Sovereign Founder ──────────────────────────────
  {
    id: 'doc_root_charter',
    folderId: 'f_sovereign',
    title: 'Class-IV Sovereign Seed Key Custody Charter',
    icon: 'Shield',
    coverStyle: 'cypher-matrix',
    clearance: 'LEVEL_4',
    status: 'published',
    category: 'contract',
    tags: ['Top Secret', 'Founder', 'Seed Keys', 'Dead Man'],
    authorAlias: 'OPERATOR_00 [FOUNDER]',
    createdAt: 1709400000000,
    updatedAt: 1709425000000,
    boundBlueprintNodeId: 'n_vault_file', // Linked to Sovereign Seed Keys
    isSealed: true,
    sealLedgerBlock: {
      blockIndex: 42,
      hash: '0x8f4cd19a3b7a7c18d9e29910abcf849102cdee918402',
      prevHash: '0x3a91bc7d2f8e104a984c00293817fcae88102948',
      timestamp: 1709425000000,
      signatory: 'OPERATOR_00 [FOUNDER]',
      documentDigest: '8f4cd19a3b7a7c18d9e209845192837482910293847561829304958172635481',
      mandateReason: 'SOVEREIGN SEED KEY IMMUTABLE CUSTODIAL RATIFICATION',
    },
    content: `# Class-IV Sovereign Seed Key Custody Charter

> [!CRITICAL]
> CLASSIFIED // LEVEL FOUR BLACK-BUDGET FOUNDER ACCESS ONLY.
> This document is permanently sealed to the Treasury Chained Hash Ledger (Block #42). Any unauthorized amendment attempts are mathematically impossible and trigger immediate duress wipe.

## Genesis Enclave Key Authority
The Master Key Encryption Key (KEK) derives strictly in volatile client RAM using PBKDF2-SHA256 at 310,000 iterations from operator biometric hardware seeds.

### Failover Protocol & Dead-Man Switch
1. In the event of 90 days of operator silence, custody automatically transfers to designated secondary multi-sig escrows.
2. Cold-boot memory dump protection enforces immediate \`MemorySanitizer.zeroize()\` wiping of all raw seed arrays.
3. Chaff chunk fragmentation disperses 64 MB payload slices across distributed endpoints with pseudo-random timing bursts.

### Signatory Ratification
- **Founding Signatory**: OPERATOR_00
- **Ledger Seal Proof**: \`0x8f4cd19a3b7a7c18d9e29910abcf849102cdee918402\`
- **Double-Entry Vault**: \`commercial_reserve\`
`,
  },
];

interface DocsState {
  activeClearance: ClearanceLevel;
  folders: DocumentFolder[]; // Culled by clearance
  documents: CorporateDocument[]; // Culled by clearance
  activeDocumentId: string | null;
  searchQuery: string;
  isSaving: boolean;
  isUtilityDrawerOpen: boolean;
  editorMode: 'edit' | 'preview' | 'split';
  activeCover: DocumentCoverStyle;

  // Actions
  setActiveClearance: (level: ClearanceLevel) => void;
  setActiveDocumentId: (docId: string | null) => void;
  setSearchQuery: (q: string) => void;
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void;
  toggleUtilityDrawer: () => void;

  createDocument: (folderId?: string | null, title?: string, clearance?: ClearanceLevel) => string;
  createFolder: (name: string, clearance?: ClearanceLevel, parentId?: string | null) => string;
  updateDocumentContent: (docId: string, content: string) => void;
  updateDocumentMetadata: (
    docId: string,
    meta: Partial<Omit<CorporateDocument, 'id' | 'content'>>
  ) => void;
  bindDocumentToDagNode: (docId: string, nodeId: string | undefined) => void;
  sealDocumentToLedger: (docId: string, mandateReason: string) => Promise<void>;
  deleteDocument: (docId: string) => void;
  deleteFolder: (folderId: string) => void;
}

// 400ms debouncing timer holder
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useDocsStore = create<DocsState>((set, get) => {
  const computeVisibleFolders = (level: ClearanceLevel): DocumentFolder[] => {
    const numeric = CLEARANCE_HIERARCHY[level];
    return MASTER_FOLDERS.filter(
      (f) => CLEARANCE_HIERARCHY[f.clearance] <= numeric
    );
  };

  const computeVisibleDocuments = (level: ClearanceLevel): CorporateDocument[] => {
    const numeric = CLEARANCE_HIERARCHY[level];
    return MASTER_DOCUMENTS.filter(
      (d) => CLEARANCE_HIERARCHY[d.clearance] <= numeric
    );
  };

  const initialClearance: ClearanceLevel = usePermissionStore.getState().getActiveClearance();
  const initialFolders = computeVisibleFolders(initialClearance);
  const initialDocs = computeVisibleDocuments(initialClearance);
  const initialActiveId = initialDocs[0]?.id || null;

  return {
    activeClearance: initialClearance,
    folders: initialFolders,
    documents: initialDocs,
    activeDocumentId: initialActiveId,
    searchQuery: '',
    isSaving: false,
    isUtilityDrawerOpen: true,
    editorMode: 'split',
    activeCover: 'obsidian-mesh',

    setActiveClearance: (level: ClearanceLevel) => {
      const maxClearance = usePermissionStore.getState().getActiveClearance();
      if (CLEARANCE_HIERARCHY[level] > CLEARANCE_HIERARCHY[maxClearance]) {
        showToast(`Mevcut rolünüz (${maxClearance}) bu doküman seviyesine erişemez.`, 'warning');
        return;
      }

      const visibleFolders = computeVisibleFolders(level);
      const visibleDocs = computeVisibleDocuments(level);
      const currentDocId = get().activeDocumentId;
      const isCurrentStillVisible = visibleDocs.some((d) => d.id === currentDocId);

      set({
        activeClearance: level,
        folders: visibleFolders,
        documents: visibleDocs,
        activeDocumentId: isCurrentStillVisible ? currentDocId : (visibleDocs[0]?.id || null),
      });

      TactileSoundEngine.playClick();
      showToast(`Docs clearance updated to ${level}. Spatial data culling applied.`, 'info');
    },

    setActiveDocumentId: (docId: string | null) => {
      const state = get();
      const prevDoc = state.documents.find((d) => d.id === state.activeDocumentId);

      // Memory scrubbing: zeroize previous buffer upon document switching
      if (prevDoc) {
        DocsPersistenceService.scrubBuffer(prevDoc.content);
      }

      TactileSoundEngine.playMechanicalTransient();
      set({ activeDocumentId: docId });
    },

    setSearchQuery: (q: string) => {
      set({ searchQuery: q });
    },

    setEditorMode: (mode) => {
      TactileSoundEngine.playClick();
      set({ editorMode: mode });
    },

    toggleUtilityDrawer: () => {
      TactileSoundEngine.playClick();
      set((prev) => ({ isUtilityDrawerOpen: !prev.isUtilityDrawerOpen }));
    },

    createDocument: (folderId = null, title = 'Untitled Document', clearance = 'LEVEL_1') => {
      const canEdit = usePermissionStore.getState().hasPermission('docs:edit');
      if (!canEdit) {
        showToast('Yetkisiz işlem: Doküman oluşturma yetkiniz yok (Salt-Okunur).', 'error');
        return '';
      }
      TactileSoundEngine.playMechanicalTransient();
      const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const activeClearance = get().activeClearance;

      const newDoc: CorporateDocument = {
        id: newId,
        folderId: folderId || null,
        title,
        icon: 'FileText',
        coverStyle: 'obsidian-mesh',
        clearance: CLEARANCE_HIERARCHY[clearance] > CLEARANCE_HIERARCHY[activeClearance] ? activeClearance : clearance,
        status: 'draft',
        category: 'wiki',
        tags: ['New Draft'],
        authorAlias: 'OPERATOR_00',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: `# ${title}\n\nStart writing in zero-knowledge markdown with live preview...\n`,
        isSealed: false,
      };

      // Add to master list and visible list
      MASTER_DOCUMENTS.unshift(newDoc);

      set((prev) => ({
        documents: [newDoc, ...prev.documents],
        activeDocumentId: newId,
      }));

      // Trigger asynchronous ZK envelope sealing
      DocsPersistenceService.sealDocument(newDoc).catch(() => {});
      showToast(`Document "${title}" created and envelope-encrypted.`, 'success');
      return newId;
    },

    createFolder: (name, clearance = 'LEVEL_1', parentId = null) => {
      const canEdit = usePermissionStore.getState().hasPermission('docs:edit');
      if (!canEdit) {
        showToast('Yetkisiz işlem: Klasör oluşturma yetkiniz yok (Salt-Okunur).', 'error');
        return '';
      }
      TactileSoundEngine.playClick();
      const newFolderId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const activeClearance = get().activeClearance;

      const newFolder: DocumentFolder = {
        id: newFolderId,
        name,
        clearance: CLEARANCE_HIERARCHY[clearance] > CLEARANCE_HIERARCHY[activeClearance] ? activeClearance : clearance,
        parentId,
        icon: 'Folder',
      };

      MASTER_FOLDERS.push(newFolder);

      set((prev) => ({
        folders: [...prev.folders, newFolder],
      }));

      showToast(`Folder "${name}" created.`, 'success');
      return newFolderId;
    },

    updateDocumentContent: (docId: string, newContent: string) => {
      const canEdit = usePermissionStore.getState().hasPermission('docs:edit');
      if (!canEdit) {
        showToast('Yetkisiz işlem: Doküman düzenleme yetkiniz yok (Salt-Okunur).', 'warning');
        return;
      }
      const now = Date.now();

      // Immediate volatile RAM update (zero layout stutter)
      set((prev) => {
        const updated = prev.documents.map((d) =>
          d.id === docId ? { ...d, content: newContent, updatedAt: now } : d
        );
        return { documents: updated, isSaving: true };
      });

      // Update in master array as well
      const masterIdx = MASTER_DOCUMENTS.findIndex((d) => d.id === docId);
      if (masterIdx !== -1) {
        MASTER_DOCUMENTS[masterIdx].content = newContent;
        MASTER_DOCUMENTS[masterIdx].updatedAt = now;
      }

      // 400ms Debounced Zero-Knowledge AES-256-GCM Envelope Encryption
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
      }

      saveDebounceTimer = setTimeout(async () => {
        const doc = get().documents.find((d) => d.id === docId);
        if (doc) {
          await DocsPersistenceService.sealDocument(doc);
        }
        set({ isSaving: false });
      }, 400);
    },

    updateDocumentMetadata: (docId, meta) => {
      TactileSoundEngine.playClick();
      const now = Date.now();

      set((prev) => {
        const updated = prev.documents.map((d) =>
          d.id === docId ? { ...d, ...meta, updatedAt: now } : d
        );
        return { documents: updated };
      });

      const masterIdx = MASTER_DOCUMENTS.findIndex((d) => d.id === docId);
      if (masterIdx !== -1) {
        MASTER_DOCUMENTS[masterIdx] = { ...MASTER_DOCUMENTS[masterIdx], ...meta, updatedAt: now };
        DocsPersistenceService.sealDocument(MASTER_DOCUMENTS[masterIdx]).catch(() => {});
      }
    },

    bindDocumentToDagNode: (docId: string, nodeId: string | undefined) => {
      TactileSoundEngine.playMechanicalTransient();
      get().updateDocumentMetadata(docId, { boundBlueprintNodeId: nodeId });
      showToast(nodeId ? `Bound to Blueprint DAG Node ${nodeId}` : 'DAG Node Binding removed', 'info');
    },

    sealDocumentToLedger: async (docId: string, mandateReason: string) => {
      const canSeal = usePermissionStore.getState().hasPermission('docs:seal');
      if (!canSeal) {
        showToast('Yetkisiz işlem: Dokümanı deftere mühürleme yetkiniz yok.', 'error');
        return;
      }
      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;

      const signatory =
        get().activeClearance === 'LEVEL_4'
          ? 'OPERATOR_00 [FOUNDER]'
          : 'OPERATOR_49 [LEAD ARCHITECT]';

      // 1. Commit to treasury double-entry hash ledger
      const { sealBlock } = await DocsPersistenceService.sealDocumentToLedger(
        [],
        doc,
        mandateReason,
        signatory
      );

      // 2. Play 65 Hz sub-bass thud
      TactileSoundEngine.playLedgerSealThud();

      // 3. Update document state
      get().updateDocumentMetadata(docId, {
        isSealed: true,
        sealLedgerBlock: sealBlock,
      });

      showToast(`Document "${doc.title}" sealed to Ledger (Block #${sealBlock.blockIndex}).`, 'success');
    },

    deleteDocument: (docId: string) => {
      const canDelete = usePermissionStore.getState().hasPermission('docs:delete');
      if (!canDelete) {
        showToast('Yetkisiz işlem: Doküman silme yetkiniz yok.', 'error');
        return;
      }
      TactileSoundEngine.playClick();
      const target = get().documents.find((d) => d.id === docId);
      if (target) {
        DocsPersistenceService.scrubBuffer(target.content);
        DocsPersistenceService.removeEnvelope(docId);
      }

      const masterIdx = MASTER_DOCUMENTS.findIndex((d) => d.id === docId);
      if (masterIdx !== -1) {
        MASTER_DOCUMENTS.splice(masterIdx, 1);
      }

      set((prev) => {
        const remaining = prev.documents.filter((d) => d.id !== docId);
        return {
          documents: remaining,
          activeDocumentId: prev.activeDocumentId === docId ? (remaining[0]?.id || null) : prev.activeDocumentId,
        };
      });

      showToast('Document wiped and removed.', 'info');
    },

    deleteFolder: (folderId: string) => {
      const canDelete = usePermissionStore.getState().hasPermission('docs:delete');
      if (!canDelete) {
        showToast('Yetkisiz işlem: Klasör silme yetkiniz yok.', 'error');
        return;
      }
      TactileSoundEngine.playClick();
      const masterIdx = MASTER_FOLDERS.findIndex((f) => f.id === folderId);
      if (masterIdx !== -1) {
        MASTER_FOLDERS.splice(masterIdx, 1);
      }

      set((prev) => ({
        folders: prev.folders.filter((f) => f.id !== folderId),
      }));

      showToast('Folder removed.', 'info');
    },
  };
});
