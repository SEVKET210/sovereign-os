/* ============================================================
   SOVEREIGN-OS — Credential Authentication & Registration Types
   Military-grade zero-knowledge data contracts
   ============================================================ */

import type { SystemRole, ClearanceLevel } from './index';

export type AuthMode = 'register' | 'login';

export interface CredentialRegistrationFormState {
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
  duressPin?: string;           // Optional emergency duress/panic trap password
  enableTotp2FA?: boolean;      // Optional 30-second rolling dynamic code verification
  workspaceMode?: 'PERSONAL_SANDBOX' | 'ENTERPRISE_NODE';
  companyName?: string;
  role?: SystemRole;
}

export interface PasswordCriteriaStatus {
  hasMinLength: boolean;    // >= 12 characters
  hasUppercase: boolean;    // [A-Z]
  hasLowercase: boolean;    // [a-z]
  hasNumber: boolean;       // [0-9]
  hasSpecial: boolean;      // [^a-zA-Z0-9]
  noCommonPatterns: boolean;// No simple sequences or dictionary words
}

export type PasswordStrengthLevel = 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Sovereign';

export interface PasswordStrengthEvaluation {
  score: number;            // 0 - 4
  level: PasswordStrengthLevel;
  entropyBits: number;      // Shannon Information Entropy in bits
  criteria: PasswordCriteriaStatus;
  feedbackTr: string;
  feedbackEn: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errorMessageTr?: string;
  errorMessageEn?: string;
}

export interface CredentialFormValidationResult {
  isValid: boolean;
  fields: {
    email: FieldValidationResult;
    username: FieldValidationResult;
    password: FieldValidationResult;
    confirmPassword?: FieldValidationResult;
    duressPin?: FieldValidationResult;
  };
}

export interface EncryptedCredentialEnvelope {
  version: 'sov_cred_v1';
  id: string;                      // Random envelope UUID
  emailBlindToken: string;          // bidx_... HMAC-SHA256 of normalized email
  usernameBlindToken: string;       // bidx_... HMAC-SHA256 of normalized username
  saltHex: string;                  // 32-byte CSPRNG random salt (hex)
  ivHex: string;                    // 12-byte CSPRNG random IV (hex)
  ciphertextBase64: string;         // AES-256-GCM encrypted user profile
  keyVerificationTag: string;       // Verification digest to validate password without leaking it
  duressSaltHex?: string;           // Optional 32-byte salt for duress trap PIN
  duressVerifierHex?: string;       // Optional PBKDF2 verifier for duress trap PIN
  totpSecretHex?: string;           // Optional 32-byte TOTP secret for dynamic 2FA
  totpEnabled?: boolean;            // Whether dynamic 30s rolling code is active
  createdAt: number;                // Timestamp
  lastAuthenticatedAt?: number;
  userRole: SystemRole;
  clearance: ClearanceLevel;
}

export interface DecryptedUserProfile {
  email: string;
  username: string;
  registeredAt: number;
  role: SystemRole;
  clearance: ClearanceLevel;
  companyName?: string;
  totpEnabled?: boolean;
  totpSecretHex?: string;
  duressConfigured?: boolean;
}

export interface AuthSubmissionResult {
  success: boolean;
  errorTr?: string;
  errorEn?: string;
  user?: DecryptedUserProfile;
  sessionToken?: string;
  isDecoy?: boolean;                // Set true when Duress PIN triggers silent Decoy Node
  isDuress?: boolean;               // Set true when Duress PIN triggers silent Decoy Node
  totpRequired?: boolean;           // Prompt user for 30s dynamic rolling code
  tempAuthToken?: string;           // Transient token to complete 2FA challenge
  totpSecretHex?: string;           // Returned on registration if 2FA was enabled
  totpSampleToken?: string;         // Initial rolling token preview
}

export interface DynamicEnclaveOperator {
  alias: string;
  enclaveId: string;
  saltHex: string;
  verifierHex: string;
  totpSecretHex: string;
  duressSaltHex?: string;
  duressVerifierHex?: string;
  enrolledAt: number;
  lastLoginAt?: number;
  workspaceMode: 'PERSONAL_SANDBOX' | 'ENTERPRISE_NODE';
  companyName?: string;
}
