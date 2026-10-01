/* ============================================================
   SOVEREIGN-OS — Client-Side AI Engine Store (useAiStore)
   Governs active provider, encrypted credentials, in-memory keys,
   streaming state, latency telemetry, and PII redaction settings.
   ============================================================ */

import { create } from 'zustand';
import { AiKeyStore } from '../services/ai/AiKeyStore';
import { AiProviderBridge } from '../services/ai/AiProviderBridge';
import { LocalPiiRedactor } from '../services/ai/LocalPiiRedactor';
import { KeyDerivationBridge } from '../services/crypto/KeyDerivationBridge';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import type {
  AiProvider,
  AiProviderConfig,
  AiCompletionRequest,
  RedactionResult,
} from '../types';

interface AiState {
  activeProvider: AiProvider;
  configs: Record<AiProvider, AiProviderConfig>;
  inMemoryKeys: Record<AiProvider, string>;
  isStreaming: boolean;
  streamedContent: string;
  streamingError: string | null;
  lastLatencyMs: number | null;
  isConfigModalOpen: boolean;
  lastRedactionAudit: RedactionResult | null;

  // Actions
  initializeAiStore: () => Promise<void>;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  setActiveProvider: (provider: AiProvider) => void;
  setInMemoryKey: (provider: AiProvider, key: string) => void;
  saveProviderConfig: (
    provider: AiProvider,
    apiKey: string | null,
    partialConfig: Partial<AiProviderConfig>
  ) => Promise<void>;
  purgeProvider: (provider: AiProvider) => Promise<void>;
  testProviderConnection: (provider: AiProvider) => Promise<number>;
  executeStream: (
    request: AiCompletionRequest,
    onChunk?: (chunk: string) => void
  ) => Promise<string>;
  addCustomKeyword: (keyword: string) => void;
  removeCustomKeyword: (keyword: string) => void;
  toggleAggressivePii: () => void;
  resetStreamState: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  activeProvider: 'GEMINI',
  configs: AiKeyStore.getDefaultConfigs(),
  inMemoryKeys: {
    GEMINI: '',
    CLAUDE: '',
    OPENAI: '',
    OLLAMA: '',
  },
  isStreaming: false,
  streamedContent: '',
  streamingError: null,
  lastLatencyMs: null,
  isConfigModalOpen: false,
  lastRedactionAudit: null,

  initializeAiStore: async () => {
    try {
      const storedConfigs = await AiKeyStore.loadAllConfigs();
      set({ configs: storedConfigs });

      // If unlocked, hydrate in-memory keys
      if (KeyDerivationBridge.isUnlocked()) {
        const ctx = KeyDerivationBridge.getContext();
        const inMemory: Record<AiProvider, string> = { ...get().inMemoryKeys };
        for (const p of ['GEMINI', 'CLAUDE', 'OPENAI', 'OLLAMA'] as AiProvider[]) {
          if (storedConfigs[p]?.encryptedKey) {
            const rawKey = await AiKeyStore.extractRawApiKey(p, ctx.masterKek);
            inMemory[p] = rawKey;
          }
        }
        set({ inMemoryKeys: inMemory });
      }
    } catch (err) {
      console.warn('[AI_STORE] Failed to initialize AI store:', err);
    }
  },

  openConfigModal: () => {
    TactileSoundEngine.playClick();
    set({ isConfigModalOpen: true });
  },

  closeConfigModal: () => {
    TactileSoundEngine.playClick();
    set({ isConfigModalOpen: false });
  },

  setActiveProvider: (provider: AiProvider) => {
    TactileSoundEngine.playClick();
    set({ activeProvider: provider });
  },

  setInMemoryKey: (provider: AiProvider, key: string) => {
    set((state) => ({
      inMemoryKeys: {
        ...state.inMemoryKeys,
        [provider]: key,
      },
    }));
  },

  saveProviderConfig: async (
    provider: AiProvider,
    apiKey: string | null,
    partialConfig: Partial<AiProviderConfig>
  ) => {
    if (!KeyDerivationBridge.isUnlocked()) {
      throw new Error('SOVEREIGN_ENCLAVE_LOCKED: Master vault must be unlocked with operator passphrase before saving AI credentials.');
    }
    const masterKek = KeyDerivationBridge.getContext().masterKek;

    const updated = await AiKeyStore.saveProviderConfig(
      provider,
      apiKey,
      partialConfig,
      masterKek
    );

    set((state) => ({
      configs: {
        ...state.configs,
        [provider]: updated,
      },
      inMemoryKeys: apiKey
        ? { ...state.inMemoryKeys, [provider]: apiKey }
        : state.inMemoryKeys,
    }));
  },

  purgeProvider: async (provider: AiProvider) => {
    await AiKeyStore.purgeProvider(provider);
    set((state) => {
      const defaultCfg = AiKeyStore.getDefaultConfigs()[provider];
      return {
        configs: {
          ...state.configs,
          [provider]: defaultCfg,
        },
        inMemoryKeys: {
          ...state.inMemoryKeys,
          [provider]: '',
        },
      };
    });
  },

  testProviderConnection: async (provider: AiProvider) => {
    const state = get();
    const config = state.configs[provider];
    let key = state.inMemoryKeys[provider];

    if (!key && config.encryptedKey) {
      if (KeyDerivationBridge.isUnlocked()) {
        const ctx = KeyDerivationBridge.getContext();
        key = await AiKeyStore.extractRawApiKey(provider, ctx.masterKek);
        set((s) => ({ inMemoryKeys: { ...s.inMemoryKeys, [provider]: key } }));
      }
    }

    try {
      const latency = await AiProviderBridge.testConnection(provider, key, config);
      set((s) => ({
        lastLatencyMs: latency,
        configs: {
          ...s.configs,
          [provider]: {
            ...s.configs[provider],
            status: 'connected',
            lastTestedLatencyMs: latency,
            errorMessage: undefined,
          },
        },
      }));
      TactileSoundEngine.playAiCompletionChime();
      return latency;
    } catch (err: any) {
      set((s) => ({
        configs: {
          ...s.configs,
          [provider]: {
            ...s.configs[provider],
            status: 'error',
            errorMessage: err.message || 'Connection failed',
          },
        },
      }));
      throw err;
    }
  },

  executeStream: async (
    request: AiCompletionRequest,
    onChunk?: (chunk: string) => void
  ) => {
    const state = get();
    const provider = request.provider || state.activeProvider;
    const config = state.configs[provider];
    let key = state.inMemoryKeys[provider];

    if (!key && config.encryptedKey) {
      if (KeyDerivationBridge.isUnlocked()) {
        const ctx = KeyDerivationBridge.getContext();
        key = await AiKeyStore.extractRawApiKey(provider, ctx.masterKek);
        set((s) => ({ inMemoryKeys: { ...s.inMemoryKeys, [provider]: key } }));
      }
    }

    if (provider !== 'OLLAMA' && !key) {
      const err = `No active API key registered for ${provider}. Configure your key in BYO-AI Settings.`;
      set({ streamingError: err });
      throw new Error(err);
    }

    // 1. In-Memory PII & Entity Redaction Pre-Flight Scrubber
    const redactionResult = LocalPiiRedactor.sanitizePrompt(request.prompt, {
      aggressive: config.aggressivePiiRedaction,
      customKeywords: config.customKeywords,
    });

    const sanitizedRequest: AiCompletionRequest = {
      ...request,
      prompt: redactionResult.sanitizedText,
    };

    set({
      isStreaming: true,
      streamedContent: '',
      streamingError: null,
      lastRedactionAudit: redactionResult,
    });

    TactileSoundEngine.playAiSweepLaunch();

    try {
      const fullText = await AiProviderBridge.streamCompletion(
        provider,
        key,
        config,
        sanitizedRequest,
        (chunk) => {
          set((s) => ({ streamedContent: s.streamedContent + chunk }));
          if (onChunk) onChunk(chunk);
        }
      );

      TactileSoundEngine.playAiCompletionChime();
      set({ isStreaming: false });
      return fullText;
    } catch (err: any) {
      set({
        isStreaming: false,
        streamingError: err.message || 'AI streaming interrupted',
      });
      throw err;
    }
  },

  addCustomKeyword: (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    set((state) => {
      const provider = state.activeProvider;
      const currentKeywords = state.configs[provider].customKeywords || [];
      if (currentKeywords.includes(trimmed)) return state;

      return {
        configs: {
          ...state.configs,
          [provider]: {
            ...state.configs[provider],
            customKeywords: [...currentKeywords, trimmed],
          },
        },
      };
    });
  },

  removeCustomKeyword: (keyword: string) => {
    set((state) => {
      const provider = state.activeProvider;
      const currentKeywords = state.configs[provider].customKeywords || [];
      return {
        configs: {
          ...state.configs,
          [provider]: {
            ...state.configs[provider],
            customKeywords: currentKeywords.filter((k) => k !== keyword),
          },
        },
      };
    });
  },

  toggleAggressivePii: () => {
    set((state) => {
      const provider = state.activeProvider;
      const current = state.configs[provider].aggressivePiiRedaction;
      return {
        configs: {
          ...state.configs,
          [provider]: {
            ...state.configs[provider],
            aggressivePiiRedaction: !current,
          },
        },
      };
    });
  },

  resetStreamState: () => {
    set({
      isStreaming: false,
      streamedContent: '',
      streamingError: null,
    });
  },
}));
