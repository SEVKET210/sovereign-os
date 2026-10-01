/* ============================================================
   SOVEREIGN-OS — Universal Domain Types & System Contracts
   ============================================================ */

import type { SystemRole } from './team';
export type { SystemRole } from './team';
export * from './auth';

export type ThemePresetId = 'obsidian' | 'nordic' | 'brass' | 'cypherpunk';

export type ClearanceLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

export interface ClearanceTierInfo {
  level: ClearanceLevel;
  numeric: number;
  label: string;
  badge: string;
  description: string;
}

export const CLEARANCE_TIERS: Record<ClearanceLevel, ClearanceTierInfo> = {
  LEVEL_1: {
    level: 'LEVEL_1',
    numeric: 1,
    label: 'Standard Operator',
    badge: 'CLEARANCE // L1',
    description: 'Basic task execution, read-only telemetry access.',
  },
  LEVEL_2: {
    level: 'LEVEL_2',
    numeric: 2,
    label: 'Tactical Analyst',
    badge: 'CLEARANCE // L2',
    description: 'Petty cash operations, secondary node routing.',
  },
  LEVEL_3: {
    level: 'LEVEL_3',
    numeric: 3,
    label: 'Treasury Controller',
    badge: 'CLEARANCE // L3',
    description: 'Dual-signatory reserves, cross-currency liquidation.',
  },
  LEVEL_4: {
    level: 'LEVEL_4',
    numeric: 4,
    label: 'Sovereign Sovereign Enclave',
    badge: 'CLEARANCE // L4',
    description: 'Root cryptographic keys, zero-knowledge DAG unmasking.',
  },
};

/* ── Blueprint Node Data Types ───────────────────────────── */

export type BlueprintNodeType =
  | 'task'
  | 'vaultFile'
  | 'budget'
  | 'narrative'
  | 'autonomousSummary';

export interface BaseNodeData {
  id: string;
  type: BlueprintNodeType;
  title: string;
  x: number;
  y: number;
  clearance: ClearanceLevel;
  status: 'active' | 'pending' | 'locked' | 'completed' | 'review';
  markdownNotes?: string;
  visibilityScope?: 'ALL' | 'ASSIGNED_ONLY' | 'MANAGERS_ONLY';
  allowedRoles?: SystemRole[];
}

export interface TaskNodeData extends BaseNodeData {
  type: 'task';
  assignee: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaCountdownSeconds: number;
  checklist: Array<{ id: string; text: string; completed: boolean }>;
}

export interface VaultFileNodeData extends BaseNodeData {
  type: 'vaultFile';
  fileHash: string;
  fragmentCount: number;
  sizeBytes: number;
  cipher: 'AES-256-GCM';
  inMemoryDecryptedPreview?: string;
  manifestId?: string;
}

export interface BudgetNodeData extends BaseNodeData {
  type: 'budget';
  allocatedAmount: number;
  spentAmount: number;
  currency: string;
  autoBlockExhausted: boolean;
}

export interface NarrativeNodeData extends BaseNodeData {
  type: 'narrative';
  currentChapter: number;
  totalChapters: number;
  milestoneTitle: string;
  objectives: string[];
}

export interface AutonomousSummaryNodeData extends BaseNodeData {
  type: 'autonomousSummary';
  linkedBranchCount: number;
  branchHealthScore: number;
  aiGeneratedSummary: string;
}

export type BlueprintNode =
  | TaskNodeData
  | VaultFileNodeData
  | BudgetNodeData
  | NarrativeNodeData
  | AutonomousSummaryNodeData;

export interface KineticBezierEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  throughputRate: number; // ops/sec or burn rate
  particleVelocity: number;
  isActive: boolean;
  clearance: ClearanceLevel;
}

/* ── Multi-Vault Treasury Types ──────────────────────────── */

export type VaultId = 'petty_cash' | 'commercial_reserve' | 'forex_metals' | 'digital_assets';

export interface LiquidityVault {
  id: VaultId;
  name: string;
  category: 'Physical' | 'Commercial Banking' | 'Forex & Metals' | 'Digital Assets';
  balance: number;
  currency: string;
  usdEquivalent: number;
  allocationPercent: number;
  change24h: number;
  description: string;
  lastAuditedBlock: number;
}

export interface ChainedLedgerEntry {
  index: number;
  timestamp: number;
  vaultId: VaultId;
  amount: number;
  currency: string;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  signatory: string;
  prevHash: string;
  hash: string;
  isOffsetting?: boolean;
}

export interface RunwayTelemetry {
  rolling90DayExpenditure: number;
  unreservedLiquidity: number;
  survivalMonths: number;
  burnRatePerDay: number;
  runwayHealth: 'CRITICAL' | 'RESTRICTED' | 'NOMINAL' | 'SOVEREIGN';
}

/* ── Settings, Storage & AI Types ────────────────────────── */

export interface ByosStorageConfig {
  provider: 'AWS_S3' | 'CLOUDFLARE_R2' | 'MINIO' | 'GOOGLE_DRIVE' | 'WEBDAV' | 'VDS_LOCAL';
  endpoint: string;
  bucketName: string;
  region: string;
  clientSideKeyEncrypted: string;
  chunkSizeBytes: number; // default 4 * 1024 * 1024 (4 MB)
  enabled: boolean;
}

export interface CloudProviderCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  googleDriveAccessToken?: string;
  googleDriveFolderId?: string;
  webdavUsername?: string;
  webdavPassword?: string;
}

export interface CloudProviderConfig {
  provider: StorageEndpoint;
  endpointUrl: string;
  bucketName: string;
  region: string;
  encryptedCredentials?: EncryptedEnvelope;
  enabled: boolean;
  lastTestedAt?: number;
  lastLatencyMs?: number;
  status: 'DISCONNECTED' | 'CONNECTED' | 'ERROR' | 'TESTING';
  statusMessage?: string;
}

export interface CloudTestDrillResult {
  success: boolean;
  latencyMs: number;
  probeHash: string;
  message: string;
  timestamp: number;
}

export interface CloudSyncTelemetry {
  activeProvider: StorageEndpoint;
  synchronizedBlockCount: number;
  pendingQueueCount: number;
  totalRemoteBytes: number;
  syncState: 'IDLE' | 'SYNCING' | 'BUFFERED_OFFLINE' | 'ERROR';
  lastSyncTimestamp: number | null;
}

export type AiProvider = 'GEMINI' | 'CLAUDE' | 'OPENAI' | 'OLLAMA';

export interface AiModelDescriptor {
  id: string;
  label: string;
  provider: AiProvider;
  contextWindow: string;
  defaultTemperature: number;
  isLocal?: boolean;
}

export interface AiProviderConfig {
  provider: AiProvider;
  encryptedKey?: EncryptedEnvelope;
  customEndpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  aggressivePiiRedaction: boolean;
  customKeywords: string[];
  lastTestedLatencyMs?: number;
  status: 'untested' | 'connected' | 'error';
  errorMessage?: string;
}

export interface AiCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  provider?: AiProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customEndpoint?: string;
}

export interface RedactedToken {
  original: string;
  replacement: string;
  category: 'EMAIL' | 'IP_ADDRESS' | 'FINANCIAL' | 'CRYPTO_TOKEN' | 'CORPORATE_ENTITY';
}

export interface RedactionResult {
  sanitizedText: string;
  redactedCount: number;
  tokens: RedactedToken[];
}

export interface DagTopologyContext {
  targetNodeId: string;
  title: string;
  type: BlueprintNodeType;
  clearance: ClearanceLevel;
  upstreamDependencies: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    checklistSummary?: string;
  }>;
  downstreamImpacts: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  checklistCount: number;
  completedChecklistCount: number;
  notes?: string;
  serializedSystemPrompt: string;
}

export interface ByoAiRegistryConfig {
  provider: AiProvider;
  customEndpointUrl?: string;
  apiKeyMasked: string;
  localDirectFetchOnly: boolean;
  modelIdentifier: string;
  enabled: boolean;
}

export interface TactileAudioSettings {
  masterVolume: number; // 0.0 to 1.0
  enabled: boolean;
  mechanicalClicks: boolean;
  vaultLocks: boolean;
  subBassThuds: boolean;
}

/* ── Auth & Attestation Types ────────────────────────────── */

export interface PreBootAttestationReport {
  timestamp: number;
  wasmIntegrityVerified: boolean;
  entropyPoolAvailable: boolean;
  screenCaptureListenersActive: boolean;
  status: 'AUDITING' | 'ATTESTED' | 'FAILED';
  enclaveFingerprint: string;
}

export interface RollingKeySession {
  dynamicKeyFormatted: string; // XXXX-XXXX-XXXX
  ttlSecondsRemaining: number;
  windowSizeSeconds: number;
  sessionNonce: string;
}

/* ── Zero-Knowledge & Envelope Encryption Contracts ─────── */

export interface EncryptedEnvelope {
  v: number;              // Envelope version
  nonce: string;          // 96-bit (12-byte) IV in hex
  wrapped_dek: string;    // Ephemeral 256-bit DEK wrapped with Master KEK
  auth_tag: string;       // 128-bit (16-byte) GCM authentication tag in hex
  ciphertext: string;     // AES-256-GCM encrypted ciphertext in hex
  timestamp: number;      // Seal timestamp
  record_id?: string;
  field_name?: string;
  schema_version?: number;
}

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id?: number;            // IndexedDB auto-increment primary key
  queue_id: string;       // UUID v4
  table_name: 'blind_blueprint_nodes' | 'blind_blueprint_edges' | 'blind_chained_ledger' | 'sovereign_workspaces' | 'incident_egress_queue';
  operation: SyncOperation;
  record_id: string;
  payload_envelope: EncryptedEnvelope | Record<string, unknown>;
  clearance_level?: number;
  blind_index_tokens?: string[];
  status: SyncStatus;
  retries: number;
  created_at: number;
  synced_at?: number;
  last_error?: string;
}

export interface WorkspaceCryptoContext {
  workspaceId: string;
  workspaceTokenHash: string;
  masterKek: CryptoKey;
  masterKwKey: CryptoKey;
  blindSalt: Uint8Array;
  authMethod: 'WEBAUTHN_PRF' | 'PBKDF2_310K';
  initializedAt: number;
}

export interface ZkSyncTelemetry {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTimestamp: number | null;
  encryptionEngine: 'AES-256-GCM (FLEE)';
  keyDerivation: 'WebAuthn PRF / PBKDF2 @ 310,000 iter';
  isKeyUnlocked: boolean;
}

/* ── Blind BYOS Storage & In-Memory Vault Contracts ─────── */

export interface ChunkDescriptor {
  chunkSequence: number;
  chunkHash: string;
  byteRange: [number, number];
}

export interface FileManifest {
  manifestId: string;
  workspaceId?: string;
  originalFileName: string;
  mimeType: string;
  trueByteLength: number;
  totalChunks: number;
  chunkIndex: ChunkDescriptor[];
  clearanceLevel: number; // 1 to 4
  createdAt: string; // ISO 8601 UTC
  integritySignature: string; // HMAC-SHA256 signature
}

export type StorageEndpoint = 'VDS_LOCAL' | 'AWS_S3' | 'CLOUDFLARE_R2' | 'MINIO' | 'GOOGLE_DRIVE' | 'WEBDAV';

export interface VaultIngestionProgress {
  fileId: string;
  fileName: string;
  totalBytes: number;
  processedBytes: number;
  totalChunks: number;
  processedChunks: number;
  paddingBytes: number;
  elapsedMs: number;
  activeHash?: string;
  chunks: Array<{
    sequence: number;
    hash: string;
    status: 'slicing' | 'padding' | 'encrypting' | 'stored';
  }>;
  status: 'idle' | 'chunking' | 'encrypting' | 'storing' | 'completed' | 'failed';
  error?: string;
}

export interface ChaffMetrics {
  authenticChunks: number;
  chaffChunks: number;
  isChaffing: boolean;
}

export interface RamPreviewSession {
  manifest: FileManifest;
  objectUrl: string;
  reconstructedBuffer: Uint8Array;
  openedAt: number;
}

/* ── Sprint Nine: Zero-Knowledge Ephemeral Share Link Types ────── */

export type ShareExpirationOption = '1h' | '24h' | '7d';

export type ShareLinkStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'BURNED';

export interface EphemeralShareRecord {
  shareId: string;
  manifestId: string;
  fileName: string;
  mimeType: string;
  trueByteLength: number;
  clearanceLevel: number;
  createdAt: number;
  expiresAt: number;
  burnOnDownload: boolean;
  downloadCount: number;
  status: ShareLinkStatus;
  encryptedManifestPayload: EncryptedEnvelope; // Sealed with ephemeral share key
  shareSignature: string; // HMAC integrity signature
}

/* ── Sprint Four: Kanban, Market Telemetry, and Translation Types ─ */

export type KanbanColumnId = 'pending' | 'active' | 'review' | 'completed' | 'locked';

export type KanbanViewMode = 'canvas' | 'kanban';

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string;
  color: string;
  badge: string;
  description: string;
}

export type MarketPairSymbol = 'USD/TRY' | 'EUR/TRY' | 'EUR/USD' | 'BTC/USDT' | 'ETH/USDT' | 'XAU/USD' | (string & {});

export interface MarketTickData {
  symbol: MarketPairSymbol;
  label: string;
  price: number;
  change24h: number;
  tickDirection: 'up' | 'down' | 'neutral';
  formattedPrice: string;
  lastTickTimestamp: number;
}

export interface ConsolidatedRunwayValuation {
  baseLiquidityUSD: number;
  currentRunwayMonths: number;
  burnRatePerDayUSD: number;
  eurUsdRate: number;
  btcUsdRate: number;
  updatedAt: number;
}

export type SupportedTranslationLang = 'en' | 'tr' | 'zh' | 'de' | 'ru';

export interface TerminologyShieldEntry {
  placeholder: string;
  originalTerm: string;
  category: 'CODENAME' | 'HASH' | 'VARIABLE' | 'TOKEN';
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: SupportedTranslationLang;
  shieldedTermsCount: number;
  timestamp: number;
}

/* ── Sprint Seven: Zero-Knowledge Comms & Command Network Types ─ */

export type CommsChannelType = 'public' | 'departmental' | 'executive' | 'sovereign' | 'direct';

export interface CommsChannel {
  id: string;
  blindId: string; // HMAC-SHA256 blind channel identifier
  name: string;
  topic: string;
  clearance: ClearanceLevel;
  type: CommsChannelType;
  participantIds?: string[];
  unreadCount?: number;
  createdAt: number;
}

export type EphemeralBurnMode = 'none' | '30s' | 'burn_on_read';

export interface DecisionSealBlock {
  blockIndex: number;
  hash: string;
  prevHash: string;
  timestamp: number;
  signatory: string;
  reason: string;
  messageDigest: string;
}

export interface MessagePayload {
  id: string;
  channelBlindId: string;
  channelId: string;
  senderId: string;
  senderAlias: string;
  senderClearance: ClearanceLevel;
  timestamp: number;
  content: string; // Plaintext when in volatile RAM
  isEphemeral: boolean;
  burnMode: EphemeralBurnMode;
  burnTimerSeconds?: number;
  expiresAt?: number;
  isBurned?: boolean;
  isRead?: boolean;
  embeddedBlueprintNodeId?: string;
  embeddedVaultManifestId?: string;
  isSealed: boolean;
  sealLedgerBlock?: DecisionSealBlock;
  translation?: {
    translatedText: string;
    targetLang: SupportedTranslationLang;
    shieldedCount: number;
  };
}

export interface EncryptedCommsEnvelope {
  id: string;
  channelBlindId: string;
  envelope: EncryptedEnvelope;
  senderId: string;
  timestamp: number;
  isEphemeral: boolean;
  burnMode: EphemeralBurnMode;
  expiresAt?: number;
}

/* ── Sprint Eight: Zero-Knowledge Corporate Notebook & Wiki Types ─ */

export type DocumentPublicationStatus = 'draft' | 'in-review' | 'published' | 'archived';

export type DocumentCategory = 'wiki' | 'runbook' | 'contract' | 'meeting' | 'narrative' | 'roadmap';

export type DocumentCoverStyle =
  | 'obsidian-mesh'
  | 'titanium-linear'
  | 'monastic-amber'
  | 'cypher-matrix'
  | 'blueprint-grid';

export interface DocumentSealedBlock {
  blockIndex: number;
  hash: string;
  prevHash: string;
  timestamp: number;
  signatory: string;
  documentDigest: string;
  mandateReason: string;
}

export interface CorporateDocument {
  id: string;
  folderId: string | null;
  title: string;
  icon: string;
  coverStyle: DocumentCoverStyle;
  clearance: ClearanceLevel;
  status: DocumentPublicationStatus;
  category: DocumentCategory;
  tags: string[];
  authorAlias: string;
  createdAt: number;
  updatedAt: number;
  content: string; // Markdown formatted body in volatile RAM
  boundBlueprintNodeId?: string; // Linked DAG Node (Task or Narrative)
  isSealed: boolean;
  sealLedgerBlock?: DocumentSealedBlock;
}

export interface DocumentFolder {
  id: string;
  name: string;
  clearance: ClearanceLevel;
  parentId: string | null;
  icon?: string;
}

export interface EncryptedDocEnvelope {
  id: string;
  blindTitleToken: string;
  blindKeywordTokens: string[];
  clearanceNumeric: number;
  envelope: EncryptedEnvelope;
  updatedAt: number;
}

export * from './incident';


