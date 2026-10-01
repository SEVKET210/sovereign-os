import type {
  SupportedTranslationLang,
  TerminologyShieldEntry,
  TranslationResult,
} from '../../types';
import { useAiStore } from '../../stores/useAiStore';

export const SUPPORTED_LANGUAGES: Record<
  SupportedTranslationLang,
  { label: string; nativeName: string; flag: string }
> = {
  en: { label: 'English', nativeName: 'English', flag: '🇬🇧' },
  tr: { label: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  zh: { label: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  de: { label: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ru: { label: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
};

/* ── Offline Deterministic Dictionary for Core Technical & Node Vocabulary ─ */
const GLOSSARY_DICTIONARY: Record<SupportedTranslationLang, Record<string, string>> = {
  en: {
    'Design & Architecture Review': 'Design & Architecture Review',
    'Deployment Pipeline Check': 'Deployment Pipeline Check',
    'Security Audit & Penetration Testing': 'Security Audit & Penetration Testing',
    'API Gateway Hardening': 'API Gateway Hardening',
    'Database Migration Protocol': 'Database Migration Protocol',
    'Zero-Knowledge Vault Backup': 'Zero-Knowledge Vault Backup',
    'Treasury Allocation Matrix': 'Treasury Allocation Matrix',
    'Pending': 'Pending',
    'Active': 'Active',
    'In Review': 'In Review',
    'Completed': 'Completed',
    'Blocked': 'Blocked',
    'Locked': 'Locked',
    'Top Secret': 'Top Secret',
    'Secret': 'Secret',
    'Confidential': 'Confidential',
    'Restricted': 'Restricted',
    'Public': 'Public',
    'Task': 'Task',
    'Decision Gate': 'Decision Gate',
    'Automated Trigger': 'Automated Trigger',
    'Security Guardrail': 'Security Guardrail',
    'Execute comprehensive structural verification': 'Execute comprehensive structural verification',
    'Zero-knowledge client-side encryption operational': 'Zero-knowledge client-side encryption operational',
  },
  tr: {
    'Design & Architecture Review': 'Tasarım ve Mimari İncelemesi',
    'Deployment Pipeline Check': 'Dağıtım Hattı Denetimi',
    'Security Audit & Penetration Testing': 'Güvenlik Denetimi ve Sızma Testi',
    'API Gateway Hardening': 'API Ağ Geçidi Güçlendirme',
    'Database Migration Protocol': 'Veritabanı Geçiş Protokolü',
    'Zero-Knowledge Vault Backup': 'Sıfır-Bilgi Kasa Yedeklemesi',
    'Treasury Allocation Matrix': 'Hazine Tahsis Matrisi',
    'Pending': 'Beklemede',
    'Active': 'Aktif',
    'In Review': 'İncelemede',
    'Completed': 'Tamamlandı',
    'Blocked': 'Engellendi',
    'Locked': 'Kilitli',
    'Top Secret': 'Çok Gizli',
    'Secret': 'Gizli',
    'Confidential': 'Hizmete Özel',
    'Restricted': 'Kısıtlı',
    'Public': 'Halka Açık',
    'Task': 'Görev',
    'Decision Gate': 'Karar Kapısı',
    'Automated Trigger': 'Otomatik Tetikleyici',
    'Security Guardrail': 'Güvenlik Bariyeri',
    'Execute comprehensive structural verification': 'Kapsamlı yapısal doğrulamayı çalıştırın',
    'Zero-knowledge client-side encryption operational': 'Sıfır-bilgi istemci tarafı şifreleme devrede',
    'Title': 'Başlık',
    'Description': 'Açıklama',
    'Status': 'Durum',
    'Clearance': 'Erişim Seviyesi',
    'Dependencies': 'Bağımlılıklar',
    'Assigned To': 'Atanan Kişi',
    'Estimated Hours': 'Tahmini Süre (Saat)',
  },
  zh: {
    'Design & Architecture Review': '设计与架构评审',
    'Deployment Pipeline Check': '部署流水线检查',
    'Security Audit & Penetration Testing': '安全审计与渗透测试',
    'API Gateway Hardening': 'API 网关加固',
    'Database Migration Protocol': '数据库迁移协议',
    'Zero-Knowledge Vault Backup': '零知识保管库备份',
    'Treasury Allocation Matrix': '资金库分配矩阵',
    'Pending': '待处理',
    'Active': '进行中',
    'In Review': '审核中',
    'Completed': '已完成',
    'Blocked': '已阻塞',
    'Locked': '已锁定',
    'Top Secret': '绝密',
    'Secret': '机密',
    'Confidential': '秘密',
    'Restricted': '内部限制',
    'Public': '公开',
    'Task': '任务',
    'Decision Gate': '决策关口',
    'Automated Trigger': '自动化触发器',
    'Security Guardrail': '安全护栏',
    'Execute comprehensive structural verification': '执行全面的结构性验证',
    'Zero-knowledge client-side encryption operational': '零知识客户端加密已投入运行',
    'Title': '标题',
    'Description': '描述',
    'Status': '状态',
    'Clearance': '保密级别',
    'Dependencies': '依赖项',
    'Assigned To': '指派人',
    'Estimated Hours': '预计工时',
  },
  de: {
    'Design & Architecture Review': 'Entwurfs- und Architekturprüfung',
    'Deployment Pipeline Check': 'Bereitstellungspipeline-Prüfung',
    'Security Audit & Penetration Testing': 'Sicherheitsaudit und Penetrationstest',
    'API Gateway Hardening': 'API-Gateway-Härtung',
    'Database Migration Protocol': 'Datenbankmigrationsprotokoll',
    'Zero-Knowledge Vault Backup': 'Zero-Knowledge-Tresor-Sicherung',
    'Treasury Allocation Matrix': 'Schatzamts-Zuweisungsmatrix',
    'Pending': 'Ausstehend',
    'Active': 'Aktiv',
    'In Review': 'In Überprüfung',
    'Completed': 'Abgeschlossen',
    'Blocked': 'Blockiert',
    'Locked': 'Gesperrt',
    'Top Secret': 'Streng Geheim',
    'Secret': 'Geheim',
    'Confidential': 'Vertraulich',
    'Restricted': 'Eingeschränkt',
    'Public': 'Öffentlich',
    'Task': 'Aufgabe',
    'Decision Gate': 'Entscheidungstor',
    'Automated Trigger': 'Automatischer Auslöser',
    'Security Guardrail': 'Sicherheitsleitplanke',
    'Execute comprehensive structural verification': 'Führen Sie eine umfassende Strukturüberprüfung durch',
    'Zero-knowledge client-side encryption operational': 'Zero-Knowledge clientseitige Verschlüsselung betriebsbereit',
    'Title': 'Titel',
    'Description': 'Beschreibung',
    'Status': 'Status',
    'Clearance': 'Sicherheitsfreigabe',
    'Dependencies': 'Abhängigkeiten',
    'Assigned To': 'Zugewiesen an',
    'Estimated Hours': 'Geschätzte Stunden',
  },
  ru: {
    'Design & Architecture Review': 'Обзор проектирования и архитектуры',
    'Deployment Pipeline Check': 'Проверка конвейера развертывания',
    'Security Audit & Penetration Testing': 'Аудит безопасности и тесты на проникновение',
    'API Gateway Hardening': 'Усиление защиты API-шлюза',
    'Database Migration Protocol': 'Протокол миграции базы данных',
    'Zero-Knowledge Vault Backup': 'Резервное копирование Zero-Knowledge хранилища',
    'Treasury Allocation Matrix': 'Матрица распределения казначейства',
    'Pending': 'В ожидании',
    'Active': 'В работе',
    'In Review': 'На проверке',
    'Completed': 'Завершено',
    'Blocked': 'Заблокировано',
    'Locked': 'Заблокировано зависимостью',
    'Top Secret': 'Совершенно секретно',
    'Secret': 'Секретно',
    'Confidential': 'Конфиденциально',
    'Restricted': 'Ограниченный доступ',
    'Public': 'Общедоступно',
    'Task': 'Задача',
    'Decision Gate': 'Шлюз принятия решений',
    'Automated Trigger': 'Автоматический триггер',
    'Security Guardrail': 'Барьер безопасности',
    'Execute comprehensive structural verification': 'Выполнить комплексную структурную проверку',
    'Zero-knowledge client-side encryption operational': 'Клиентское Zero-Knowledge шифрование работает',
    'Title': 'Заголовок',
    'Description': 'Описание',
    'Status': 'Статус',
    'Clearance': 'Уровень допуска',
    'Dependencies': 'Зависимости',
    'Assigned To': 'Назначено',
    'Estimated Hours': 'Оценка часов',
  },
};

export class TranslationBridge {
  /**
   * Applies the Terminology Shield:
   * Scans text for corporate codenames, cryptographic hashes, hex addresses,
   * variable names, and sensitive patterns, replacing them with [[SHIELD_TOKEN_N]].
   */
  public static shieldTerminology(
    text: string,
    customKeywords: string[] = []
  ): { shieldedText: string; entries: TerminologyShieldEntry[] } {
    const entries: TerminologyShieldEntry[] = [];
    const termMap = new Map<string, TerminologyShieldEntry>();

    // Pattern definitions
    const patterns: Array<{ regex: RegExp; category: TerminologyShieldEntry['category'] }> = [
      // API Keys
      { regex: /\b(?:sk|ai|pk|secret)-[a-zA-Z0-9_-]{8,}\b/g, category: 'TOKEN' },
      // Ethereum/Hex addresses
      { regex: /\b0x[a-fA-F0-9]{6,}\b/g, category: 'HASH' },
      // SHA-256 / 512 / MD5 hashes
      { regex: /\b[a-fA-F0-9]{32,64}\b/g, category: 'HASH' },
      // Ciphers and crypto algorithms
      {
        regex: /\b(?:AES-GCM-256|Argon2id|PBKDF2|secp256k1|Ed25519|HKDF|HMAC-SHA256|SHA-256|Zero-Knowledge)\b/gi,
        category: 'VARIABLE',
      },
      // Corporate Codenames & System tokens
      {
        regex: /\b(?:SOVEREIGN-OS|PROJECT_AEGIS|PROJECT_VALKYRIE|ENCLAVE_[A-Z0-9]+|DAG_NODE_[A-Z0-9_]+|BYOS|BYO-AI)\b/g,
        category: 'CODENAME',
      },
      // Template variables: {{...}} or ${...} or __...__
      { regex: /\{\{[^{}]+\}\}|\$\{[^{}]+\}|__[A-Z0-9_]+__/g, category: 'VARIABLE' },
      // Uppercase identifiers like NODE_STATUS_ACTIVE
      { regex: /\b[A-Z][A-Z0-9_]{3,}[A-Z0-9]\b/g, category: 'VARIABLE' },
    ];

    // Add user custom keywords
    if (customKeywords.length > 0) {
      const escaped = customKeywords
        .filter((k) => k.trim().length > 1)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      if (escaped.length > 0) {
        patterns.unshift({
          regex: new RegExp(`\\b(?:${escaped})\\b`, 'gi'),
          category: 'CODENAME',
        });
      }
    }

    let tokenCounter = 0;
    let workingText = text;

    for (const { regex, category } of patterns) {
      workingText = workingText.replace(regex, (match) => {
        // If already shielded or mapped
        if (match.startsWith('[[SHIELD_TOKEN_')) return match;

        let entry = termMap.get(match);
        if (!entry) {
          const placeholder = `[[SHIELD_TOKEN_${tokenCounter++}]]`;
          entry = { placeholder, originalTerm: match, category };
          termMap.set(match, entry);
          entries.push(entry);
        }
        return entry.placeholder;
      });
    }

    return { shieldedText: workingText, entries };
  }

  /**
   * Replaces all [[SHIELD_TOKEN_N]] placeholders back to their original terms.
   */
  public static unshieldTerminology(
    translatedText: string,
    entries: TerminologyShieldEntry[]
  ): string {
    let result = translatedText;
    for (const entry of entries) {
      // Replace exact placeholder token
      result = result.split(entry.placeholder).join(entry.originalTerm);
      // Also handle potential whitespace or bracket variations introduced by models
      const fuzzyPlaceholder = entry.placeholder.replace('[[', '[').replace(']]', ']');
      result = result.split(fuzzyPlaceholder).join(entry.originalTerm);
    }
    return result;
  }

  /**
   * Translates text to the target language.
   * Utilizes the zero-knowledge Terminology Shield first, then tries direct AI streaming (temp 0.1),
   * falling back cleanly to the deterministic glossary if AI is unavailable.
   */
  public static async translate(
    text: string,
    targetLang: SupportedTranslationLang,
    sourceLang: string = 'en',
    customKeywords: string[] = []
  ): Promise<TranslationResult> {
    const trimmed = text.trim();
    if (!trimmed || targetLang === sourceLang) {
      return {
        originalText: text,
        translatedText: text,
        sourceLang,
        targetLang,
        shieldedTermsCount: 0,
        timestamp: Date.now(),
      };
    }

    // Step 1: Shield corporate codenames, hashes, and variables
    const { shieldedText, entries } = this.shieldTerminology(trimmed, customKeywords);

    let rawTranslated = '';

    // Step 2: Try AI provider if available
    const aiStore = useAiStore.getState();
    const activeProvider = aiStore.activeProvider;
    const key = aiStore.inMemoryKeys[activeProvider];

    if (key && key.trim().length > 0) {
      try {
        const langConfig = SUPPORTED_LANGUAGES[targetLang] || { label: targetLang };
        const prompt = [
          `You are an elite, zero-knowledge technical translation system.`,
          `Translate the following text into ${langConfig.label} (${targetLang}).`,
          `STRICT DIRECTIVE: All shielded placeholders matching "[[SHIELD_TOKEN_N]]" must remain COMPLETELY UNMODIFIED and in place.`,
          `Do NOT add explanations, notes, or markdown fences. Return ONLY the translated string.`,
          `\nText to translate:\n${shieldedText}`,
        ].join('\n');

        const response = await aiStore.executeStream({
          prompt,
          temperature: 0.1,
          maxTokens: 1024,
        });

        if (response && response.trim().length > 0) {
          rawTranslated = response.trim();
        }
      } catch (err) {
        console.warn('AI Translation unavailable or failed, utilizing local deterministic glossary.', err);
      }
    }

    // Step 3: Fallback to deterministic dictionary if AI did not return a translation
    if (!rawTranslated) {
      rawTranslated = this.fallbackTranslate(shieldedText, targetLang);
    }

    // Step 4: Unshield all protected terms
    const finalTranslated = this.unshieldTerminology(rawTranslated, entries);

    return {
      originalText: text,
      translatedText: finalTranslated,
      sourceLang,
      targetLang,
      shieldedTermsCount: entries.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Deterministic local fallback translation using dictionary mapping and keyword replacement
   */
  private static fallbackTranslate(
    text: string,
    targetLang: SupportedTranslationLang
  ): string {
    const dict = GLOSSARY_DICTIONARY[targetLang];
    if (!dict) return text;

    // Check exact match
    if (dict[text]) return dict[text];

    // Otherwise replace known phrases
    let output = text;
    for (const [englishTerm, translatedTerm] of Object.entries(dict)) {
      if (englishTerm.length > 2 && output.includes(englishTerm)) {
        output = output.split(englishTerm).join(translatedTerm);
      }
    }

    return output;
  }
}
