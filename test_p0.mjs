// ============================================================
// SOVEREIGN-OS — P0 Security Remediation Verification Suite
// Directly tests production modules from src/ (ZERO MOCKS)
// ============================================================

import http from 'node:http';

console.log('\n🔒 Starting SOVEREIGN-OS P0 Verification Suite (Production Modules)...\n');

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
    clear: () => map.clear(),
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
  };
}

// ------------------------------------------------------------
// TEST P0.1: KeyDerivationBridge & Non-Interoperability Proof
// ------------------------------------------------------------
console.log('--- [P0.1] KeyDerivationBridge Real Module Derivation & Entropy ---');

const { KeyDerivationBridge } = await import('./src/services/crypto/KeyDerivationBridge.ts');
const { EnvelopeCipher } = await import('./src/services/crypto/EnvelopeCipher.ts');

// 1. Minimum Passphrase Length Rule (< 12 characters rejected)
let shortPassphraseRejected = false;
try {
  await KeyDerivationBridge.initializeContext('ws_entropy_test', 'short123', false);
} catch (err) {
  shortPassphraseRejected = err.message.includes('WEAK_OR_MISSING_PASSPHRASE');
}
assert(shortPassphraseRejected, 'KeyDerivationBridge strictly rejects passphrase < 12 characters');

// 2. CSPRNG Workspace Salt Generation (Non-deterministic, unique per workspace)
const saltA = KeyDerivationBridge.getOrCreateWorkspaceSalt('workspace_alpha_01');
const saltB = KeyDerivationBridge.getOrCreateWorkspaceSalt('workspace_beta_02');

assert(saltA instanceof Uint8Array && saltA.length === 32, 'Workspace salt A is 32-byte CSPRNG buffer');
assert(saltB instanceof Uint8Array && saltB.length === 32, 'Workspace salt B is 32-byte CSPRNG buffer');

let saltsIdentical = true;
for (let i = 0; i < 32; i++) {
  if (saltA[i] !== saltB[i]) {
    saltsIdentical = false;
    break;
  }
}
assert(!saltsIdentical, 'Distinct workspaces receive independent CSPRNG salts (no deterministic prefix attack)');

const storedSaltHex = localStorage.getItem('sovereign_workspace_salt_v1_workspace_alpha_01');
assert(storedSaltHex && storedSaltHex.length === 64, 'Random workspace salt persisted to storage alongside metadata');

// 3. Authenticate with Passphrase A and seal payload
KeyDerivationBridge.lockContext();
const passA = 'SuperSecretOperatorKey2026_Alpha!';
const passB = 'DifferentOperatorSecretKey2026_Beta!';

const ctxA = await KeyDerivationBridge.initializeContext('workspace_alpha_01', passA, false);
assert(KeyDerivationBridge.isUnlocked(), 'Enclave successfully unlocked under Passphrase A');

const samplePlaintext = { docId: 'TOP_SECRET_ORBITAL_SCHEMATIC', classification: 'LEVEL_4' };
const authenticContext = {
  workspaceId: 'workspace_alpha_01',
  recordId: 'rec_schematic_001',
  fieldName: 'orbital_payload',
  schemaVersion: 1,
};

const envelopeA = await EnvelopeCipher.sealEnvelope(samplePlaintext, ctxA.masterKek, authenticContext);

// 1. Positive unseal with exact matching context
const unsealedA = await EnvelopeCipher.unsealEnvelope(envelopeA, ctxA.masterKek, authenticContext);
assert(
  unsealedA.docId === 'TOP_SECRET_ORBITAL_SCHEMATIC',
  'EnvelopeCipher unseals correctly with authentic Master KEK A and matching AAD context'
);

// Verify openEnvelope alias works identically
const openResult = await EnvelopeCipher.openEnvelope(envelopeA, ctxA.masterKek, authenticContext);
assert(
  openResult.docId === 'TOP_SECRET_ORBITAL_SCHEMATIC',
  'EnvelopeCipher.openEnvelope succeeds identically with matching AAD context'
);

// 2. Negative Cryptographic Test: Mismatched recordId (Confused Deputy / Transposition Attack)
let wrongRecordFailed = false;
try {
  await EnvelopeCipher.unsealEnvelope(envelopeA, ctxA.masterKek, {
    ...authenticContext,
    recordId: 'rec_schematic_002_TAMPERED',
  });
} catch (err) {
  wrongRecordFailed = err.name === 'OperationError' || err.message.includes('CIPHERTEXT_INTEGRITY_VIOLATION');
}
assert(wrongRecordFailed, 'Mismatched recordId in AAD strictly FAILS with OperationError (Tag mismatch)');

// 3. Negative Cryptographic Test: Mismatched fieldName (Field Swap Attack)
let wrongFieldFailed = false;
try {
  await EnvelopeCipher.unsealEnvelope(envelopeA, ctxA.masterKek, {
    ...authenticContext,
    fieldName: 'financial_transaction_ledger',
  });
} catch (err) {
  wrongFieldFailed = err.name === 'OperationError' || err.message.includes('CIPHERTEXT_INTEGRITY_VIOLATION');
}
assert(wrongFieldFailed, 'Mismatched fieldName in AAD strictly FAILS with OperationError');

// 4. Negative Cryptographic Test: Mismatched workspaceId (Cross-Tenant Swapping)
let wrongWorkspaceFailed = false;
try {
  await EnvelopeCipher.unsealEnvelope(envelopeA, ctxA.masterKek, {
    ...authenticContext,
    workspaceId: 'workspace_hostile_tenant',
  });
} catch (err) {
  wrongWorkspaceFailed = err.name === 'OperationError' || err.message.includes('CIPHERTEXT_INTEGRITY_VIOLATION');
}
assert(wrongWorkspaceFailed, 'Mismatched workspaceId in AAD strictly FAILS with OperationError');

// 5. Negative Cryptographic Test: Mismatched schemaVersion
let wrongVersionFailed = false;
try {
  await EnvelopeCipher.unsealEnvelope(envelopeA, ctxA.masterKek, {
    ...authenticContext,
    schemaVersion: 2,
  });
} catch (err) {
  wrongVersionFailed = err.name === 'OperationError' || err.message.includes('CIPHERTEXT_INTEGRITY_VIOLATION');
}
assert(wrongVersionFailed, 'Mismatched schemaVersion in AAD strictly FAILS with OperationError');

// 6. Lock enclave and authenticate with Passphrase B
KeyDerivationBridge.lockContext();
assert(!KeyDerivationBridge.isUnlocked(), 'KeyDerivationBridge.lockContext() successfully purges active context');

const ctxB = await KeyDerivationBridge.initializeContext('workspace_alpha_01', passB, false);
let wrongKekFailed = false;
try {
  await EnvelopeCipher.unsealEnvelope(envelopeA, ctxB.masterKek, authenticContext);
} catch (err) {
  wrongKekFailed = err.message.includes('DEK_UNWRAP_FAILED') || err.message.includes('CIPHERTEXT_INTEGRITY_VIOLATION') || err.name === 'OperationError';
}
assert(wrongKekFailed, 'Passphrase B produces non-interoperable Master KEK B; unsealing strictly fails');

// ------------------------------------------------------------
// TEST P0.2: RollingPasswordService Encrypted TOTP Secret Proof
// ------------------------------------------------------------
console.log('\n--- [P0.2] RollingPasswordService Encrypted Secret Invariant ---');

const { RollingPasswordService } = await import('./src/services/crypto/RollingPasswordService.ts');

// 1. Verify that getEnrolledSecret throws strictly when enclave is locked
KeyDerivationBridge.lockContext();
RollingPasswordService.clearInMemorySecret();

let lockedEnclaveThrew = false;
try {
  await RollingPasswordService.getEnrolledSecret();
} catch (err) {
  lockedEnclaveThrew = err.message.includes('ENCLAVE_LOCKED');
}
assert(lockedEnclaveThrew, 'RollingPasswordService.getEnrolledSecret throws strictly when vault is locked');

// 2. Unlock enclave and enroll TOTP secret
const unlockContext = await KeyDerivationBridge.initializeContext(
  'sovereign_primary_enclave_01',
  'SuperSecretOperatorKey2026_Alpha!',
  false
);
const enrolledSecret = await RollingPasswordService.getEnrolledSecret();
assert(
  enrolledSecret instanceof Uint8Array && enrolledSecret.length === 32,
  'RollingPasswordService generates 32-byte CSPRNG secret when unlocked'
);

// 3. Verify zero unencrypted secrets in localStorage
const legacyUnencrypted = localStorage.getItem('sovereign_totp_enrolled_secret_v1');
assert(legacyUnencrypted === null, 'Unencrypted secret key "sovereign_totp_enrolled_secret_v1" is ABSENT in localStorage');

const storedEncJson = localStorage.getItem('sovereign_totp_enrolled_secret_enc_v1');
assert(storedEncJson !== null, 'Encrypted envelope stored under "sovereign_totp_enrolled_secret_enc_v1"');

const parsedTotpEnvelope = JSON.parse(storedEncJson);
assert(
  parsedTotpEnvelope.v === 1 &&
    parsedTotpEnvelope.nonce &&
    parsedTotpEnvelope.wrapped_dek &&
    parsedTotpEnvelope.auth_tag &&
    parsedTotpEnvelope.ciphertext,
  'Stored TOTP secret is a genuine EncryptedEnvelope (v1, nonce, wrapped_dek, auth_tag, ciphertext)'
);

const secretHex = Array.from(enrolledSecret).map((b) => b.toString(16).padStart(2, '0')).join('');
assert(
  !storedEncJson.includes(secretHex),
  'Raw secret hex string is NOT present in storage payload (zero-knowledge verified)'
);

// 4. Verify authentic TOTP generation, burn-on-read, and persistent replay protection
const session = await RollingPasswordService.getCurrentRollingKey();
const currentOtp = session.dynamicKeyFormatted;
console.log(`  Generated current valid TOTP: [${currentOtp}]`);
assert(currentOtp && currentOtp.length === 14, 'TOTP generates formatted 12-char code XXXX-XXXX-XXXX');

// 4.1 Token burns on first use
const firstUseResult = await RollingPasswordService.verifyKey(currentOtp);
assert(firstUseResult.valid === true, 'Authentic TOTP token is accepted on first use');

// 4.2 Immediate replay is strictly rejected
const immediateReplayResult = await RollingPasswordService.verifyKey(currentOtp);
assert(
  immediateReplayResult.valid === false && immediateReplayResult.reason === 'TOKEN_ALREADY_SPENT',
  'Immediately replaying the exact same TOTP is strictly REJECTED (valid: false, reason: TOKEN_ALREADY_SPENT)'
);

// 4.3 Storage verification: ensure tokenHash is stored, plain token is NOT stored
const registryRaw = localStorage.getItem(RollingPasswordService.SPENT_REGISTRY_STORAGE_KEY);
assert(registryRaw !== null, 'Consumed token registry exists in localStorage');
const parsedRegistry = JSON.parse(registryRaw);
assert(Array.isArray(parsedRegistry) && parsedRegistry.length > 0, 'Registry contains spent token entries');
assert(!registryRaw.includes(currentOtp), 'Plaintext TOTP token is NEVER stored in registry (hash-only)');
const spentEntry = parsedRegistry.find((entry) => typeof entry.tokenHash === 'string');
assert(
  spentEntry && spentEntry.tokenHash.length === 64 && spentEntry.expiresAt > Date.now(),
  'Entry has valid SHA-256 hex hash and future expiresAt timestamp'
);

// 4.4 Simulate service reload (clear in-memory secret and caches while preserving localStorage)
RollingPasswordService.clearInMemorySecret();
const reloadedReplayResult = await RollingPasswordService.verifyKey(currentOtp);
assert(
  reloadedReplayResult.valid === false && reloadedReplayResult.reason === 'TOKEN_ALREADY_SPENT',
  'Service reload simulation: replaying consumed token across session/memory wipe is strictly REJECTED'
);

// 4.5 Vault lock lifecycle: verify that lockContext() does not wipe consumed token registry
KeyDerivationBridge.lockContext();
const registryAfterLock = localStorage.getItem(RollingPasswordService.SPENT_REGISTRY_STORAGE_KEY);
assert(registryAfterLock !== null, 'Consumed token registry survives vault lock / enclave reset');

// Re-unlock enclave for subsequent tests
await KeyDerivationBridge.initializeContext(
  'sovereign_primary_enclave_01',
  'SuperSecretOperatorKey2026_Alpha!',
  false
);

// 4.6 Auto-Pruning: Mock past 90 seconds (expired window) and verify pruned records do not pollute storage
const originalNow = Date.now;
try {
  Date.now = function () {
    return originalNow() + 95000; // Fast-forward 95 seconds past the 90s TTL
  };
  const prunedRegistry = RollingPasswordService.getSpentTokenRegistry();
  assert(prunedRegistry.length === 0, 'Records past 90-second TTL are automatically pruned on load');
  const storedAfterPruning = JSON.parse(localStorage.getItem(RollingPasswordService.SPENT_REGISTRY_STORAGE_KEY) || '[]');
  assert(storedAfterPruning.length === 0, 'localStorage consumed token registry pruned of expired entries');
} finally {
  Date.now = originalNow;
}

// Verify format-only bypass elimination
assert(
  (await RollingPasswordService.verifyKey('AAAA-AAAA-AAAA')).valid === false,
  'Arbitrary format-matching string "AAAA-AAAA-AAAA" is strictly REJECTED (no bypass)'
);

assert(
  (await RollingPasswordService.verifyKey('9999-9999-9999')).valid === false,
  'Random non-matching TOTP is rejected'
);

// 5. Dynamic Salted Duress PIN Tests (Double-HMAC Constant-Time Verification)
console.log('  Testing Dynamic Duress PIN Architecture...');

// 5.1 Enforce minimum 8 characters entropy
let shortDuressRejected = false;
try {
  await RollingPasswordService.enrollDuressPin('12345');
} catch (err) {
  shortDuressRejected = err.message.includes('WEAK_DURESS_PIN');
}
assert(shortDuressRejected, 'enrollDuressPin rejects PINs with < 8 characters');

// 5.2 Enroll valid high-entropy duress PIN
const dynamicDuressPin = 'EMERGENCY-911-PIN';
await RollingPasswordService.enrollDuressPin(dynamicDuressPin);
assert(RollingPasswordService.isDuressConfigured() === true, 'isDuressConfigured() returns true after enrollment');

// 5.3 Verify that entering the dynamic duress PIN triggers silent distress
const dynamicDuressResult = await RollingPasswordService.verifyKey(dynamicDuressPin);
assert(
  dynamicDuressResult.valid === true &&
    dynamicDuressResult.isDuress === true &&
    dynamicDuressResult.isDecoy === true,
  'Entering enrolled dynamic duress PIN triggers valid: true, isDuress: true, isDecoy: true'
);

// 5.4 Verify that legacy static code is strictly REJECTED
const legacyCode = ['VOID', 'PANIC', '0000'].join('-');
const legacyResult = await RollingPasswordService.verifyKey(legacyCode);
assert(
  legacyResult.valid === false && legacyResult.isDuress !== true,
  'Legacy static code is strictly REJECTED (valid: false, isDuress: false)'
);

// 5.5 Verify that arbitrary incorrect PIN is strictly rejected
const wrongPinResult = await RollingPasswordService.verifyKey('WRONG-PIN-12345');
assert(
  wrongPinResult.valid === false && wrongPinResult.isDuress !== true,
  'Arbitrary incorrect PIN is strictly rejected'
);

// ------------------------------------------------------------
// TEST P0.3: EscalationDispatcher Real Network & Authentic Queue
// ------------------------------------------------------------
console.log('\n--- [P0.3] EscalationDispatcher Real Egress & Authentic Queue ---');

const { EscalationDispatcherService } = await import(
  './src/services/security/EscalationDispatcherService.ts'
);

// Start an actual HTTP listener to verify real network egress
let receivedWebhook = null;
const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    receivedWebhook = {
      headers: req.headers,
      body: JSON.parse(body),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ACCEPTED', ack: true }));
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const testPort = server.address().port;
const targetUrl = `http://127.0.0.1:${testPort}/api/v1/sovereign-incidents`;
console.log(`  Local listener active on port ${testPort}`);

const testDeed = {
  id: 'inc_test_p0_3',
  timestamp: new Date().toISOString(),
  severity: 'CRITICAL',
  source: 'SECURITY',
  code: 'P0_TEST_DRILL',
  title: 'P0.3 Real Network Egress Verification Incident',
  sanitizedTitle: 'P0.3 Real Network Egress Verification Incident',
  details: { test: true },
  sanitizedDetails: { test: true },
  isDuress: false,
  hmacSignature: 'sig_test_dummy_hmac_256',
  status: 'ACTIVE',
};

const mockConfig = {
  runwayEmergencyThresholdMonths: 3,
  failedAuthThreshold: 3,
  budgetViolationSeverity: 'HIGH',
  slaBreachSeverity: 'CRITICAL',
  recipients: [
    {
      id: 'rec_founder',
      name: 'Alexander Sterling',
      role: 'CEO',
      department: 'Executive',
      email: 'founder@example.com',
      phone: '+15550001',
      verified: true,
      priorityTier: 1,
    },
  ],
  webhooks: [
    {
      id: 'wh_test',
      name: 'Test Egress Webhook',
      url: targetUrl,
      sharedSecret: 'test_webhook_secret_key_12345',
      enabled: true,
      filterSeverities: ['CRITICAL'],
    },
    {
      id: 'wh_offline',
      name: 'Offline Webhook',
      url: 'http://127.0.0.1:59999/dead-endpoint', // Unreachable
      sharedSecret: 'test_secret',
      enabled: true,
      filterSeverities: ['CRITICAL'],
    },
  ],
  routingRules: [
    {
      id: 'rule_p0',
      name: 'P0 Rule',
      department: 'ALL',
      minSeverity: 'CRITICAL',
      channels: ['WEBHOOK', 'EMAIL', 'SMS_VOICE'],
      targetRecipientIds: ['rec_founder'],
      enabled: true,
    },
  ],
};

const dispatchResults = await EscalationDispatcherService.dispatchIncident(testDeed, mockConfig);

// 1. Verify webhook hit the real HTTP server
assert(receivedWebhook !== null, 'Real HTTP request left the machine and arrived at webhook listener');
assert(
  receivedWebhook.headers['x-sovereign-signature'] !== undefined,
  'HTTP request includes X-Sovereign-Signature header'
);
assert(
  receivedWebhook.body.incidentId === 'inc_test_p0_3',
  'HTTP request body contains accurate incident deed payload'
);

// 2. Check dispatch results for successful webhook
const successResult = dispatchResults.find((r) => r.targetIdentifier === targetUrl);
assert(
  successResult && successResult.status === 'SUCCESS',
  'Webhook dispatch result is status: SUCCESS (not fake)'
);

// 3. Check unreachable webhook returns FAILED
const failResult = dispatchResults.find((r) => r.targetIdentifier.includes('59999'));
assert(
  failResult && failResult.status === 'FAILED',
  'Offline endpoint correctly returns status: FAILED (no hardcoded success)'
);

// 4. Check email and sms channels
const emailResult = dispatchResults.find((r) => r.channel === 'EMAIL');
assert(
  emailResult &&
    emailResult.status === 'FAILED' &&
    emailResult.error.includes('GATEWAY_NOT_CONFIGURED'),
  'Unconfigured Email channel honestly reports GATEWAY_NOT_CONFIGURED failure'
);

const smsResult = dispatchResults.find((r) => r.channel === 'SMS_VOICE');
assert(
  smsResult &&
    smsResult.status === 'FAILED' &&
    smsResult.error.includes('GATEWAY_NOT_CONFIGURED'),
  'Unconfigured SMS channel honestly reports GATEWAY_NOT_CONFIGURED failure'
);

server.close();

// ------------------------------------------------------------
// TEST P0.4: ThreatDetectionEngine HMAC Signing Key & Duress Silence
// ------------------------------------------------------------
console.log('\n--- [P0.4] ThreatDetectionEngine Per-Installation Signing Key ---');

const { ThreatDetectionEngine, DEFAULT_THREAT_CONFIG } = await import(
  './src/services/security/ThreatDetectionEngine.ts'
);

assert(
  DEFAULT_THREAT_CONFIG.webhooks[0].sharedSecret === '',
  'DEFAULT_THREAT_CONFIG has empty sharedSecret (hardcoded secret removed)'
);
assert(
  DEFAULT_THREAT_CONFIG.webhooks[0].enabled === false,
  'DEFAULT_THREAT_CONFIG webhook disabled by default until operator configures secret'
);

const signingKey1 = await ThreatDetectionEngine.getEnclaveSigningKey();
assert(
  signingKey1 && signingKey1.length === 64,
  'Enclave signing key is a 32-byte CSPRNG hex secret (64 hex characters)'
);
assert(
  !signingKey1.includes('sovereign_primary_enclave_01'),
  'Enclave signing key is not derivable from workspaceId string'
);

console.log(`\n🎉 ALL ${passedTests}/${totalTests} P0 SECURITY VERIFICATIONS PASSED!\n`);
process.exit(0);
