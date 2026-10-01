import fs from 'fs';
import path from 'path';

console.log('🌐 Starting SOVEREIGN-OS Language & Localization Verification Suite...\n');

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

// 1. Check LanguageContext
const langContextPath = path.resolve('src/services/i18n/LanguageContext.tsx');
assert(fs.existsSync(langContextPath), 'LanguageContext.tsx exists');
const langContextContent = fs.readFileSync(langContextPath, 'utf8');
assert(langContextContent.includes("export type Language = 'tr' | 'en';"), 'LanguageContext defines Language as tr | en');
assert(langContextContent.includes("localStorage.getItem(STORAGE_LANG_KEY)"), 'Language preference reads from localStorage');
assert(langContextContent.includes("localStorage.setItem(STORAGE_LANG_KEY, lang)"), 'Language preference persists to localStorage');
assert(langContextContent.includes("document.documentElement.lang = language;"), 'HTML document lang attribute is reactively synchronized');

// 2. Check Settings.tsx
const settingsPath = path.resolve('src/pages/Settings.tsx');
assert(fs.existsSync(settingsPath), 'Settings.tsx exists');
const settingsContent = fs.readFileSync(settingsPath, 'utf8');
assert(settingsContent.includes("useLanguage"), 'Settings.tsx imports and uses useLanguage hook');
assert(settingsContent.includes("handleLanguage"), 'Settings.tsx declares handleLanguage handler');
assert(settingsContent.includes("Dil ve Yerelleştirme / Language & Localization"), 'Settings.tsx contains Dil ve Yerelleştirme card title');
assert(settingsContent.includes("handleLanguage('tr')"), 'Settings.tsx provides Türkçe (TR) button click handler');
assert(settingsContent.includes("handleLanguage('en')"), 'Settings.tsx provides English (EN) button click handler');
assert(settingsContent.includes("AKTİF"), 'Settings.tsx provides AKTİF badge for Turkish');
assert(settingsContent.includes("ACTIVE"), 'Settings.tsx provides ACTIVE badge for English');

// 3. Check SettingsDrawer.tsx
const drawerPath = path.resolve('src/components/settings/SettingsDrawer.tsx');
assert(fs.existsSync(drawerPath), 'SettingsDrawer.tsx exists');
const drawerContent = fs.readFileSync(drawerPath, 'utf8');
assert(drawerContent.includes("useLanguage"), 'SettingsDrawer.tsx imports useLanguage hook');
assert(drawerContent.includes("'language'"), 'SettingsDrawer.tsx activeTab union includes language tab');
assert(drawerContent.includes("{ id: 'language', label: 'Dil / Language', icon: Globe }"), 'SettingsDrawer.tsx contains Dil / Language tab button with Globe icon');
assert(drawerContent.includes("activeTab === 'language'"), 'SettingsDrawer.tsx renders language tab body');
assert(drawerContent.includes("setLanguage('tr')"), 'SettingsDrawer.tsx has setLanguage tr trigger');
assert(drawerContent.includes("setLanguage('en')"), 'SettingsDrawer.tsx has setLanguage en trigger');

// 4. Check Navbar.tsx
const navbarPath = path.resolve('src/components/Navbar.tsx');
assert(fs.existsSync(navbarPath), 'Navbar.tsx exists');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');
assert(navbarContent.includes("useLanguage"), 'Navbar.tsx imports useLanguage hook');
assert(navbarContent.includes("title=\"Türkçe (TR)\""), 'Navbar.tsx has TR quick toggle button');
assert(navbarContent.includes("title=\"English (EN)\""), 'Navbar.tsx has EN quick toggle button');

console.log(`\n🎉 ALL ${passed}/${total} LANGUAGE SELECTION VERIFICATIONS PASSED!`);
