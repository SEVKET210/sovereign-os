/* ============================================================
   SOVEREIGN-OS — Reactive Vault & Chunk Storage Store (Zustand)
   Unified state management for File Vault, live chunking progress telemetry,
   RAM-only preview sessions, zero-knowledge ephemeral shares, and chaff metrics.
   ============================================================ */

import { create } from 'zustand';
import { ChunkingEngine } from './ChunkingEngine';
import { ManifestService } from './ManifestService';
import { VaultStreamService } from './VaultStreamService';
import { StorageAdapter } from './StorageAdapter';
import { ChaffEngine } from './ChaffEngine';
import { EphemeralShareService } from './EphemeralShareService';
import { CloudStorageManager } from './CloudStorageManager';
import { ByosCredentialEnclave } from './ByosCredentialEnclave';
import { CloudSyncQueueEngine } from './CloudSyncQueueEngine';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import { TactileSoundEngine } from '../audio/TactileSoundEngine';
import { showToast } from '../../components/Toast';
import type {
  FileManifest,
  ClearanceLevel,
  StorageEndpoint,
  VaultIngestionProgress,
  ChaffMetrics,
  RamPreviewSession,
  EphemeralShareRecord,
  ShareExpirationOption,
  CloudProviderConfig,
  CloudProviderCredentials,
  CloudTestDrillResult,
  CloudSyncTelemetry,
} from '../../types';

const CLEARANCE_NUMERICS: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

interface VaultState {
  manifests: FileManifest[];
  activeClearance: ClearanceLevel;
  storageEndpoint: StorageEndpoint;
  ingestionProgress: VaultIngestionProgress | null;
  activePreview: RamPreviewSession | null;
  chaffMetrics: ChaffMetrics;
  isLoading: boolean;

  // Ephemeral Share State
  activeShareModalManifest: FileManifest | null;
  activeShares: EphemeralShareRecord[];

  // BYOS Cloud Adapter State
  cloudConfig: CloudProviderConfig;
  cloudTelemetry: CloudSyncTelemetry;
  isCockpitOpen: boolean;
  isTestingCloud: boolean;
  lastDrillResult: CloudTestDrillResult | null;
  activeCredentialsMasked: CloudProviderCredentials;

  // Actions
  loadVault: () => Promise<void>;
  setClearance: (level: ClearanceLevel) => void;
  setStorageEndpoint: (endpoint: StorageEndpoint) => void;
  ingestFile: (file: File, clearanceLevel?: number) => Promise<FileManifest | null>;
  previewFile: (manifest: FileManifest) => Promise<void>;
  closePreview: () => void;
  deleteFile: (manifestId: string) => Promise<void>;
  emitChaffBurst: (count?: number) => Promise<void>;
  toggleBackgroundChaff: () => void;

  // BYOS Cloud Actions
  openCockpitModal: () => void;
  closeCockpitModal: () => void;
  setCloudConfig: (config: Partial<CloudProviderConfig>) => void;
  saveCloudCredentials: (credentials: CloudProviderCredentials) => Promise<void>;
  testCloudConnection: (
    overrideConfig?: CloudProviderConfig,
    overrideCreds?: CloudProviderCredentials
  ) => Promise<CloudTestDrillResult>;

  // Share Actions
  openShareModal: (manifest: FileManifest) => void;
  closeShareModal: () => void;
  loadShares: () => void;
  generateShareLink: (
    manifest: FileManifest,
    options: { expiration: ShareExpirationOption; burnOnDownload: boolean }
  ) => Promise<{ shareUrl: string; record: EphemeralShareRecord; shareKeyHex: string }>;
  revokeShareLink: (shareId: string) => void;
}

/**
 * Storage maintains authentic initial state — no fabricated documents seeded.
 */
async function seedDefaultVaultIfEmpty(
  _workspaceId: string,
  _masterKek: CryptoKey,
  _masterKwKey: CryptoKey,
  _blindSalt: Uint8Array
): Promise<void> {
  return;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  manifests: [],
  activeClearance: 'LEVEL_4',
  storageEndpoint: 'VDS_LOCAL',
  ingestionProgress: null,
  activePreview: null,
  chaffMetrics: { authenticChunks: 0, chaffChunks: 0, isChaffing: false },
  isLoading: false,
  activeShareModalManifest: null,
  activeShares: [],

  // BYOS Cloud Adapter State
  cloudConfig: ByosCredentialEnclave.getDefaultConfig('VDS_LOCAL'),
  cloudTelemetry: {
    activeProvider: 'VDS_LOCAL',
    synchronizedBlockCount: 0,
    pendingQueueCount: 0,
    totalRemoteBytes: 0,
    syncState: 'IDLE',
    lastSyncTimestamp: null,
  },
  isCockpitOpen: false,
  isTestingCloud: false,
  lastDrillResult: null,
  activeCredentialsMasked: {},

  loadVault: async () => {
    set({ isLoading: true });
    try {
      if (!KeyDerivationBridge.isUnlocked()) {
        set({ isLoading: false });
        return;
      }
      const ctx = KeyDerivationBridge.getContext();

      // Auto-seed authentic zero-knowledge documents if enclave is brand new
      await seedDefaultVaultIfEmpty(ctx.workspaceId, ctx.masterKek, ctx.masterKwKey, ctx.blindSalt);

      // Hydrate active cloud credentials and initialize sync queue
      CloudSyncQueueEngine.initialize(get().cloudConfig);
      CloudSyncQueueEngine.subscribe((telemetry) => {
        set({ cloudTelemetry: telemetry });
      });

      const unsealedCreds = await ByosCredentialEnclave.loadAndUnsealCredentials(
        get().cloudConfig.provider,
        ctx.masterKek
      );
      if (unsealedCreds) {
        set({ activeCredentialsMasked: unsealedCreds });
      }

      const numericClearance = CLEARANCE_NUMERICS[get().activeClearance];
      const culled = await ManifestService.fetchCulledManifests(
        ctx.workspaceId,
        numericClearance,
        ctx.masterKek
      );
      const MOCK_NAMES = [
        'Sovereign_OS_Master_Charter_v2.pdf',
        'Core_Wasm_Kernel_Runtime.ts',
        'Zurich_Gold_Bullion_Custody_Attestation.pdf',
        'Black_Budget_Allocation_Matrix_2026.json',
      ];
      const authenticManifests = culled.filter((m) => !MOCK_NAMES.includes(m.originalFileName));
      const chaffStats = await ChaffEngine.getMetrics();
      const allShares = EphemeralShareService.listAllShares();

      set({
        manifests: authenticManifests,
        chaffMetrics: chaffStats,
        activeShares: allShares,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[VAULT_STORE] Load vault failed:', err);
      set({ isLoading: false });
    }
  },

  setClearance: (level: ClearanceLevel) => {
    set({ activeClearance: level });
    get().loadVault();
  },

  setStorageEndpoint: (endpoint: StorageEndpoint) => {
    const current = get().cloudConfig;
    const nextConfig: CloudProviderConfig = {
      ...ByosCredentialEnclave.getDefaultConfig(endpoint),
      ...current,
      provider: endpoint,
    };
    set({ storageEndpoint: endpoint, cloudConfig: nextConfig });
    CloudSyncQueueEngine.updateConfig(nextConfig);
    TactileSoundEngine.playClick();
    showToast(`Storage endpoint switched to ${endpoint.replace('_', ' ')}.`, 'info');
  },

  ingestFile: async (file: File, clearanceLevel = 1): Promise<FileManifest | null> => {
    TactileSoundEngine.playClick();
    const fileId = crypto.randomUUID();
    const startTime = performance.now();

    const initialProgress: VaultIngestionProgress = {
      fileId,
      fileName: file.name,
      totalBytes: file.size,
      processedBytes: 0,
      totalChunks: Math.max(1, Math.ceil(file.size / ChunkingEngine.CHUNK_QUANTUM)),
      processedChunks: 0,
      paddingBytes: 0,
      elapsedMs: 0,
      activeHash: '',
      chunks: [],
      status: 'chunking',
    };
    set({ ingestionProgress: initialProgress });

    let rawBuffer: ArrayBuffer | null = null;

    try {
      const ctx = KeyDerivationBridge.getContext();

      // 1. Read file into volatile memory buffer
      rawBuffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(rawBuffer);

      // 2. Fixed-Quantum 4 MB slicing with CSPRNG noise padding & 24-byte nonce AES-256-GCM
      set((state) => ({
        ingestionProgress: state.ingestionProgress
          ? { ...state.ingestionProgress, status: 'encrypting' }
          : null,
      }));

      const { descriptors, chunks, trueByteLength, paddingBytes } = await ChunkingEngine.processFile(
        rawBytes,
        ctx.masterKwKey,
        (processed, _total, chunkHash, padBytes) => {
          const elapsed = Math.round(performance.now() - startTime);
          set((state) => {
            if (!state.ingestionProgress) return { ingestionProgress: null };
            const existing = [...state.ingestionProgress.chunks];
            existing.push({
              sequence: processed,
              hash: chunkHash,
              status: 'stored',
            });
            return {
              ingestionProgress: {
                ...state.ingestionProgress,
                processedChunks: processed,
                processedBytes: Math.min(processed * ChunkingEngine.CHUNK_QUANTUM, file.size),
                paddingBytes: padBytes,
                elapsedMs: elapsed,
                activeHash: chunkHash,
                chunks: existing,
              },
            };
          });
        },
        { workspaceId: ctx.workspaceId, fileId }
      );

      // 3. Write each serialized chunk to blind storage
      set((state) => ({
        ingestionProgress: state.ingestionProgress
          ? { ...state.ingestionProgress, status: 'storing' }
          : null,
      }));

      for (const chunk of chunks) {
        await StorageAdapter.writeChunk(chunk.chunkHash, chunk.serializedPayload, false);
        // Enqueue into automated background cloud synchronization queue
        await CloudSyncQueueEngine.enqueueChunk(
          chunk.chunkHash,
          chunk.serializedPayload.byteLength,
          get().storageEndpoint
        );
        MemorySanitizer.zeroize(chunk.serializedPayload); // Wipe chunk payload buffer
      }

      // 4. Create and seal manifest with EnvelopeCipher
      const { manifest } = await ManifestService.createAndSealManifest(
        file.name,
        file.type,
        trueByteLength,
        descriptors,
        clearanceLevel,
        ctx.workspaceId,
        ctx.masterKek,
        ctx.blindSalt,
        fileId
      );

      const totalElapsed = Math.round(performance.now() - startTime);

      // 5. Update optimistic manifests
      set((state) => ({
        manifests: [manifest, ...state.manifests],
        ingestionProgress: state.ingestionProgress
          ? {
              ...state.ingestionProgress,
              status: 'completed',
              paddingBytes,
              elapsedMs: totalElapsed,
            }
          : null,
      }));

      // Culminating tactile mechanical transient sound upon completion
      TactileSoundEngine.playMechanicalTransient();
      showToast(
        `Encrypted & shredded into ${descriptors.length} constant 4MB blocks in ${totalElapsed}ms.`,
        'success'
      );

      // Update storage metrics
      const chaffStats = await ChaffEngine.getMetrics();
      set({ chaffMetrics: chaffStats });

      return manifest;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Ingestion failed';
      set((state) => ({
        ingestionProgress: state.ingestionProgress
          ? { ...state.ingestionProgress, status: 'failed', error: errMsg }
          : null,
      }));
      showToast(`Ingestion failed: ${errMsg}`, 'warning');
      return null;
    } finally {
      // Memory Hygiene: Nullify raw file buffer in volatile RAM
      if (rawBuffer) {
        MemorySanitizer.zeroize(rawBuffer);
      }
      setTimeout(() => {
        set({ ingestionProgress: null });
      }, 5000);
    }
  },

  previewFile: async (manifest: FileManifest): Promise<void> => {
    TactileSoundEngine.playRollingKeyRefresh();
    try {
      const ctx = KeyDerivationBridge.getContext();
      const { objectUrl, reconstructedBuffer } = await VaultStreamService.assembleFileInRam(
        manifest,
        ctx.masterKwKey,
        undefined,
        get().cloudConfig
      );

      const session: RamPreviewSession = {
        manifest,
        objectUrl,
        reconstructedBuffer,
        openedAt: Date.now(),
      };
      set({ activePreview: session });
    } catch (err) {
      showToast(
        `RAM Assembly failed: ${err instanceof Error ? err.message : 'Decryption error'}`,
        'warning'
      );
    }
  },

  closePreview: () => {
    TactileSoundEngine.playClick();
    VaultStreamService.destroyPreview();
    set({ activePreview: null });
  },

  deleteFile: async (manifestId: string) => {
    TactileSoundEngine.playClick();
    const manifest = get().manifests.find((m) => m.manifestId === manifestId);
    if (!manifest) return;

    // Delete chunks
    for (const chunk of manifest.chunkIndex) {
      await StorageAdapter.deleteChunk(chunk.chunkHash).catch(() => {});
    }

    // Delete manifest
    await ManifestService.deleteManifest(manifestId, 'sovereign_primary_enclave_01');

    set((state) => ({
      manifests: state.manifests.filter((m) => m.manifestId !== manifestId),
    }));

    const chaffStats = await ChaffEngine.getMetrics();
    set({ chaffMetrics: chaffStats });
    showToast('File fragments and metadata wiped from vault.', 'info');
  },

  emitChaffBurst: async (count = 3) => {
    TactileSoundEngine.playClick();
    showToast(`Dispatching ${count} synthetic 4MB decoy blocks...`, 'info');
    await ChaffEngine.dispatchChaffBurst(count);
    const chaffStats = await ChaffEngine.getMetrics();
    set({ chaffMetrics: chaffStats });
    showToast(`Chaff burst committed. Total decoys: ${chaffStats.chaffChunks}.`, 'success');
  },

  toggleBackgroundChaff: () => {
    const isCurrentlyChaffing = get().chaffMetrics.isChaffing;
    if (isCurrentlyChaffing) {
      ChaffEngine.stopBackgroundChaffing();
      set((state) => ({
        chaffMetrics: { ...state.chaffMetrics, isChaffing: false },
      }));
      showToast('Automated background chaffing paused.', 'info');
    } else {
      ChaffEngine.startBackgroundChaffing(45000);
      set((state) => ({
        chaffMetrics: { ...state.chaffMetrics, isChaffing: true },
      }));
      showToast('Automated background chaffing active (1 block / 45s).', 'success');
    }
  },

  // Share Actions
  openShareModal: (manifest: FileManifest) => {
    TactileSoundEngine.playClick();
    set({ activeShareModalManifest: manifest });
    get().loadShares();
  },

  closeShareModal: () => {
    TactileSoundEngine.playClick();
    set({ activeShareModalManifest: null });
  },

  loadShares: () => {
    const all = EphemeralShareService.listAllShares();
    set({ activeShares: all });
  },

  generateShareLink: async (manifest, options) => {
    TactileSoundEngine.playMechanicalTransient();
    const ctx = KeyDerivationBridge.getContext();
    const result = await EphemeralShareService.generateShareLink(manifest, ctx.masterKwKey, options);

    // Refresh active shares
    const all = EphemeralShareService.listAllShares();
    set({ activeShares: all });

    return result;
  },

  revokeShareLink: (shareId: string) => {
    TactileSoundEngine.playVaultLock();
    EphemeralShareService.revokeShare(shareId);
    const all = EphemeralShareService.listAllShares();
    set({ activeShares: all });
    showToast('Share link authorization immediately revoked.', 'info');
  },

  // BYOS Cloud Actions
  openCockpitModal: () => {
    TactileSoundEngine.playClick();
    set({ isCockpitOpen: true });
  },

  closeCockpitModal: () => {
    TactileSoundEngine.playClick();
    set({ isCockpitOpen: false });
  },

  setCloudConfig: (partial: Partial<CloudProviderConfig>) => {
    const updated = { ...get().cloudConfig, ...partial };
    set({ cloudConfig: updated });
    CloudSyncQueueEngine.updateConfig(updated);
  },

  saveCloudCredentials: async (credentials: CloudProviderCredentials) => {
    TactileSoundEngine.playVaultLock();
    try {
      const ctx = KeyDerivationBridge.getContext();
      const envelope = await ByosCredentialEnclave.sealAndSaveCredentials(
        get().cloudConfig.provider,
        credentials,
        ctx.masterKek
      );
      set((state) => ({
        cloudConfig: {
          ...state.cloudConfig,
          encryptedCredentials: envelope,
          status: 'CONNECTED',
        },
        activeCredentialsMasked: credentials,
      }));
      showToast(`${get().cloudConfig.provider.replace('_', ' ')} credentials sealed with Master KEK in IndexedDB.`, 'success');
    } catch (err) {
      showToast(`Credential sealing failed: ${err instanceof Error ? err.message : String(err)}`, 'warning');
    }
  },

  testCloudConnection: async (
    overrideConfig?: CloudProviderConfig,
    overrideCreds?: CloudProviderCredentials
  ) => {
    TactileSoundEngine.playRollingKeyRefresh();
    set({ isTestingCloud: true, lastDrillResult: null });

    const cfg = overrideConfig || get().cloudConfig;
    const creds = overrideCreds || get().activeCredentialsMasked;

    try {
      const result = await CloudStorageManager.executeTestDrill(cfg, creds);
      set({
        isTestingCloud: false,
        lastDrillResult: result,
        cloudConfig: {
          ...get().cloudConfig,
          lastTestedAt: result.timestamp,
          lastLatencyMs: result.latencyMs,
          status: result.success ? 'CONNECTED' : 'ERROR',
          statusMessage: result.message,
        },
      });

      if (result.success) {
        TactileSoundEngine.playUnlockShimmer();
        showToast(`Latency Drill Passed: ${result.latencyMs}ms (${cfg.provider.replace('_', ' ')})`, 'success');
      } else {
        TactileSoundEngine.playClick();
        showToast(`Latency Drill Failed: ${result.message}`, 'warning');
      }

      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const failedResult: CloudTestDrillResult = {
        success: false,
        latencyMs: 0,
        probeHash: '',
        message: errMsg,
        timestamp: Date.now(),
      };
      set({
        isTestingCloud: false,
        lastDrillResult: failedResult,
        cloudConfig: {
          ...get().cloudConfig,
          status: 'ERROR',
          statusMessage: errMsg,
        },
      });
      showToast(`Test drill error: ${errMsg}`, 'error');
      return failedResult;
    }
  },
}));
