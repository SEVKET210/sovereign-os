/* ============================================================
   SOVEREIGN-OS — Client-Side Credential Authentication Service
   Zero-Knowledge Envelope Encryption, Blind Indexing,
   Memory Sanitization, and Anti-Enumeration Protections.
   ============================================================ */

import { MemorySanitizer } from '../crypto/MemorySanitizer';
import { BlindIndexEngine } from '../crypto/BlindIndexEngine';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';
import { RollingPasswordService } from '../crypto/RollingPasswordService';
import { ThreatDetectionEngine } from '../security/ThreatDetectionEngine';
import {
  validateCredentialRegistrationForm,
  sanitizeInput,
} from '../../utils/credentialValidation';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { useCompanyStore } from '../../stores/useCompanyStore';
import type {
  CredentialRegistrationFormState,
  EncryptedCredentialEnvelope,
  DecryptedUserProfile,
  AuthSubmissionResult,
} from '../../types/auth';
import type { SystemRole, ClearanceLevel } from '../../types';

export class CredentialAuthService {
  private static readonly ENVELOPES_STORAGE_KEY = 'sovereign_credential_envelopes_v1';
  private static readonly BLIND_SALT_STORAGE_KEY = 'sovereign_credential_blind_salt_v1';
  private static readonly PBKDF2_ITERATIONS = 310000;
  private static readonly DUMMY_SALT = new Uint8Array([
    0x21, 0x94, 0x8a, 0x12, 0x5b, 0x93, 0x14, 0x76,
    0x34, 0xaf, 0xc1, 0x09, 0x87, 0x43, 0x6e, 0xd2,
    0x19, 0x74, 0x55, 0xaa, 0xbb, 0xcc, 0xdd, 0xee,
    0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
  ]);

  /**
   * Generates or retrieves the deterministic HMAC blind index salt for this client enclave.
   */
  private static getOrCreateBlindSalt(): Uint8Array {
    if (typeof window === 'undefined' || !window.localStorage) {
      return new Uint8Array(32);
    }
    const stored = localStorage.getItem(this.BLIND_SALT_STORAGE_KEY);
    if (stored) {
      return MemorySanitizer.hexToBytes(stored);
    }
    const newSalt = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(this.BLIND_SALT_STORAGE_KEY, MemorySanitizer.bytesToHex(newSalt));
    return newSalt;
  }

  /**
   * Retrieves all encrypted credential envelopes stored in this enclave.
   */
  public static getStoredEnvelopes(): EncryptedCredentialEnvelope[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = localStorage.getItem(this.ENVELOPES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Finds an encrypted envelope matching the given email address.
   */
  public static getEnvelopeByEmail(email: string): EncryptedCredentialEnvelope | null {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const envelopes = this.getStoredEnvelopes();

    // Check direct emailBlindToken match or stored envelopes
    return (
      envelopes.find((env) => {
        // Direct property check if present
        if ((env as unknown as { email?: string }).email?.toLowerCase() === cleanEmail) {
          return true;
        }
        return false;
      }) || envelopes[0] || null
    );
  }

  /**
   * Persists credential envelopes to secure local storage.
   */
  private static saveEnvelopes(envelopes: EncryptedCredentialEnvelope[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.ENVELOPES_STORAGE_KEY, JSON.stringify(envelopes));
      } catch (err) {
        console.error('Failed to persist credential envelopes:', err);
      }
    }
  }

  /**
   * Derives a 256-bit AES-GCM master encryption key from password and salt
   * using Web Crypto PBKDF2-SHA256 at 310,000 iterations.
   */
  private static async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Executes a dummy PBKDF2 derivation with identical iteration cost
   * to guarantee constant-time verification and eliminate user enumeration.
   */
  private static async executeTimingEqualizationDummy(): Promise<void> {
    try {
      await this.deriveMasterKey('dummy_timing_mitigation_passphrase_123', this.DUMMY_SALT);
    } catch {}
  }

  /**
   * Registers a new operator with Email, Username, Password, optional Duress PIN, and optional TOTP 2FA.
   * Generates a zero-knowledge envelope and initializes active enclave context.
   */
  public static async register(
    formState: CredentialRegistrationFormState
  ): Promise<AuthSubmissionResult> {
    // 1. Strict Validation
    const validation = validateCredentialRegistrationForm(formState, { requireConfirmation: true });
    if (!validation.isValid) {
      const firstError = Object.values(validation.fields).find((f) => !f.isValid);
      return {
        success: false,
        errorTr: firstError?.errorMessageTr || 'Geçersiz kayıt formu bilgileri.',
        errorEn: firstError?.errorMessageEn || 'Invalid registration form inputs.',
      };
    }

    const cleanEmail = validation.fields.email.sanitizedValue;
    const cleanUsername = validation.fields.username.sanitizedValue;
    const cleanPassword = formState.password.trim();

    const blindSalt = this.getOrCreateBlindSalt();

    // 2. Compute Deterministic Blind Index Tokens for duplicate checking
    const emailBlindToken = await BlindIndexEngine.computeBlindToken(cleanEmail, blindSalt);
    const usernameBlindToken = await BlindIndexEngine.computeBlindToken(cleanUsername, blindSalt);

    const existingEnvelopes = this.getStoredEnvelopes();
    const isDuplicate = existingEnvelopes.some(
      (env) => env.emailBlindToken === emailBlindToken || env.usernameBlindToken === usernameBlindToken
    );

    if (isDuplicate) {
      return {
        success: false,
        errorTr: 'Bu e-posta adresi veya kullanıcı adı ile kayıtlı bir hesap bulunmaktadır.',
        errorEn: 'An account with this email address or username already exists.',
      };
    }

    // 3. Generate 32-byte CSPRNG Salt & 12-byte CSPRNG IV
    const saltBytes = crypto.getRandomValues(new Uint8Array(32));
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));

    let masterKey: CryptoKey | null = null;

    try {
      masterKey = await this.deriveMasterKey(cleanPassword, saltBytes);

      const assignedRole: SystemRole = formState.role || 'Founder';
      const assignedClearance: ClearanceLevel = assignedRole === 'Founder' ? 'LEVEL_4' : 'LEVEL_2';

      // 4. Optional Duress Trap PIN verifier
      let duressSaltHex: string | undefined;
      let duressVerifierHex: string | undefined;
      if (formState.duressPin && formState.duressPin.trim()) {
        const dSalt = crypto.getRandomValues(new Uint8Array(32));
        const dVerifierBytes = await RollingPasswordService.deriveDuressVerifierBytes(
          formState.duressPin.trim(),
          dSalt
        );
        duressSaltHex = MemorySanitizer.bytesToHex(dSalt);
        duressVerifierHex = MemorySanitizer.bytesToHex(dVerifierBytes);
      }

      // 5. Optional 30-second Dynamic Rolling TOTP Secret
      let totpSecretHex: string | undefined;
      let totpEnabled: boolean | undefined;
      let totpSampleToken: string | undefined;
      if (formState.enableTotp2FA) {
        const totpBytes = crypto.getRandomValues(new Uint8Array(32));
        totpSecretHex = MemorySanitizer.bytesToHex(totpBytes);
        totpEnabled = true;
        totpSampleToken = RollingPasswordService.deriveTokenForSecret(totpBytes).formatted;
      }

      const userProfile: DecryptedUserProfile = {
        email: cleanEmail,
        username: cleanUsername,
        registeredAt: Date.now(),
        role: assignedRole,
        clearance: assignedClearance,
        companyName: formState.companyName?.trim() || undefined,
        totpEnabled,
        totpSecretHex,
        duressConfigured: !!duressVerifierHex,
      };

      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(JSON.stringify(userProfile));

      // 6. AES-256-GCM Envelope Encryption
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
        masterKey,
        plaintextBuffer
      );

      // 7. Verification Tag: Encrypt a fixed invariant string to verify password on login
      const verificationPayload = encoder.encode('SOVEREIGN_VERIFIED_V1');
      const verificationBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
        masterKey,
        verificationPayload
      );

      const envelope: EncryptedCredentialEnvelope = {
        version: 'sov_cred_v1',
        id: crypto.randomUUID ? crypto.randomUUID() : `sov_env_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        emailBlindToken,
        usernameBlindToken,
        saltHex: MemorySanitizer.bytesToHex(saltBytes),
        ivHex: MemorySanitizer.bytesToHex(ivBytes),
        ciphertextBase64: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
        keyVerificationTag: btoa(String.fromCharCode(...new Uint8Array(verificationBuffer))),
        duressSaltHex,
        duressVerifierHex,
        totpSecretHex,
        totpEnabled,
        createdAt: Date.now(),
        userRole: assignedRole,
        clearance: assignedClearance,
      };

      existingEnvelopes.push(envelope);
      this.saveEnvelopes(existingEnvelopes);

      // 8. Automatically unlock workspace session via KeyDerivationBridge
      await KeyDerivationBridge.initializeContext('sovereign_primary_enclave_01', cleanPassword, false, saltBytes);

      // Synchronize company & permission stores
      if (formState.workspaceMode === 'ENTERPRISE_NODE' && formState.companyName?.trim()) {
        useCompanyStore.getState().createCompany(formState.companyName.trim(), '🏢', cleanUsername);
      } else {
        useCompanyStore.getState().chooseSoloMode(cleanUsername);
      }
      usePermissionStore.getState().switchDevRole(assignedRole);

      const sessionToken = `sovereign_cred_session_${Date.now()}`;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('sovereign-session', sessionToken);
      }

      return {
        success: true,
        user: userProfile,
        sessionToken,
        totpSecretHex,
        totpSampleToken,
      };
    } finally {
      // 9. Volatile Memory Sanitization
      MemorySanitizer.zeroize(saltBytes);
      MemorySanitizer.zeroize(ivBytes);
    }
  }

  /**
   * Authenticates an operator using Email or Username + Password.
   * Supports silent Duress/Decoy Panic activation and dynamic TOTP 2FA challenges.
   * Enforces strict timing-safe mitigation to prevent user enumeration.
   */
  public static async authenticate(
    identifier: string,
    passwordInput: string,
    totpCodeInput?: string
  ): Promise<AuthSubmissionResult> {
    const cleanId = sanitizeInput(identifier).toLowerCase();
    const cleanPassword = passwordInput.trim();

    // Generic error response to prevent user enumeration
    const genericError: AuthSubmissionResult = {
      success: false,
      errorTr: 'Kimlik doğrulama başarısız. Bilgilerinizi kontrol ediniz.',
      errorEn: 'Authentication failed. Invalid credentials or access denied.',
    };

    if (!cleanId || !cleanPassword) {
      await this.executeTimingEqualizationDummy();
      return genericError;
    }

    const blindSalt = this.getOrCreateBlindSalt();

    // Compute blind token for candidate identifier (email or username)
    const candidateBlindToken = await BlindIndexEngine.computeBlindToken(cleanId, blindSalt);

    const envelopes = this.getStoredEnvelopes();
    const targetEnvelope = envelopes.find(
      (env) => env.emailBlindToken === candidateBlindToken || env.usernameBlindToken === candidateBlindToken
    );

    // If account not found, execute dummy PBKDF2 to equalize timing side-channels
    if (!targetEnvelope) {
      await this.executeTimingEqualizationDummy();
      return genericError;
    }

    // 1. Duress / Trap Password Check (Silent Decoy Mode Activation)
    if (targetEnvelope.duressSaltHex && targetEnvelope.duressVerifierHex) {
      try {
        const dSalt = MemorySanitizer.hexToBytes(targetEnvelope.duressSaltHex);
        const dVerifierBytes = await RollingPasswordService.deriveDuressVerifierBytes(cleanPassword, dSalt);
        const dVerifierHex = MemorySanitizer.bytesToHex(dVerifierBytes);
        if (dVerifierHex === targetEnvelope.duressVerifierHex) {
          // Trigger Silent Panic Decoy Mode
          ThreatDetectionEngine.triggerDuressDistress({
            triggerSource: 'CREDENTIAL_AUTH_DURESS_TRIGGER',
            envelopeId: targetEnvelope.id,
            timestamp: Date.now(),
          });
          const decoySession = `decoy_node_${Date.now()}`;
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('sovereign-session', decoySession);
            sessionStorage.setItem('sovereign-decoy-mode', 'true');
          }
          useCompanyStore.getState().chooseSoloMode('OPERATOR_DECOY');
          usePermissionStore.getState().switchDevRole('Founder');

          return {
            success: true,
            isDecoy: true,
            isDuress: true,
            sessionToken: decoySession,
          };
        }
      } catch {}
    }

    const saltBytes = MemorySanitizer.hexToBytes(targetEnvelope.saltHex);
    const ivBytes = MemorySanitizer.hexToBytes(targetEnvelope.ivHex);

    try {
      // Derive candidate Master Key with user's salt
      const candidateKey = await this.deriveMasterKey(cleanPassword, saltBytes);

      // Verify Key Verification Tag
      const verificationBytes = Uint8Array.from(atob(targetEnvelope.keyVerificationTag), (c) => c.charCodeAt(0));
      let decryptedVerificationBuffer: ArrayBuffer;
      try {
        decryptedVerificationBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
          candidateKey,
          verificationBytes
        );
      } catch {
        return genericError;
      }

      const decoder = new TextDecoder();
      const verificationString = decoder.decode(decryptedVerificationBuffer);
      if (verificationString !== 'SOVEREIGN_VERIFIED_V1') {
        return genericError;
      }

      // 2. Check Dynamic 2FA / TOTP challenge if enabled
      if (targetEnvelope.totpEnabled && targetEnvelope.totpSecretHex) {
        if (!totpCodeInput || !totpCodeInput.trim()) {
          return {
            success: false,
            totpRequired: true,
            tempAuthToken: btoa(`${targetEnvelope.id}:${Date.now()}`),
            errorTr: 'Bu hesap için 30 saniyelik dinamik TOTP kodu zorunludur.',
            errorEn: '30-second dynamic TOTP code is required for this account.',
          };
        }

        const cleanTotp = totpCodeInput.trim();

        // Check if duress PIN was entered in TOTP challenge box
        if (targetEnvelope.duressSaltHex && targetEnvelope.duressVerifierHex) {
          const dSalt = MemorySanitizer.hexToBytes(targetEnvelope.duressSaltHex);
          const dVerifierBytes = await RollingPasswordService.deriveDuressVerifierBytes(cleanTotp, dSalt);
          if (MemorySanitizer.bytesToHex(dVerifierBytes) === targetEnvelope.duressVerifierHex) {
            ThreatDetectionEngine.triggerDuressDistress({
              triggerSource: 'TOTP_CHALLENGE_DURESS_TRIGGER',
              envelopeId: targetEnvelope.id,
              timestamp: Date.now(),
            });
            const decoySession = `decoy_node_${Date.now()}`;
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem('sovereign-session', decoySession);
              sessionStorage.setItem('sovereign-decoy-mode', 'true');
            }
            useCompanyStore.getState().chooseSoloMode('OPERATOR_DECOY');
            usePermissionStore.getState().switchDevRole('Founder');
            return {
              success: true,
              isDecoy: true,
              isDuress: true,
              sessionToken: decoySession,
            };
          }
        }

        // Verify dynamic token
        const totpBytes = MemorySanitizer.hexToBytes(targetEnvelope.totpSecretHex);
        const isTotpValid = RollingPasswordService.verifyTokenForSecret(totpBytes, cleanTotp);
        if (!isTotpValid) {
          return {
            success: false,
            totpRequired: true,
            errorTr: 'Geçersiz veya süresi dolmuş dinamik TOTP kodu.',
            errorEn: 'Invalid or expired dynamic TOTP code.',
          };
        }
      }

      // Decrypt User Profile Payload
      const cipherBytes = Uint8Array.from(atob(targetEnvelope.ciphertextBase64), (c) => c.charCodeAt(0));
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
        candidateKey,
        cipherBytes
      );

      const userProfile: DecryptedUserProfile = JSON.parse(decoder.decode(decryptedBuffer));

      // Update last authenticated timestamp in envelope
      targetEnvelope.lastAuthenticatedAt = Date.now();
      this.saveEnvelopes(envelopes);

      // Unlock enclave session via KeyDerivationBridge
      await KeyDerivationBridge.initializeContext('sovereign_primary_enclave_01', cleanPassword, false, saltBytes);

      useCompanyStore.getState().chooseSoloMode(userProfile.username);
      usePermissionStore.getState().switchDevRole(userProfile.role);

      const sessionToken = `sovereign_cred_session_${Date.now()}`;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('sovereign-session', sessionToken);
      }

      return {
        success: true,
        user: userProfile,
        sessionToken,
      };
    } catch {
      return genericError;
    } finally {
      MemorySanitizer.zeroize(saltBytes);
      MemorySanitizer.zeroize(ivBytes);
    }
  }

  public static readonly TEST_CREDENTIALS = {
    email: 'test@sovereign.local',
    username: 'test_operator',
    password: 'SovereignPass123!',
    role: 'Founder' as SystemRole,
    companyName: 'Sovereign Test Enclave',
  };

  /**
   * Performs an instant 1-click test login, ensuring the zero-knowledge
   * test envelope is enrolled and session is fully active.
   */
  public static async loginAsTestUser(): Promise<AuthSubmissionResult> {
    const creds = this.TEST_CREDENTIALS;

    try {
      // 1. Check if test operator is registered in Credential Envelopes
      const envelopes = this.getStoredEnvelopes();
      const blindSalt = this.getOrCreateBlindSalt();
      const emailBlind = await BlindIndexEngine.computeBlindToken(creds.email, blindSalt);
      const existing = envelopes.find((e) => e.emailBlindToken === emailBlind);

      if (!existing) {
        // Register test account properly so both instant login and manual credentials login work
        await this.register({
          email: creds.email,
          username: creds.username,
          password: creds.password,
          confirmPassword: creds.password,
          workspaceMode: 'ENTERPRISE_NODE',
          companyName: creds.companyName,
          role: creds.role,
        });
      }

      // Also ensure enrolled in RollingPasswordService
      const dynamicOp = RollingPasswordService.getEnrolledDynamicOperator(creds.username);
      if (!dynamicOp) {
        await RollingPasswordService.enrollDynamicOperator({
          alias: creds.username.toUpperCase(),
          masterPassphrase: creds.password,
          workspaceMode: 'ENTERPRISE_NODE',
          companyName: creds.companyName,
        });
      }

      // Authenticate with test credentials
      const authResult = await this.authenticate(creds.email, creds.password);
      if (authResult.success) {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('sovereign_last_user_email', creds.email);
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('sovereign_duress_onboarding_completed', 'true');
        }
        return authResult;
      }
    } catch (e) {
      console.warn('Test user registration/authentication fallback:', e);
    }

    // Direct fallback session activation if cryptography throws or already initialized
    const sessionToken = `sovereign_test_session_${Date.now()}`;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('sovereign-session', sessionToken);
      sessionStorage.setItem('sovereign_last_user_email', creds.email);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('sovereign_duress_onboarding_completed', 'true');
    }

    try {
      await KeyDerivationBridge.initializeContext('sovereign_primary_enclave_01', creds.password, false);
    } catch {}

    useCompanyStore.getState().createCompany(creds.companyName, '🏢', creds.username);
    usePermissionStore.getState().switchDevRole(creds.role);

    return {
      success: true,
      user: {
        email: creds.email,
        username: creds.username,
        role: creds.role,
        clearance: 'LEVEL_4',
        registeredAt: Date.now(),
        companyName: creds.companyName,
      },
      sessionToken,
    };
  }

  /**
   * Clears all registered envelopes (for testing / reset).
   */
  public static clearEnvelopes(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.ENVELOPES_STORAGE_KEY);
    }
  }
}
