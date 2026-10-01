// ============================================================
// SOVEREIGN-OS — P3 Security Remediation Verification Suite
// Tests Memory Hygiene, Cycle Detection, and Standardized URL Sharing
// ============================================================

import { fileURLToPath } from 'node:url';
import path from 'node:path';

console.log('\n🔒 Starting SOVEREIGN-OS P3 Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`✅ PASSED: ${message}`);
}

// In-memory runtime shims for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    location: { origin: 'https://sovereign-os.internal', hash: '', pathname: '' },
  };
}

// ------------------------------------------------------------
// TEST P3.1: Memory Hygiene & Zeroization on Failure
// ------------------------------------------------------------
console.log('--- [P3.1] Memory Hygiene: Partial-Decryption Zeroization on Failure ---');

const { VaultStreamService } = await import('./src/services/storage/VaultStreamService.ts');
const { StorageAdapter } = await import('./src/services/storage/StorageAdapter.ts');
const { ChunkingEngine } = await import('./src/services/storage/ChunkingEngine.ts');
const { MemorySanitizer } = await import('./src/services/crypto/MemorySanitizer.ts');

// Mock StorageAdapter chunk persistence for testing environment
const inMemoryChunkStorage = new Map();
StorageAdapter.readChunk = async (hash) => {
  const data = inMemoryChunkStorage.get(hash);
  if (!data) throw new Error(`Chunk ${hash} not found in test memory`);
  return data;
};
StorageAdapter.writeChunk = async (hash, payload) => {
  inMemoryChunkStorage.set(hash, payload);
  return `local://${hash}.bin`;
};

// Create Master KW Key
const kwKey = await crypto.subtle.generateKey(
  { name: 'AES-KW', length: 256 },
  false,
  ['wrapKey', 'unwrapKey']
);

// Process a 2-chunk file (e.g. 5 MB)
const rawData = new Uint8Array(5 * 1024 * 1024);
for (let i = 0; i < rawData.length; i++) {
  rawData[i] = (i % 250) + 1; // Non-zero bytes
}

const chunked = await ChunkingEngine.processFile(rawData, kwKey, undefined, {
  workspaceId: 'sovereign_vault',
  fileId: 'manifest_fail_test_01',
});
assert(chunked.chunks.length === 2, 'Generated 2-chunk payload for failure simulation');

// Store chunk 0 in StorageAdapter
await StorageAdapter.writeChunk(chunked.chunks[0].chunkHash, chunked.chunks[0].serializedPayload, false);

// Leave chunk 1 missing so chunk 1 fetch fails
const testManifest = {
  manifestId: 'manifest_fail_test_01',
  originalFileName: 'classified_intel.bin',
  mimeType: 'application/octet-stream',
  trueByteLength: rawData.byteLength,
  chunkIndex: chunked.descriptors,
  totalChunks: 2,
  createdAt: Date.now(),
  clearanceLevel: 1,
  hmacSignature: 'sig_test',
};

let assemblyFailed = false;
try {
  await VaultStreamService.assembleFileInRam(testManifest, kwKey);
} catch (err) {
  assemblyFailed = true;
  assert(
    err instanceof Error,
    `assembleFileInRam rejected as expected upon missing chunk: ${err.message}`
  );
}

assert(assemblyFailed, 'File assembly threw error when chunk 1 was unavailable');

// Test active preview destruction & previous preview zeroization
// 1. Create a successful 1-chunk file
const sample1Chunk = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
const sampleChunked = await ChunkingEngine.processFile(sample1Chunk, kwKey, undefined, {
  workspaceId: 'sovereign_vault',
  fileId: 'manifest_valid_test_01',
});
await StorageAdapter.writeChunk(
  sampleChunked.chunks[0].chunkHash,
  sampleChunked.chunks[0].serializedPayload,
  false
);

const validManifest = {
  manifestId: 'manifest_valid_test_01',
  originalFileName: 'valid_data.bin',
  mimeType: 'application/octet-stream',
  trueByteLength: sample1Chunk.byteLength,
  chunkIndex: sampleChunked.descriptors,
  totalChunks: 1,
  createdAt: Date.now(),
  clearanceLevel: 1,
  hmacSignature: 'sig_valid',
};

const session1 = await VaultStreamService.assembleFileInRam(validManifest, kwKey);
assert(VaultStreamService.getActivePreview() !== null, 'Active preview session created');
const buffer1Ref = session1.reconstructedBuffer;

// 2. Assembling a second file must automatically destroy and zeroize session1
const sample2Chunk = new Uint8Array([99, 88, 77, 66]);
const sample2Chunked = await ChunkingEngine.processFile(sample2Chunk, kwKey, undefined, {
  workspaceId: 'sovereign_vault',
  fileId: 'manifest_valid_test_02',
});
await StorageAdapter.writeChunk(
  sample2Chunked.chunks[0].chunkHash,
  sample2Chunked.chunks[0].serializedPayload,
  false
);

const validManifest2 = {
  manifestId: 'manifest_valid_test_02',
  originalFileName: 'valid_data_2.bin',
  mimeType: 'application/octet-stream',
  trueByteLength: sample2Chunk.byteLength,
  chunkIndex: sample2Chunked.descriptors,
  totalChunks: 1,
  createdAt: Date.now(),
  clearanceLevel: 1,
  hmacSignature: 'sig_valid_2',
};

await VaultStreamService.assembleFileInRam(validManifest2, kwKey);

// Verify buffer1Ref was zeroized upon opening session2
let nonZeroCount = 0;
for (let i = 0; i < buffer1Ref.length; i++) {
  if (buffer1Ref[i] !== 0) nonZeroCount++;
}
assert(
  nonZeroCount === 0,
  'Previous preview session buffer was completely wiped (zeroized) upon new assembly'
);

// Destroy second session
VaultStreamService.destroyPreview();
assert(VaultStreamService.getActivePreview() === null, 'Active preview session destroyed');

// ------------------------------------------------------------
// TEST P3.2: Dependency-Cycle Detection in Graph Engine
// ------------------------------------------------------------
console.log('\n--- [P3.2] Dependency-Cycle Detection in Graph Engine ---');

const { DependencyLockEngine } = await import('./src/services/blueprint/DependencyLockEngine.ts');
const { useBlueprintStore } = await import('./src/stores/useBlueprintStore.ts');

// Case A: Self-loop A -> A
assert(
  DependencyLockEngine.wouldCreateCycle('nodeA', 'nodeA', []) === true,
  'Cycle detector rejects self-loop (nodeA -> nodeA)'
);

// Case B: Valid DAG (A -> B -> C, adding C -> D)
const dagEdges = [
  { sourceId: 'nodeA', targetId: 'nodeB' },
  { sourceId: 'nodeB', targetId: 'nodeC' },
];
assert(
  DependencyLockEngine.wouldCreateCycle('nodeC', 'nodeD', dagEdges) === false,
  'Cycle detector permits valid DAG addition (nodeC -> nodeD)'
);

// Case C: Direct cycle (A -> B, adding B -> A)
assert(
  DependencyLockEngine.wouldCreateCycle('nodeB', 'nodeA', [{ sourceId: 'nodeA', targetId: 'nodeB' }]) ===
    true,
  'Cycle detector rejects direct cycle (nodeB -> nodeA when nodeA -> nodeB exists)'
);

// Case D: Transitive cycle (A -> B -> C -> D, adding D -> A)
const chainEdges = [
  { sourceId: 'nodeA', targetId: 'nodeB' },
  { sourceId: 'nodeB', targetId: 'nodeC' },
  { sourceId: 'nodeC', targetId: 'nodeD' },
];
assert(
  DependencyLockEngine.wouldCreateCycle('nodeD', 'nodeA', chainEdges) === true,
  'Cycle detector rejects transitive cycle (nodeD -> nodeA across 4-node chain)'
);

// Case E: Diamond DAG addition (A -> B, A -> C, B -> D, C -> D, adding A -> D)
const diamondEdges = [
  { sourceId: 'nodeA', targetId: 'nodeB' },
  { sourceId: 'nodeA', targetId: 'nodeC' },
  { sourceId: 'nodeB', targetId: 'nodeD' },
  { sourceId: 'nodeC', targetId: 'nodeD' },
];
assert(
  DependencyLockEngine.wouldCreateCycle('nodeA', 'nodeD', diamondEdges) === false,
  'Cycle detector permits valid multi-path diamond DAG (nodeA -> nodeD)'
);

// Case F: Cycle within diamond (adding D -> A)
assert(
  DependencyLockEngine.wouldCreateCycle('nodeD', 'nodeA', diamondEdges) === true,
  'Cycle detector blocks cycle in diamond DAG (nodeD -> nodeA)'
);

// Case G: Verify Blueprint Store addEdge throws exact error message
let storeErrorThrew = false;
try {
  useBlueprintStore.setState({
    edges: [
      {
        id: 'e1',
        sourceId: 'task_alpha',
        targetId: 'task_beta',
        throughputRate: 1,
        particleVelocity: 1,
        isActive: true,
        clearance: 'LEVEL_1',
      },
    ],
  });
  useBlueprintStore.getState().addEdge({
    id: 'e2',
    sourceId: 'task_beta',
    targetId: 'task_alpha',
    throughputRate: 1,
    particleVelocity: 1,
    isActive: true,
    clearance: 'LEVEL_1',
  });
} catch (err) {
  storeErrorThrew = true;
  assert(
    err.message === 'This would create a circular dependency and permanently lock both nodes.',
    `addEdge threw exact expected message: "${err.message}"`
  );
}
assert(storeErrorThrew, 'useBlueprintStore.addEdge actively blocked circular edge');

// ------------------------------------------------------------
// TEST P3.3: Standardized Share Link URL Format
// ------------------------------------------------------------
console.log('\n--- [P3.3] Standardized Share Link URL Structure ---');

const { EphemeralShareService } = await import('./src/services/storage/EphemeralShareService.ts');

const shareResult = await EphemeralShareService.generateShareLink(validManifest, kwKey, {
  expiration: '24h',
  burnOnDownload: false,
});

console.log(`  Generated Share URL: ${shareResult.shareUrl}`);

// 1. Verify URL does NOT contain non-standard query or nested hash patterns
assert(!shareResult.shareUrl.includes('?id='), 'Share URL does NOT contain legacy "?id=" query parameter');
assert(!shareResult.shareUrl.includes('#key='), 'Share URL does NOT contain legacy "#key=" fragment');

// 2. Verify clean path segment format: /#/vault/share/${shareId}/${shareKeyHex}
const expectedPattern = /#\/vault\/share\/[a-fA-F0-9-]+\/[a-fA-F0-9]{64}$/;
assert(
  expectedPattern.test(shareResult.shareUrl),
  `Share URL conforms to standardized path-segment route: ${shareResult.shareUrl}`
);

// 3. Verify path segment parsing extracts accurate parameters
const routeParts = shareResult.shareUrl.split('/vault/share/')[1].split('/');
const parsedShareId = routeParts[0];
const parsedShareKeyHex = routeParts[1];

assert(parsedShareId === shareResult.record.shareId, 'Parsed shareId matches record.shareId');
assert(parsedShareKeyHex === shareResult.shareKeyHex, 'Parsed shareKeyHex matches generated key hex');

// 4. Verify record can be retrieved
const fetchedRecord = EphemeralShareService.fetchShareRecord(parsedShareId);
assert(fetchedRecord !== null, 'Share record is retrievable via parsed shareId');

// ------------------------------------------------------------
// TEST P3.4: PII Purged from DEFAULT_THREAT_CONFIG
// ------------------------------------------------------------
console.log('\n--- [P3.4] DEFAULT_THREAT_CONFIG PII Purge Verification ---');

const { DEFAULT_THREAT_CONFIG } = await import('./src/services/security/ThreatDetectionEngine.ts');

assert(
  DEFAULT_THREAT_CONFIG.recipients.length === 0,
  'DEFAULT_THREAT_CONFIG has empty recipients array (all mock names, emails, phones purged)'
);

const mockNamesFound = JSON.stringify(DEFAULT_THREAT_CONFIG).includes('Alexander Sterling');
assert(!mockNamesFound, 'Zero mock operator names present in default configuration');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} P3 SECURITY VERIFICATIONS PASSED!\n`);
process.exit(0);
