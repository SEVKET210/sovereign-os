/* ============================================================
   SOVEREIGN-OS — Company & Session Store
   Manages the application mode (Solo / Company), the active
   company profile, and the session identity of the logged-in
   operator. This is the single source of truth for "who am I
   and what company am I in?"
   ============================================================ */

import { create } from 'zustand';
import type { AppMode, CompanyProfile, SessionProfile } from '../types/company';
import type { InviteToken } from '../types/team';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';
import { ROLE_DEFINITIONS } from '../types/permissions';

const STORAGE_KEYS = {
  SESSION: 'sovereign_session_profile_v1',
  COMPANY: 'sovereign_company_profile_v1',
  INVITES: 'sovereign_team_invites_v2',
  SETUP_DONE: 'sovereign_setup_completed_v1',
} as const;

// ── Helpers ──────────────────────────────────────────────────

function readLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function removeLocal(key: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateOperatorId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Determine initial app mode ────────────────────────────────

function resolveInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'LOADING';

  const setupDone = localStorage.getItem(STORAGE_KEYS.SETUP_DONE);
  if (!setupDone) return 'SETUP';

  const session = readLocal<SessionProfile>(STORAGE_KEYS.SESSION);
  if (!session) return 'SETUP';

  if (session.isSolo) return 'SOLO';
  if (session.isFounder) return 'COMPANY_FOUNDER';
  return 'COMPANY_MEMBER';
}

// ── Store interface ───────────────────────────────────────────

interface CompanyStoreState {
  appMode: AppMode;
  company: CompanyProfile | null;
  sessionProfile: SessionProfile | null;

  // Derived
  isDevMode: boolean;

  // Setup actions
  chooseSoloMode: (alias: string) => void;
  createCompany: (companyName: string, logoEmoji: string, founderAlias: string) => void;

  // Invite acceptance
  acceptInvite: (
    token: string,
    alias: string,
    invites: InviteToken[]
  ) => { success: boolean; error?: string };

  // Management
  updateAlias: (alias: string) => void;
  resetToSetup: () => void;
}

export const useCompanyStore = create<CompanyStoreState>((set, get) => {
  const initialMode = resolveInitialMode();
  const initialSession = readLocal<SessionProfile>(STORAGE_KEYS.SESSION);
  const initialCompany = readLocal<CompanyProfile>(STORAGE_KEYS.COMPANY);

  // Detect devmode via URL param
  const isDevMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('devmode');

  return {
    appMode: initialMode,
    company: initialCompany,
    sessionProfile: initialSession,
    isDevMode,

    // ── Solo Mode Setup ─────────────────────────────────────
    chooseSoloMode: (alias: string) => {
      TactileSoundEngine.playUnlockShimmer();

      const session: SessionProfile = {
        operatorId: 'op_00',
        alias: alias.trim().toUpperCase() || 'OPERATOR_00',
        role: 'Founder',
        clearance: 'LEVEL_4',
        department: 'Executive',
        companyId: null,
        companyName: null,
        isFounder: true,
        isSolo: true,
      };

      writeLocal(STORAGE_KEYS.SESSION, session);
      writeLocal(STORAGE_KEYS.SETUP_DONE, true);
      removeLocal(STORAGE_KEYS.COMPANY);

      set({ appMode: 'SOLO', sessionProfile: session, company: null });
      showToast(`Hoş geldin, ${session.alias}! Solo Kurucu modunda çalışıyorsun.`, 'success');
    },

    // ── Company Founder Setup ───────────────────────────────
    createCompany: (companyName: string, logoEmoji: string, founderAlias: string) => {
      TactileSoundEngine.playUnlockShimmer();

      const companyId = generateId();
      const operatorId = 'op_00';

      const company: CompanyProfile = {
        id: companyId,
        name: companyName.trim(),
        logoEmoji: logoEmoji || '🏢',
        foundedAt: Date.now(),
        founderId: operatorId,
      };

      const session: SessionProfile = {
        operatorId,
        alias: founderAlias.trim().toUpperCase() || 'KURUCU',
        role: 'Founder',
        clearance: 'LEVEL_4',
        department: 'Executive',
        companyId,
        companyName: company.name,
        isFounder: true,
        isSolo: false,
      };

      writeLocal(STORAGE_KEYS.COMPANY, company);
      writeLocal(STORAGE_KEYS.SESSION, session);
      writeLocal(STORAGE_KEYS.SETUP_DONE, true);

      set({ appMode: 'COMPANY_FOUNDER', company, sessionProfile: session });
      showToast(`${company.logoEmoji} ${company.name} şirketi kuruldu! Hoş geldin, ${session.alias}.`, 'success');
    },

    // ── Accept Invite ───────────────────────────────────────
    acceptInvite: (token: string, alias: string, invites: InviteToken[]) => {
      const now = Date.now();
      const invite = invites.find((inv) => inv.token === token);

      if (!invite) {
        return { success: false, error: 'Geçersiz davetiye kodu. Lütfen patronunuzdan yeni bir davetiye isteyin.' };
      }
      if (invite.status !== 'ACTIVE') {
        return { success: false, error: `Bu davetiye artık geçerli değil (${invite.status}).` };
      }
      if (invite.expiresAt < now) {
        return { success: false, error: 'Bu davetiye süresi dolmuş. Patronunuzdan yeni bir davetiye isteyin.' };
      }
      if (invite.usedCount >= invite.maxUses) {
        return { success: false, error: 'Bu davetiyenin kullanım limiti dolmuş.' };
      }

      TactileSoundEngine.playUnlockShimmer();

      // Read the company profile from the invite creator's company
      const existingCompany = readLocal<CompanyProfile>(STORAGE_KEYS.COMPANY);

      const operatorId = generateOperatorId();

      const roleDef = ROLE_DEFINITIONS[invite.preAssignedRole];

      const session: SessionProfile = {
        operatorId,
        alias: alias.trim().toUpperCase() || invite.preAssignedRole.toUpperCase(),
        role: invite.preAssignedRole,
        clearance: invite.preAssignedClearance,
        department: invite.department !== 'Open' ? invite.department : 'Operations',
        companyId: existingCompany?.id || null,
        companyName: existingCompany?.name || null,
        isFounder: false,
        isSolo: false,
      };

      writeLocal(STORAGE_KEYS.SESSION, session);
      writeLocal(STORAGE_KEYS.SETUP_DONE, true);

      set({ appMode: 'COMPANY_MEMBER', sessionProfile: session, company: existingCompany });

      showToast(
        `${roleDef.badgeEmoji} ${session.alias} olarak ${existingCompany?.name || 'şirkete'} katıldın! Rol: ${roleDef.labelTr}`,
        'success'
      );

      return { success: true };
    },

    // ── Helpers ─────────────────────────────────────────────
    updateAlias: (alias: string) => {
      const current = get().sessionProfile;
      if (!current) return;
      const updated: SessionProfile = { ...current, alias: alias.trim().toUpperCase() };
      writeLocal(STORAGE_KEYS.SESSION, updated);
      set({ sessionProfile: updated });
    },

    resetToSetup: () => {
      removeLocal(STORAGE_KEYS.SESSION);
      removeLocal(STORAGE_KEYS.COMPANY);
      removeLocal(STORAGE_KEYS.SETUP_DONE);
      set({ appMode: 'SETUP', sessionProfile: null, company: null });
    },
  };
});
