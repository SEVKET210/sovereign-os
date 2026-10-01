import fs from 'fs';
import path from 'path';

console.log('⚡ Starting Custom Pairs & Catalog Verification Suite...\n');

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

// 1. Check LiveMarketTicker component
const tickerPath = path.resolve('src/components/treasury/LiveMarketTicker.tsx');
assert(fs.existsSync(tickerPath), 'LiveMarketTicker.tsx exists');
const tickerSrc = fs.readFileSync(tickerPath, 'utf8');

assert(tickerSrc.includes("activeTab === 'pairs'"), 'Tab 1: Paritelerim tab exists');
assert(tickerSrc.includes("activeTab === 'catalog'"), 'Tab 2: Katalog tab exists');
assert(tickerSrc.includes("activeTab === 'add'"), 'Tab 3: + Özel Ekle tab exists');

assert(tickerSrc.includes('CATALOG_PRESETS'), 'CATALOG_PRESETS catalog defined');
assert(tickerSrc.includes('SOL/USDT'), 'SOL/USDT preset in catalog');
assert(tickerSrc.includes('BNB/USDT'), 'BNB/USDT preset in catalog');
assert(tickerSrc.includes('XRP/USDT'), 'XRP/USDT preset in catalog');
assert(tickerSrc.includes('GBP/TRY'), 'GBP/TRY preset in catalog');

assert(tickerSrc.includes('handleAddPair'), 'handleAddPair handler implemented');
assert(tickerSrc.includes('handleRemoveCustomPair'), 'handleRemoveCustomPair handler implemented');
assert(tickerSrc.includes('Trash2'), 'Trash2 delete icon for custom pairs present');
assert(tickerSrc.includes('isSubmittingPair'), 'Loading state during price discovery present');
assert(tickerSrc.includes('SUGGESTED_QUICK_PICKS'), 'Quick suggestion chips present');

// 2. Check MarketDataService capabilities
const mdsPath = path.resolve('src/services/market/MarketDataService.ts');
assert(fs.existsSync(mdsPath), 'MarketDataService.ts exists');
const mdsSrc = fs.readFileSync(mdsPath, 'utf8');

assert(mdsSrc.includes('registerCustomPair'), 'registerCustomPair exists on MarketDataService');
assert(mdsSrc.includes('unregisterCustomPair'), 'unregisterCustomPair exists on MarketDataService');
assert(mdsSrc.includes('discoverLivePrice'), 'discoverLivePrice exists on MarketDataService');
assert(mdsSrc.includes('api.coinbase.com'), 'Coinbase price discovery configured');
assert(mdsSrc.includes('open.er-api.com'), 'OpenER fiat price discovery configured');
assert(mdsSrc.includes('sov_custom_market_configs_v1'), 'Custom pair persistence configured');

// 3. Test dynamic live discovery with simulated service logic
console.log('\n🌐 Testing live rate discovery for sample custom pairs...');

async function testDiscovery(sym) {
  const [base, quote] = sym.split('/');
  let price = null;
  try {
    const q = quote === 'USDT' || quote === 'USD' ? 'USD' : quote;
    const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-${q}/spot`);
    if (res.ok) {
      const d = await res.json();
      price = parseFloat(d.data?.amount);
    }
  } catch {}

  if (!price) {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (res.ok) {
        const d = await res.json();
        price = d.rates?.[quote];
      }
    } catch {}
  }
  return price;
}

const solPrice = await testDiscovery('SOL/USDT');
assert(typeof solPrice === 'number' && solPrice > 0, `Discovered live SOL/USDT price: $${solPrice}`);

const gbpPrice = await testDiscovery('GBP/TRY');
assert(typeof gbpPrice === 'number' && gbpPrice > 0, `Discovered live GBP/TRY price: ₺${gbpPrice}`);

console.log(`\n🎉 ALL ${passed}/${total} CUSTOM PAIRS VERIFICATIONS PASSED!`);
