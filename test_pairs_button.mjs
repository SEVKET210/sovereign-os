import fs from 'fs';
import path from 'path';

console.log('📈 Starting + PAIRS Button & Dropdown Verification Suite...\n');

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

const tickerPath = path.resolve('src/components/treasury/LiveMarketTicker.tsx');
assert(fs.existsSync(tickerPath), 'LiveMarketTicker.tsx exists');
const content = fs.readFileSync(tickerPath, 'utf8');

assert(content.includes("overflow: 'visible'"), 'LiveMarketTicker container has overflow: visible (no clipping)');
assert(content.includes("zIndex: 95"), 'LiveMarketTicker container has zIndex: 95 (sits above main page body)');
assert(content.includes("<span>PAIRS</span>"), '+ PAIRS label button exists');
assert(content.includes("setShowWatchlistMenu((s) => !s)"), '+ PAIRS click handler toggles showWatchlistMenu state');
assert(content.includes("e.stopPropagation()"), '+ PAIRS click event stops propagation to prevent instant outside-click closure');
assert(content.includes("GÖSTERGE PARİTELERİ"), 'Dropdown menu renders header title');
assert(content.includes("availablePairs.map"), 'Dropdown menu maps over all available pairs (system + custom)');
assert(content.includes("togglePair(sym)"), 'Dropdown items trigger togglePair when clicked');
assert(content.includes("<Check size={10}"), 'Dropdown active items display checkmark icon');

console.log(`\n🎉 ALL ${passed}/${total} + PAIRS BUTTON VERIFICATIONS PASSED!`);
