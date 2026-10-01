/* ============================================================
   SOVEREIGN-OS — Language & Localization Engine
   Provides seamless, instant switching between Turkish (TR) and English (EN)
   Persistent via localStorage with zero page reload
   ============================================================ */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Language = 'tr' | 'en';

export interface Translations {
  navbar: {
    status: string;
    enterVault: string;
    langToggle: string;
  };
  hero: {
    enclaveBadge: string;
    titleMain: string;
    titleAccent: string;
    subtitle: string;
    launchSandbox: string;
    hardwareSecurity: string;
    badgeCluster: string;
    badgeByos: string;
    badgeFips: string;
  };
  inspector: {
    overline: string;
    title: string;
    subtitle: string;
    inputLabel: string;
    inputPlaceholder: string;
    shannonEntropy: string;
    totalBytes: string;
    blockCount: string;
    sha256Digest: string;
    cleavageVisualization: string;
    bitLevel: string;
  };
  bento: {
    overline: string;
    title: string;
    subtitle: string;
    card1Title: string;
    card1Subtitle: string;
    card1Desc: string;
    card1Badge: string;
    card1Btn: string;
    card2Title: string;
    card2Subtitle: string;
    card2Desc: string;
    card2Badge: string;
    card2Btn: string;
    card3Title: string;
    card3Subtitle: string;
    card3Desc: string;
    card3Badge: string;
    card3Btn: string;
    card4Title: string;
    card4Subtitle: string;
    card4Desc: string;
    card4Badge: string;
    card4Btn: string;
  };
  roi: {
    overline: string;
    title: string;
    subtitle: string;
    headcountLabel: string;
    headcountUnits: string;
    computeLabel: string;
    computeUnits: string;
    saasComplexityLabel: string;
    saasOptions: [string, string, string];
    annualSavings: string;
    legacyAnnual: string;
    sovereignAnnual: string;
    breakdownNote: string;
    auditBadge: string;
  };
  footer: {
    architectureBrief: string;
    allSystemsOperational: string;
    threatSpecsBtn: string;
    vaultAuthBtn: string;
    copyright: string;
  };
  hardwareDrawer: {
    overline: string;
    title: string;
    closeBtn: string;
    spec1Title: string;
    spec1Desc: string;
    spec2Title: string;
    spec2Desc: string;
    spec3Title: string;
    spec3Desc: string;
    spec4Title: string;
    spec4Desc: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  tr: {
    navbar: {
      status: 'VDS KÜMESİ ÇEVRİMİÇİ',
      enterVault: 'Kasaya Gir',
      langToggle: 'DİL',
    },
    hero: {
      enclaveBadge: 'EGEMEN ENKLAV // MİMARİ ŞARTNAMESİ v3.0',
      titleMain: 'Otonom İşletmeler İçin',
      titleAccent: 'Egemen İşletim Sistemi.',
      subtitle:
        'Kriptografik defter zincirleme, Unreal tarzı Blueprint graf orkestrasyonu ve sıfır bilgi depolama. Mutlak veri egemenliği ve deterministik yürütme için tasarlandı.',
      launchSandbox: 'Egemen Sandbox’ı Başlat',
      hardwareSecurity: 'Donanım Güvenlik Mimarisi',
      badgeCluster: 'SIFIR KÜME SIZINTISI',
      badgeByos: 'AES-256-GCM BYOS',
      badgeFips: 'FIPS 140-3 UYUMLU VEKTÖR',
    },
    inspector: {
      overline: 'GERÇEK ZAMANLI KRİPTOGRAFİK AYRIŞTIRMA BİLEŞENİ',
      title: 'İnteraktif İstemci Tarafı Blok Şifre Denetleyicisi',
      subtitle:
        'Tarayıcı enklavınızda %100 yerel olarak yürütülen gerçek zamanlı 16 baytlık AES-GCM blok ayrıştırmasını, matematiksel Shannon entropi hesaplamasını ve kriptografik SHA-256 özet akışını gözlemlemek için metin yazın.',
      inputLabel: 'KURUMSAL SIR GİRİŞİ // HAM DÜZ METİN',
      inputPlaceholder: 'İstemci ayrıştırmasını denetlemek için hassas kimlik bilgileri veya tohum ifadeleri yazın...',
      shannonEntropy: 'Shannon Entropisi',
      totalBytes: 'Toplam Bayt Boyutu',
      blockCount: '16-Bayt Blok Sayısı',
      sha256Digest: 'Yerel SHA-256 Özeti',
      cleavageVisualization: '16-BAYTLIK AES BLOK DİZİLİMİ VE DOLGU GÖRSELLEŞTİRMESİ',
      bitLevel: 'Bit Düzeyi Rassallık',
    },
    bento: {
      overline: 'BENTO MİMARİ PLANI',
      title: 'Otonom İşletme Egemen Altyapısının Dört Temel Sütunu',
      subtitle:
        'Her modül, merkezi açıkları ortadan kaldıran ve tam veri mülkiyetini garanti eden yalıtılmış bir sıfır güven katmanı olarak bağımsız çalışır.',
      card1Title: 'Blueprint DAG Görselleştirici',
      card1Subtitle: 'UNREAL TARZI DÜĞÜM GRAFİĞİ',
      card1Desc:
        'Polimorfik düğümleri bağlayan kübik Bezier eğri topolojileri: Operasyonel Görevler, Parçalanmış Kasa Dosyaları ve otomatik akış aşağı engelleme mekanizmalı Hazine Bütçeleri.',
      card1Badge: 'SEVİYE 1–4 UZAMSAL AYIKLAMA',
      card1Btn: 'Blueprint Stüdyosunu İncele',
      card2Title: 'Hazine & Nakit Akışı Motoru',
      card2Subtitle: 'PİST RADARI & ÇİFT GİRİŞLİ DEFTER',
      card2Desc:
        'Dört ayrık likidite kasasını (Ticari, Dijital Varlık, Forex/Altın, Kasa Nakit) denetler. 90 günlük yuvarlanan yakım hızını hesaplar ve SHA-256 ile zincirlenmiş deftere kaydeder.',
      card2Badge: 'GERÇEK ZAMANLI LİKİDİTE RADARI',
      card2Btn: 'Hazine Kontrol Merkezini İncele',
      card3Title: 'Sıfır Bilgi BYOS Parçalama',
      card3Subtitle: 'İSTEMCİ TARAFINDA 4MB PARÇALAMA',
      card3Desc:
        'Kurumsal veriler istemciden çıkmadan önce yerel olarak 4 MB parçalara bölünür ve AES-256-GCM ile şifrelenir. Sağlayıcılar yalnızca şifreli blokları saklar.',
      card3Badge: 'TAM VERİ EGEMENLİĞİ',
      card3Btn: 'Depolama Mimarisi Detayları',
      card4Title: 'İstemci Tarafı BYO-AI Kayıt Defteri',
      card4Subtitle: 'YEREL API VE ENKLAV MODELLERİ',
      card4Desc:
        'Kendi AI modellerinizi (Ollama, vLLM veya yerel anahtarlar) doğrudan istemci üzerinde bağlayın. İstekler veya bağlam verileri asla üçüncü taraf sunucularda saklanmaz.',
      card4Badge: 'SIFIR MODEL EĞİTİM SIZINTISI',
      card4Btn: 'AI Entegrasyon Çerçevesi',
    },
    roi: {
      overline: 'KURUMSAL EKONOMİK TELEMETRİ',
      title: 'Kurumsal Yatırım Getirisi & Sermaye Koruma Matrisi',
      subtitle:
        'Ayrık eski kurumsal SaaS yığınlarını (Jira + Slack + Notion + SAP/Workday) SOVEREIGN-OS otonom istemci tarafı mimarisiyle karşılaştırın.',
      headcountLabel: 'Kurumsal Operatör Sayısı',
      headcountUnits: 'Operatör',
      computeLabel: 'Otonom Hesaplama Düğümleri',
      computeUnits: 'Düğüm',
      saasComplexityLabel: 'Mevcut Kurumsal SaaS Yığın Yoğunluğu',
      saasOptions: ['Temel Yığın ($80/kullanıcı/ay)', 'Gelişmiş Kurumsal ($150/kullanıcı/ay)', 'Ağır Çok Uluslu ($230/kullanıcı/ay)'],
      annualSavings: 'Yıllık Tasarruf Edilen Sermaye',
      legacyAnnual: 'Mevcut SaaS Yıllık Maliyeti',
      sovereignAnnual: 'Sovereign-OS Düz Lisanslama',
      breakdownNote: 'Hesaplama, seat başına lisansların kaldırılması ve istemci tarafı orkestrasyon tasarrufunu yansıtır.',
      auditBadge: 'KURUMSAL DENETİM UYUMLU',
    },
    footer: {
      architectureBrief:
        'Sovereign-OS, kurumlar için mutlak veri bağımsızlığı, istemci tarafı şifreleme ve deterministik defter bütünlüğü sağlayan yüksek performanslı bir çalışma alanı motorudur.',
      allSystemsOperational: 'TÜM DÜĞÜMLER ÇEVRİMİÇİ // SIFIR ANOMALİ',
      threatSpecsBtn: 'Mimari ve Tehdit Şartnamesi',
      vaultAuthBtn: 'Güvenli Kasaya Giriş',
      copyright: 'SOVEREIGN-OS // TÜM HAKLARI SAKLIDIR. RADİKAL ZANAATKÂRLIK DİREKTİFİ.',
    },
    hardwareDrawer: {
      overline: 'DONANIM DÜZEYİNDE İZOLASYON',
      title: 'Güvenlik Mimarisi ve Tehdit Modeli',
      closeBtn: 'Kapat',
      spec1Title: 'Bellek İzolasyonu ve RAM Koruması',
      spec1Desc: 'Tüm kriptografik anahtarlar ve çözülmüş önizlemeler yalnızca sistem RAM belleğinde tutulur, diske asla takas (swap) edilmez ve oturum bitiminde sıfırlanır.',
      spec2Title: 'Ekran Yakalama ve Casus Yazılım Koruması',
      spec2Desc: 'Pencere odağı kaybolduğunda arayüz otomatik olarak bulanıklaştırılır; yetkisiz ekran görüntüsü ve kayıt kancalarına karşı savunma sağlanır.',
      spec3Title: 'Zamanlama Saldırılarına Karşı Sabit Zamanlı İşlemler',
      spec3Desc: 'Tüm parola doğrulamaları ve özet karşılaştırmaları sabit süreli (constant-time) algoritmalarla çalıştırılarak yan kanal sızıntıları önlenir.',
      spec4Title: 'Acil Durum Sessiz Alarm Protokolü',
      spec4Desc: 'Baskı altında girilen dinamik panik PIN kodu, saldırgana temizlenmiş sahte bir ortam sunarken arka planda sessizce telemetri alarmı üretir.',
    },
  },
  en: {
    navbar: {
      status: 'VDS CLUSTER ONLINE',
      enterVault: 'Enter Vault',
      langToggle: 'LANG',
    },
    hero: {
      enclaveBadge: 'SOVEREIGN ENCLAVE // ARCHITECTURE SPECIFICATION v3.0',
      titleMain: 'The Sovereign Operating System for',
      titleAccent: 'Autonomous Enterprises.',
      subtitle:
        'Cryptographic ledger chaining, Unreal-style Blueprint graph orchestration, and zero-knowledge storage. Architected for absolute data self-sovereignty and deterministic execution.',
      launchSandbox: 'Launch Sovereign Sandbox',
      hardwareSecurity: 'Hardware Security Architecture',
      badgeCluster: 'ZERO CLUSTER LEAKAGE',
      badgeByos: 'AES-256-GCM BYOS',
      badgeFips: 'FIPS 140-3 COMPLIANT VECTOR',
    },
    inspector: {
      overline: 'REAL-TIME CRYPTOGRAPHIC DECOMPOSITION WIDGET',
      title: 'Interactive Client-Side Block Cipher Inspector',
      subtitle:
        'Type any string to observe real-time 16-byte AES-GCM block cleavage, mathematical Shannon entropy calculation, and cryptographic SHA-256 digesting executed 100% locally in your browser enclave.',
      inputLabel: 'INPUT CORPORATE SECRET // RAW PLAINTEXT',
      inputPlaceholder: 'Type sensitive credentials or seed phrases to inspect client cleavage...',
      shannonEntropy: 'Shannon Entropy',
      totalBytes: 'Total Payload Bytes',
      blockCount: '16-Byte AES Blocks',
      sha256Digest: 'Local SHA-256 Digest Stream',
      cleavageVisualization: '16-BYTE ALIGNED AES BLOCK CLEAVAGE & PADDING DECOMPOSITION',
      bitLevel: 'Bit-Level Randomness',
    },
    bento: {
      overline: 'BENTO ARCHITECTURAL BLUEPRINT',
      title: 'Four Pillars of Autonomous Enterprise Sovereign Infrastructure',
      subtitle:
        'Every module functions independently as an isolated zero-trust layer, eliminating centralized vulnerabilities and guaranteeing full data ownership.',
      card1Title: 'Blueprint DAG Visualizer',
      card1Subtitle: 'UNREAL-STYLE NODE GRAPH',
      card1Desc:
        'Cubic Bezier curve topologies connecting polymorphic nodes: Operational Tasks, Fragmented Vault Files, and Treasury Budgets with automated downstream blocking.',
      card1Badge: 'LEVEL 1–4 SPATIAL CULLING',
      card1Btn: 'Open Blueprint Studio',
      card2Title: 'Treasury & Cashflow Engine',
      card2Subtitle: 'RUNWAY RADAR & DOUBLE-ENTRY LEDGER',
      card2Desc:
        'Governs four discrete liquidity vaults (Commercial, Digital Asset, Forex/Metals, Petty Cash). Computes 90-day rolling burn and appends to SHA-256 chained hash ledger.',
      card2Badge: 'LIVE RUNWAY TELEMETRY RADAR',
      card2Btn: 'Open Treasury OS',
      card3Title: 'Zero-Knowledge BYOS Shredding',
      card3Subtitle: 'CLIENT-SIDE 4MB CHUNKING',
      card3Desc:
        'Enterprise payload shredded into 4MB client-side encrypted chunks via AES-256-GCM before transmission. Storage providers only ever hold encrypted ciphertext.',
      card3Badge: 'ABSOLUTE SOVEREIGNTY',
      card3Btn: 'Inspect BYOS Engine',
      card4Title: 'Client-Side BYO-AI Model Registry',
      card4Subtitle: 'LOCAL INFERENCE & PRIVATE MODELS',
      card4Desc:
        'Directly connect custom endpoints (Ollama, vLLM, private OpenAI keys) without intermediary proxy leakage. Context and prompts never persist remotely.',
      card4Badge: 'ZERO MODEL TRAINING LEAKAGE',
      card4Btn: 'Inspect AI Framework',
    },
    roi: {
      overline: 'INSTITUTIONAL ECONOMIC TELEMETRY',
      title: 'Institutional ROI & Capital Preservation Matrix',
      subtitle:
        'Compare disparate legacy enterprise SaaS stacks (Jira + Slack + Notion + SAP/Workday) against SOVEREIGN-OS autonomous client-side architecture.',
      headcountLabel: 'Enterprise Headcount',
      headcountUnits: 'Operators',
      computeLabel: 'Autonomous Compute Nodes',
      computeUnits: 'Nodes',
      saasComplexityLabel: 'Legacy SaaS Stack Complexity',
      saasOptions: ['Basic Tier ($80/user/mo)', 'Enterprise Suite ($150/user/mo)', 'Global Enterprise ($230/user/mo)'],
      annualSavings: 'Annual Projected Capital Saved',
      legacyAnnual: 'Legacy Enterprise SaaS Cost',
      sovereignAnnual: 'Sovereign-OS Flat License',
      breakdownNote: 'Calculations reflect per-seat elimination and client-orchestrated efficiency gains.',
      auditBadge: 'INSTITUTIONAL AUDIT GRADE',
    },
    footer: {
      architectureBrief:
        'Sovereign-OS is an autonomous enterprise workspace engine built with radical craftsmanship, anti-AI-slop design restraint, zero-trust cryptography, and high-performance Web APIs.',
      allSystemsOperational: 'ALL SYSTEMS OPERATIONAL // ZERO ANOMALIES',
      threatSpecsBtn: 'Architecture & Threat Specs',
      vaultAuthBtn: 'Access Secure Enclave',
      copyright: 'SOVEREIGN-OS // ALL RIGHTS RESERVED. RADICAL CRAFTSMANSHIP DIRECTIVE.',
    },
    hardwareDrawer: {
      overline: 'HARDWARE-LEVEL ISOLATION',
      title: 'Security Architecture & Threat Model',
      closeBtn: 'Close',
      spec1Title: 'Memory Isolation & Ephemeral Decryption',
      spec1Desc: 'All cryptographic keys and decrypted file fragments reside strictly in volatile RAM, never touched by swap space, and wiped on session termination.',
      spec2Title: 'Screen Capture & Spyware Defenses',
      spec2Desc: 'Window blur curtain obscures sensitive metrics on focus loss; automated screenshot interception defends against background recording hooks.',
      spec3Title: 'Constant-Time Cryptographic Verification',
      spec3Desc: 'Password hashing and digest comparisons execute in strictly timed cycles, neutralizing timing side-channel attacks.',
      spec4Title: 'Duress & Synthetic Decoy Mode',
      spec4Desc: 'Salted dynamic duress PIN unlocks a sanitized decoy workspace while silently dispatching incident telemetry.',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_LANG_KEY = 'sovereign_lang_pref';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'tr' || saved === 'en') return saved;
      return 'tr'; // Default to Turkish as requested
    } catch {
      return 'tr';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {
      // storage unavailable
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'tr' ? 'en' : 'tr');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: TRANSLATIONS[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
