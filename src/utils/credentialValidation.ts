/* ============================================================
   SOVEREIGN-OS — Credential Validation & Sanitization Engine
   RFC 5322 compliance, strict password complexity policies,
   Shannon information entropy, and anti-injection sanitization.
   ============================================================ */

import type {
  FieldValidationResult,
  PasswordCriteriaStatus,
  PasswordStrengthEvaluation,
  PasswordStrengthLevel,
  CredentialRegistrationFormState,
  CredentialFormValidationResult,
} from '../types/auth';

/**
 * Strips null bytes, non-printable control characters, zero-width Unicode characters,
 * and dangerous markup injection vectors while preserving legitimate input.
 */
export function sanitizeInput(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove C0 and C1 control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width spaces, joiners, directional overrides, BOM
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    // Strip script and style blocks with their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Sanitizes username by stripping disallowed punctuation and collapse inner spacing.
 */
export function sanitizeUsername(raw: string): string {
  const clean = sanitizeInput(raw);
  // Allow alphanumeric, underscores, hyphens, and periods
  return clean.replace(/[^a-zA-Z0-9_.-]/g, '');
}

// ── RFC 5322 Email Validation ──────────────────────────────
/**
 * RFC 5322 Section 3.4.1 compliant regex for email address verification.
 * Enforces standard local-part and domain labels with proper TLD constraints.
 */
const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Validates an email address against RFC standards, length constraints, and injection risks.
 */
export function validateEmail(rawEmail: string): FieldValidationResult {
  const sanitized = sanitizeInput(rawEmail).toLowerCase();

  if (!sanitized) {
    return {
      isValid: false,
      sanitizedValue: '',
      errorMessageTr: 'E-posta adresi zorunludur.',
      errorMessageEn: 'Email address is required.',
    };
  }

  // RFC total length constraint (max 254 octets per RFC 5321)
  if (sanitized.length > 254) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'E-posta adresi 254 karakterden uzun olamaz.',
      errorMessageEn: 'Email address exceeds maximum length of 254 characters.',
    };
  }

  // Check structure contains exactly one '@'
  const atParts = sanitized.split('@');
  if (atParts.length !== 2) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Geçersiz e-posta biçimi (@ sembolü eksik veya birden fazla).',
      errorMessageEn: 'Invalid email format (missing or multiple @ symbols).',
    };
  }

  const [localPart, domainPart] = atParts;

  // Local-part length constraint (max 64 octets per RFC 5321)
  if (!localPart || localPart.length > 64) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'E-posta kullanıcı adı kısmı 1 ile 64 karakter arasında olmalıdır.',
      errorMessageEn: 'Email local-part must be between 1 and 64 characters.',
    };
  }

  // Domain length constraint (max 255 octets)
  if (!domainPart || domainPart.length > 255) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'E-posta alan adı (domain) geçerli uzunlukta değil.',
      errorMessageEn: 'Email domain part exceeds allowable length.',
    };
  }

  // Disallow leading, trailing, or consecutive dots
  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.includes('..')
  ) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'E-posta ardışık veya başta/sonda nokta (.) içeremez.',
      errorMessageEn: 'Email contains consecutive, leading, or trailing dots.',
    };
  }

  // Enforce RFC 5322 regex match
  if (!RFC_5322_EMAIL_REGEX.test(sanitized)) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Lütfen RFC uyumlu geçerli bir e-posta adresi giriniz (örn: user@domain.com).',
      errorMessageEn: 'Please provide a valid RFC-compliant email address (e.g. user@domain.com).',
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized,
  };
}

// ── Username Constraints & Validation ──────────────────────
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,30}[a-zA-Z0-9]$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'founder',
  'system',
  'operator_00',
  'null',
  'undefined',
  'anonymous',
  'master',
  'sovereign',
  'security',
  'support',
  'helpdesk',
  'api',
]);

/**
 * Validates username against character policies, length constraints, and reserved names.
 */
export function validateUsername(rawUsername: string): FieldValidationResult {
  const trimmed = (rawUsername || '').trim();
  const sanitized = sanitizeUsername(rawUsername);

  if (!trimmed || !sanitized) {
    return {
      isValid: false,
      sanitizedValue: '',
      errorMessageTr: 'Kullanıcı adı zorunludur.',
      errorMessageEn: 'Username is required.',
    };
  }

  // Reject spaces or characters outside alphanumeric, underscore, dash, and period
  if (/[^a-zA-Z0-9_.-]/.test(trimmed)) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Kullanıcı adı boşluk veya özel simgeler içeremez. Yalnızca harf, rakam, alt çizgi (_), tire (-) ve nokta (.) kullanılabilir.',
      errorMessageEn: 'Username cannot contain spaces or special characters. Only letters, numbers, underscores, hyphens, and periods are allowed.',
    };
  }

  if (sanitized.length < 3 || sanitized.length > 32) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Kullanıcı adı 3 ile 32 karakter arasında olmalıdır.',
      errorMessageEn: 'Username must be between 3 and 32 characters.',
    };
  }

  if (/^[._-]/.test(sanitized) || /[._-]$/.test(sanitized)) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Kullanıcı adı nokta, alt çizgi veya tire ile başlayamaz veya bitemez.',
      errorMessageEn: 'Username cannot start or end with punctuation (., _, -).',
    };
  }

  // Consecutive special characters
  if (/[._-]{2,}/.test(sanitized)) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Kullanıcı adı ardışık özel karakterler (.., __, --) içeremez.',
      errorMessageEn: 'Username cannot contain consecutive special characters (.., __, --).',
    };
  }

  if (!USERNAME_REGEX.test(sanitized)) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Kullanıcı adı yalnızca alfanümerik karakterler, alt çizgi, tire ve nokta içerebilir.',
      errorMessageEn: 'Username can only contain alphanumeric characters, underscores, hyphens, and periods.',
    };
  }

  if (RESERVED_USERNAMES.has(sanitized.toLowerCase())) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Bu kullanıcı adı sistem tarafından ayrılmıştır. Lütfen başka bir ad seçiniz.',
      errorMessageEn: 'This username is reserved by the system. Please select another.',
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized,
  };
}

// ── Password Complexity & Information Entropy ───────────────
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '123456789012',
  'qwertyuiopas',
  'sovereign2026',
  'admin1234567',
  'masterpass12',
  'iloveyou1234',
  'welcome12345',
]);

/**
 * Calculates Shannon information entropy of a passphrase in bits.
 * E = L * log2(PoolSize) with penalty for repetitive sequences.
 */
export function calculatePasswordEntropy(password: string): number {
  if (!password) return 0;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigits) poolSize += 10;
  if (hasSymbols) poolSize += 33; // Standard printable symbols

  if (poolSize === 0) return 0;

  let entropy = password.length * Math.log2(poolSize);

  // Repetition penalty: detect repeated characters or 3+ character sequences
  const repeatedMatches = password.match(/(.)\1{2,}/g);
  if (repeatedMatches) {
    entropy -= repeatedMatches.length * 8;
  }

  // Sequential penalty (e.g. abc, 123)
  const lower = password.toLowerCase();
  if (
    lower.includes('abc') ||
    lower.includes('123') ||
    lower.includes('xyz') ||
    lower.includes('qwe')
  ) {
    entropy -= 6;
  }

  return Math.max(0, Math.round(entropy * 10) / 10);
}

/**
 * Evaluates password criteria, Shannon entropy, and security rating.
 */
export function evaluatePasswordStrength(
  password: string,
  userContext?: { username?: string; email?: string }
): PasswordStrengthEvaluation {
  const sanitized = sanitizeInput(password);

  const criteria: PasswordCriteriaStatus = {
    hasMinLength: sanitized.length >= 12,
    hasUppercase: /[A-Z]/.test(sanitized),
    hasLowercase: /[a-z]/.test(sanitized),
    hasNumber: /[0-9]/.test(sanitized),
    hasSpecial: /[^a-zA-Z0-9]/.test(sanitized),
    noCommonPatterns: true,
  };

  // Check common passwords
  if (COMMON_PASSWORDS.has(sanitized.toLowerCase())) {
    criteria.noCommonPatterns = false;
  }

  // Check if password contains username or email local-part
  if (userContext) {
    if (userContext.username && userContext.username.length >= 3) {
      if (sanitized.toLowerCase().includes(userContext.username.toLowerCase())) {
        criteria.noCommonPatterns = false;
      }
    }
    if (userContext.email && userContext.email.includes('@')) {
      const emailLocal = userContext.email.split('@')[0];
      if (emailLocal.length >= 3 && sanitized.toLowerCase().includes(emailLocal.toLowerCase())) {
        criteria.noCommonPatterns = false;
      }
    }
  }

  const entropyBits = calculatePasswordEntropy(sanitized);

  // Criteria count (out of 6)
  const criteriaPassed = Object.values(criteria).filter(Boolean).length;

  let score = 0;
  let level: PasswordStrengthLevel = 'Very Weak';
  let feedbackTr = 'Şifre çok zayıf. En az 12 karakter, büyük/küçük harf, rakam ve sembol kullanınız.';
  let feedbackEn = 'Password is very weak. Use at least 12 chars with upper/lower, numbers, and symbols.';

  if (criteria.hasMinLength && criteriaPassed >= 4 && entropyBits >= 40) {
    score = 1;
    level = 'Weak';
    feedbackTr = 'Şifre temel kriterleri karşılıyor ancak kaba kuvvet saldırılarına karşı yetersiz.';
    feedbackEn = 'Password meets basic requirements but remains vulnerable to brute-force attacks.';
  }

  if (criteria.hasMinLength && criteriaPassed >= 5 && entropyBits >= 55) {
    score = 2;
    level = 'Fair';
    feedbackTr = 'İyi şifre. Güvenliği artırmak için uzunluğu 14+ karaktere çıkarınız.';
    feedbackEn = 'Fair password. Consider increasing length to 14+ characters for higher security.';
  }

  if (criteria.hasMinLength && criteriaPassed === 6 && entropyBits >= 70) {
    score = 3;
    level = 'Strong';
    feedbackTr = 'Güçlü şifre. Kriptografik standartlara uygundur.';
    feedbackEn = 'Strong password. Complies with zero-knowledge cryptographic standards.';
  }

  if (sanitized.length >= 16 && criteriaPassed === 6 && entropyBits >= 85) {
    score = 4;
    level = 'Sovereign';
    feedbackTr = 'Hükümran (Sovereign) Düzeyinde Güvenlik. Askeri dereceli kuantum-dirençli entropi.';
    feedbackEn = 'Sovereign-Grade Security. Military-grade quantum-resistant entropy.';
  }

  return {
    score,
    level,
    entropyBits,
    criteria,
    feedbackTr,
    feedbackEn,
  };
}

/**
 * Validates password input against strict system policies.
 */
export function validatePassword(
  rawPassword: string,
  userContext?: { username?: string; email?: string }
): FieldValidationResult {
  const sanitized = sanitizeInput(rawPassword);

  if (!sanitized) {
    return {
      isValid: false,
      sanitizedValue: '',
      errorMessageTr: 'Şifre alanı zorunludur.',
      errorMessageEn: 'Password is required.',
    };
  }

  const evaluation = evaluatePasswordStrength(sanitized, userContext);

  if (!evaluation.criteria.hasMinLength) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre en az 12 karakter uzunluğunda olmalıdır.',
      errorMessageEn: 'Password must be at least 12 characters long.',
    };
  }

  if (!evaluation.criteria.hasUppercase) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre en az bir büyük harf (A-Z) içermelidir.',
      errorMessageEn: 'Password must contain at least one uppercase letter (A-Z).',
    };
  }

  if (!evaluation.criteria.hasLowercase) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre en az bir küçük harf (a-z) içermelidir.',
      errorMessageEn: 'Password must contain at least one lowercase letter (a-z).',
    };
  }

  if (!evaluation.criteria.hasNumber) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre en az bir rakam (0-9) içermelidir.',
      errorMessageEn: 'Password must contain at least one numeric digit (0-9).',
    };
  }

  if (!evaluation.criteria.hasSpecial) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre en az bir özel karakter (!@#$%^&*...) içermelidir.',
      errorMessageEn: 'Password must contain at least one special character (!@#$%^&*...).',
    };
  }

  if (!evaluation.criteria.noCommonPatterns) {
    return {
      isValid: false,
      sanitizedValue: sanitized,
      errorMessageTr: 'Şifre yaygın tahmin edilebilir kelimeler, kullanıcı adı veya e-posta içeremez.',
      errorMessageEn: 'Password cannot contain common patterns, your username, or your email.',
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized,
  };
}

/**
 * Validates password confirmation match.
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword?: string
): FieldValidationResult {
  const cleanPassword = sanitizeInput(password);
  const cleanConfirm = sanitizeInput(confirmPassword || '');

  if (!cleanConfirm) {
    return {
      isValid: false,
      sanitizedValue: '',
      errorMessageTr: 'Şifre tekrarı zorunludur.',
      errorMessageEn: 'Password confirmation is required.',
    };
  }

  if (cleanPassword !== cleanConfirm) {
    return {
      isValid: false,
      sanitizedValue: cleanConfirm,
      errorMessageTr: 'Şifreler birbiriyle eşleşmiyor.',
      errorMessageEn: 'Passwords do not match.',
    };
  }

  return {
    isValid: true,
    sanitizedValue: cleanConfirm,
  };
}

/**
 * Validates the complete Credential Registration Form.
 */
export function validateCredentialRegistrationForm(
  formState: CredentialRegistrationFormState,
  options: { requireConfirmation?: boolean } = { requireConfirmation: true }
): CredentialFormValidationResult {
  const emailResult = validateEmail(formState.email);
  const usernameResult = validateUsername(formState.username);
  const passwordResult = validatePassword(formState.password, {
    email: emailResult.sanitizedValue,
    username: usernameResult.sanitizedValue,
  });

  const fields: CredentialFormValidationResult['fields'] = {
    email: emailResult,
    username: usernameResult,
    password: passwordResult,
  };

  let isFormValid = emailResult.isValid && usernameResult.isValid && passwordResult.isValid;

  if (options.requireConfirmation) {
    const confirmResult = validatePasswordConfirmation(
      passwordResult.sanitizedValue,
      formState.confirmPassword
    );
    fields.confirmPassword = confirmResult;
    if (!confirmResult.isValid) {
      isFormValid = false;
    }
  }

  return {
    isValid: isFormValid,
    fields,
  };
}
