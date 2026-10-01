/* ============================================================
   SOVEREIGN-OS — Permissions & Active Role State Store
   The active role is now read from useCompanyStore.sessionProfile.
   - Solo mode: always Founder
   - Company Founder: always Founder
   - Company Member: role pre-assigned at invite time (immutable)
   - Dev mode (?devmode=true): role switcher is active for testing
   ============================================================ */

import { create } from 'zustand';
import type { SystemRole } from '../types/team';
import type { Permission, RoleDefinition } from '../types/permissions';
import { ROLE_DEFINITIONS } from '../types/permissions';
import { useCompanyStore } from './useCompanyStore';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';

import type { ClearanceLevel } from '../types';

const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

// ── Dev-mode override (only used when ?devmode=true in URL) ──
const DEV_STORAGE_KEY = 'sovereign_devmode_active_operator_id';

export interface PredefinedProfile {
  id: string;
  alias: string;
  role: SystemRole;
}

/** Predefined profiles used ONLY in devmode for testing */
export const DEV_PROFILES: PredefinedProfile[] = [
  { id: 'op_dev_founder',  alias: 'OPERATOR_00 (KURUCU)',        role: 'Founder'         },
  { id: 'op_dev_lead',     alias: 'SELİN_KAYA (TAKIM LİDERİ)',  role: 'Lead Architect'  },
  { id: 'op_dev_employee', alias: 'AHMET_YILMAZ (ÇALIŞAN)',      role: 'Employee'        },
  { id: 'op_dev_intern',   alias: 'CAN_DEMİR (STAJYER)',         role: 'Intern'          },
  { id: 'op_dev_auditor',  alias: 'KEMAL_ÖZTÜRK (DENETÇİ)',      role: 'Auditor'         },
];

interface PermissionStoreState {
  /** Dev-mode only: override operator id */
  devOperatorId: string;
  isMatrixModalOpen: boolean;

  // Getters — these always read from companyStore in production
  getActiveRole: () => SystemRole;
  currentRole: SystemRole;
  getActiveRoleDef: () => RoleDefinition;
  getActiveClearance: () => ClearanceLevel;
  getCurrentAlias: () => string;
  canAccessClearance: (level: ClearanceLevel) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isFounder: () => boolean;
  isManager: () => boolean;
  isEmployee: () => boolean;
  isIntern: () => boolean;
  isAuditor: () => boolean;

  // Actions — only functional in devmode
  switchDevRole: (role: SystemRole) => void;
  switchRole: (role: SystemRole) => void;
  openMatrixModal: () => void;
  closeMatrixModal: () => void;
}

function loadDevOpId(): string {
  if (typeof window === 'undefined') return DEV_PROFILES[0].id;
  try {
    const saved = localStorage.getItem(DEV_STORAGE_KEY);
    return saved && DEV_PROFILES.some((p) => p.id === saved) ? saved : DEV_PROFILES[0].id;
  } catch {
    return DEV_PROFILES[0].id;
  }
}

export const usePermissionStore = create<PermissionStoreState>((set, get) => ({
  devOperatorId: loadDevOpId(),
  isMatrixModalOpen: false,

  getActiveRole: (): SystemRole => {
    const companyState = useCompanyStore.getState();
    const { isDevMode } = companyState;

    // In dev mode, the dev operator override applies
    if (isDevMode) {
      const devOp = DEV_PROFILES.find((p) => p.id === get().devOperatorId) || DEV_PROFILES[0];
      return devOp.role;
    }

    // Production: read from session profile
    const session = companyState.sessionProfile;
    return session?.role ?? 'Founder';
  },

  getActiveRoleDef: (): RoleDefinition => {
    const role = get().getActiveRole();
    return ROLE_DEFINITIONS[role] ?? ROLE_DEFINITIONS.Founder;
  },

  getActiveClearance: (): ClearanceLevel => {
    return get().getActiveRoleDef().clearance;
  },

  getCurrentAlias: (): string => {
    const companyState = useCompanyStore.getState();
    if (companyState.isDevMode) {
      const devOp = DEV_PROFILES.find((p) => p.id === get().devOperatorId) || DEV_PROFILES[0];
      return devOp.alias;
    }
    return companyState.sessionProfile?.alias || 'OPERATOR_00';
  },

  canAccessClearance: (level: ClearanceLevel): boolean => {
    const userClearance = get().getActiveClearance();
    return CLEARANCE_RANK[userClearance] >= CLEARANCE_RANK[level];
  },

  hasPermission: (permission: Permission): boolean => {
    const def = get().getActiveRoleDef();
    return def.permissions.includes(permission);
  },

  get currentRole(): SystemRole {
    return get().getActiveRole();
  },

  isFounder: (): boolean => get().getActiveRole() === 'Founder',

  isManager: (): boolean => {
    const role = get().getActiveRole();
    return role === 'Founder' || role === 'Lead Architect';
  },

  isEmployee: (): boolean => {
    const role = get().getActiveRole();
    return role === 'Employee' || role === 'Senior Operator';
  },

  isIntern: (): boolean => get().getActiveRole() === 'Intern',

  isAuditor: (): boolean => get().getActiveRole() === 'Auditor',

  // ── Dev-mode only: switch active test role ──────────────────
  switchDevRole: (role: SystemRole) => {
    const { isDevMode } = useCompanyStore.getState();
    if (!isDevMode) {
      showToast('Rol değiştirme sadece ?devmode=true parametresiyle aktif olur.', 'warning');
      return;
    }
    TactileSoundEngine.playMechanicalTransient();
    const targetProfile = DEV_PROFILES.find((p) => p.role === role) || DEV_PROFILES[0];
    try {
      localStorage.setItem(DEV_STORAGE_KEY, targetProfile.id);
    } catch {}
    set({ devOperatorId: targetProfile.id });
    const roleDef = ROLE_DEFINITIONS[role];
    showToast(
      `[DEVMODE] Aktif Rol: ${roleDef.badgeEmoji} ${roleDef.labelTr} (${roleDef.clearance})`,
      'info'
    );
  },

  switchRole: (role: SystemRole) => {
    get().switchDevRole(role);
  },

  openMatrixModal: () => set({ isMatrixModalOpen: true }),
  closeMatrixModal: () => set({ isMatrixModalOpen: false }),
}));
