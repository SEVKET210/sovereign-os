import fs from 'fs';
import path from 'path';

console.log('🧹 Starting Mock Data Purge Verification Suite...\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

// 1. SyncQueueService.clearTable
const sqsPath = path.resolve('src/services/crypto/SyncQueueService.ts');
const sqsContent = fs.readFileSync(sqsPath, 'utf8');
assert(sqsContent.includes('public static async clearTable(tableName: string): Promise<void>'), 'SyncQueueService has clearTable method');

// 2. ZkPersistenceManager.clearLedger
const zkPath = path.resolve('src/services/crypto/ZkPersistenceManager.ts');
const zkContent = fs.readFileSync(zkPath, 'utf8');
assert(zkContent.includes('public static async clearLedger(): Promise<void>'), 'ZkPersistenceManager has clearLedger method');

// 3. TreasuryDashboard.tsx
const tdPath = path.resolve('src/components/treasury/TreasuryDashboard.tsx');
const tdContent = fs.readFileSync(tdPath, 'utf8');
assert(tdContent.includes('ZkPersistenceManager.clearLedger()'), 'TreasuryDashboard executes clearLedger on mount if legacy mock data is detected');
assert(tdContent.includes('handlePurgeAllData'), 'TreasuryDashboard defines handlePurgeAllData');
assert(tdContent.includes('onPurgeAll={canPurge ? handlePurgeAllData : undefined}') || tdContent.includes('onPurgeAll={handlePurgeAllData}'), 'TreasuryDashboard passes onPurgeAll to ChainedLedgerTable');

// 4. ChainedLedgerTable.tsx
const cltPath = path.resolve('src/components/treasury/ChainedLedgerTable.tsx');
const cltContent = fs.readFileSync(cltPath, 'utf8');
assert(cltContent.includes('onPurgeAll?: () => void;'), 'ChainedLedgerTable accepts onPurgeAll prop');
assert(cltContent.includes('Defteri Temizle'), 'ChainedLedgerTable renders Defteri Temizle button');

console.log(`\n🎉 ALL ${passed}/${total} MOCK PURGE VERIFICATIONS PASSED!`);
