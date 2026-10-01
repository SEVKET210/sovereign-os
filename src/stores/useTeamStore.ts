import { create } from 'zustand';
import type {
  Operator,
  OperatorStatus,
  Department,
  SystemRole,
  InviteToken,
  PendingJoinApproval,
  InviteExpirationOption,
  TeamGovernanceStats,
} from '../types/team';
import type { ClearanceLevel } from '../types';
import { InviteService } from '../services/team/InviteService';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';

const STORAGE_KEYS = {
  OPERATORS: 'sovereign_team_operators_v2',
  INVITES: 'sovereign_team_invites_v2',
  APPROVALS: 'sovereign_team_approvals_v2',
};

// Clean legacy mock keys if present
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem('sovereign_team_operators_v1');
    localStorage.removeItem('sovereign_team_invites_v1');
    localStorage.removeItem('sovereign_team_approvals_v1');
  } catch {}
}

const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op_00',
    alias: 'OPERATOR_00',
    department: 'Executive',
    role: 'Founder',
    clearance: 'LEVEL_4',
    keyFingerprint: '0x8f4cd19a3b7a7c18d9e2',
    status: 'active',
    joinedAt: Date.now(),
    assignedNodesCount: 0,
    currentActivity: {
      action: 'Reviewing Runway Ledger',
      targetLabel: 'Treasury OS',
      module: 'Treasury OS',
      lastPingTimestamp: Date.now(),
    },
  },
];

const INITIAL_INVITES: InviteToken[] = [];

const INITIAL_APPROVALS: PendingJoinApproval[] = [];

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

interface TeamStoreState {
  operators: Operator[];
  invites: InviteToken[];
  pendingApprovals: PendingJoinApproval[];
  departmentFilter: Department | 'ALL';
  clearanceFilter: ClearanceLevel | 'ALL';
  searchQuery: string;
  isInviteModalOpen: boolean;
  isPendingQueueOpen: boolean;

  // Actions
  setDepartmentFilter: (dept: Department | 'ALL') => void;
  setClearanceFilter: (clearance: ClearanceLevel | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  openPendingQueue: () => void;
  closePendingQueue: () => void;

  createInvite: (
    department: Department | 'Open',
    role: SystemRole,
    clearance: ClearanceLevel,
    maxUses: number,
    expirationOption: InviteExpirationOption,
    recipientNote?: string
  ) => Promise<InviteToken>;
  revokeInvite: (id: string) => void;

  submitJoinRequest: (
    inviteToken: string,
    candidateAlias: string
  ) => Promise<{ success: boolean; error?: string; approval?: PendingJoinApproval }>;

  addOperator: (
    alias: string,
    department: Department,
    role: SystemRole,
    clearance: ClearanceLevel,
    keyFingerprint?: string
  ) => Operator;

  approveCandidate: (
    approvalId: string,
    department: Department,
    role: SystemRole,
    clearance: ClearanceLevel
  ) => void;
  rejectCandidate: (approvalId: string) => void;

  updateOperatorClearance: (operatorId: string, clearance: ClearanceLevel) => void;
  transferOperatorDepartment: (operatorId: string, department: Department) => void;
  revokeOperator: (operatorId: string) => void;

  getGovernanceStats: () => TeamGovernanceStats;
  simulateHeartbeat: () => void;
}

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  operators: loadLocal(STORAGE_KEYS.OPERATORS, INITIAL_OPERATORS),
  invites: loadLocal(STORAGE_KEYS.INVITES, INITIAL_INVITES),
  pendingApprovals: loadLocal(STORAGE_KEYS.APPROVALS, INITIAL_APPROVALS),
  departmentFilter: 'ALL',
  clearanceFilter: 'ALL',
  searchQuery: '',
  isInviteModalOpen: false,
  isPendingQueueOpen: false,

  setDepartmentFilter: (dept) => set({ departmentFilter: dept }),
  setClearanceFilter: (clearance) => set({ clearanceFilter: clearance }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  openInviteModal: () => set({ isInviteModalOpen: true }),
  closeInviteModal: () => set({ isInviteModalOpen: false }),
  openPendingQueue: () => set({ isPendingQueueOpen: true }),
  closePendingQueue: () => set({ isPendingQueueOpen: false }),

  createInvite: async (department, role, clearance, maxUses, expirationOption, recipientNote) => {
    TactileSoundEngine.playMechanicalTransient();
    const newInvite = await InviteService.createInvite(department, maxUses, expirationOption);
    const enrichedInvite = {
      ...newInvite,
      preAssignedRole: role,
      preAssignedClearance: clearance,
      recipientNote: recipientNote?.trim(),
    };
    set((state) => {
      const updated = [enrichedInvite, ...state.invites];
      saveLocal(STORAGE_KEYS.INVITES, updated);
      return { invites: updated };
    });
    showToast(`Davetiye oluşturuldu (${role} — ${clearance}).`, 'success');
    return enrichedInvite;
  },

  revokeInvite: (id) => {
    TactileSoundEngine.playMechanicalTransient();
    set((state) => {
      const updated = state.invites.map((inv) =>
        inv.id === id ? { ...inv, status: 'REVOKED' as const } : inv
      );
      saveLocal(STORAGE_KEYS.INVITES, updated);
      return { invites: updated };
    });
    showToast('Invitation token revoked.', 'info');
  },

  submitJoinRequest: async (inviteToken, candidateAlias) => {
    const invites = get().invites;
    const validation = InviteService.validateToken(inviteToken, invites);

    if (!validation.valid || !validation.invite) {
      TactileSoundEngine.playSeismicWarning();
      return { success: false, error: validation.error };
    }

    const invite = validation.invite;
    const submission = await InviteService.createJoinApprovalSubmission(inviteToken, candidateAlias);

    // If invite had pre-designated department, assign suggestion
    if (invite.department !== 'Open') {
      submission.assignedDepartment = invite.department;
    }

    set((state) => {
      // Increment used count
      const updatedInvites = state.invites.map((inv) => {
        if (inv.id === invite.id) {
          const newUsed = inv.usedCount + 1;
          const status = newUsed >= inv.maxUses ? ('EXHAUSTED' as const) : inv.status;
          return { ...inv, usedCount: newUsed, status };
        }
        return inv;
      });

      const updatedApprovals = [submission, ...state.pendingApprovals];

      saveLocal(STORAGE_KEYS.INVITES, updatedInvites);
      saveLocal(STORAGE_KEYS.APPROVALS, updatedApprovals);

      return {
        invites: updatedInvites,
        pendingApprovals: updatedApprovals,
      };
    });

    TactileSoundEngine.playUnlockShimmer();
    return { success: true, approval: submission };
  },

  addOperator: (alias, department, role, clearance, keyFingerprint) => {
    TactileSoundEngine.playUnlockShimmer();
    const hexFp =
      keyFingerprint?.trim() ||
      `0x${Array.from(crypto.getRandomValues(new Uint8Array(10)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

    const newOperator: Operator = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alias: alias.trim().toUpperCase(),
      department,
      role,
      clearance,
      keyFingerprint: hexFp,
      status: 'active',
      joinedAt: Date.now(),
      assignedNodesCount: 0,
      currentActivity: {
        action: 'Reviewing Runway Ledger',
        module: 'Treasury OS',
        lastPingTimestamp: Date.now(),
      },
    };

    set((state) => {
      const updated = [...state.operators, newOperator];
      saveLocal(STORAGE_KEYS.OPERATORS, updated);
      return { operators: updated };
    });

    showToast(`Operatör ${newOperator.alias} (${clearance}) enklava eklendi.`, 'success');
    return newOperator;
  },

  approveCandidate: (approvalId, department, role, clearance) => {
    TactileSoundEngine.playUnlockShimmer();
    const state = get();
    const candidate = state.pendingApprovals.find((a) => a.id === approvalId);
    if (!candidate) return;

    // Auto-apply the role/clearance from the original invite if available
    const sourceInvite = state.invites.find((inv) => inv.token === candidate.inviteToken);
    const finalRole    = sourceInvite?.preAssignedRole      ?? role;
    const finalClear   = sourceInvite?.preAssignedClearance ?? clearance;
    const finalDept    = (sourceInvite?.department !== 'Open' ? sourceInvite?.department : undefined) ?? department;

    const newOperator: Operator = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alias: candidate.candidateAlias,
      department: finalDept,
      role: finalRole,
      clearance: finalClear,
      keyFingerprint: candidate.publicKey.slice(0, 22),
      status: 'active',
      joinedAt: Date.now(),
      assignedNodesCount: 1,
      currentActivity: {
        action: 'Idle / Standby',
        module: 'Standby',
        lastPingTimestamp: Date.now(),
      },
    };

    set((state) => {
      const updatedApprovals = state.pendingApprovals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'APPROVED' as const,
              assignedDepartment: finalDept,
              assignedRole: finalRole,
              assignedClearance: finalClear,
              decisionTimestamp: Date.now(),
              decisionSignature: `0x_sig_${Math.random().toString(16).slice(2, 10)}`,
            }
          : a
      );

      const updatedOperators = [newOperator, ...state.operators];

      saveLocal(STORAGE_KEYS.APPROVALS, updatedApprovals);
      saveLocal(STORAGE_KEYS.OPERATORS, updatedOperators);

      return {
        pendingApprovals: updatedApprovals,
        operators: updatedOperators,
      };
    });

    showToast(`${candidate.candidateAlias} — ${finalRole} (${finalClear}) olarak onaylandı.`, 'success');
  },

  rejectCandidate: (approvalId) => {
    TactileSoundEngine.playSeismicWarning();
    set((state) => {
      const updatedApprovals = state.pendingApprovals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'REJECTED' as const,
              decisionTimestamp: Date.now(),
              decisionSignature: `0x_rej_${Math.random().toString(16).slice(2, 10)}`,
            }
          : a
      );
      saveLocal(STORAGE_KEYS.APPROVALS, updatedApprovals);
      return { pendingApprovals: updatedApprovals };
    });
    showToast('Candidate join request rejected and purged.', 'info');
  },

  updateOperatorClearance: (operatorId, clearance) => {
    TactileSoundEngine.playMechanicalTransient();
    set((state) => {
      const updated = state.operators.map((op) =>
        op.id === operatorId ? { ...op, clearance } : op
      );
      saveLocal(STORAGE_KEYS.OPERATORS, updated);
      return { operators: updated };
    });
    showToast(`Clearance updated to ${clearance}.`, 'info');
  },

  transferOperatorDepartment: (operatorId, department) => {
    TactileSoundEngine.playMechanicalTransient();
    set((state) => {
      const updated = state.operators.map((op) =>
        op.id === operatorId ? { ...op, department } : op
      );
      saveLocal(STORAGE_KEYS.OPERATORS, updated);
      return { operators: updated };
    });
    showToast(`Operator transferred to ${department}.`, 'info');
  },

  revokeOperator: (operatorId) => {
    TactileSoundEngine.playSeismicWarning();
    set((state) => {
      const updated = state.operators.map((op) =>
        op.id === operatorId
          ? { ...op, status: (op.status === 'revoked' ? 'active' : 'revoked') as any }
          : op
      );
      saveLocal(STORAGE_KEYS.OPERATORS, updated);
      return { operators: updated };
    });
    showToast('Operator access status updated.', 'warning');
  },

  getGovernanceStats: () => {
    const { operators, pendingApprovals } = get();
    const activeOperators = operators.filter((o) => o.status === 'active');
    const pendingCount = pendingApprovals.filter((a) => a.status === 'PENDING_FOUNDER_APPROVAL').length;

    const departmentBreakdown: Record<Department, number> = {
      Engineering: 0,
      Operations: 0,
      Finance: 0,
      Legal: 0,
      Executive: 0,
    };

    operators.forEach((o) => {
      if (departmentBreakdown[o.department] !== undefined) {
        departmentBreakdown[o.department]++;
      }
    });

    return {
      totalHeadcount: operators.length,
      activeOperatorsCount: activeOperators.length,
      pendingApprovalsCount: pendingCount,
      departmentBreakdown,
    };
  },

  simulateHeartbeat: () => {
    const activities: Array<Operator['currentActivity']> = [
      { action: 'Editing Node', targetLabel: 'Database Architecture', module: 'Blueprint DAG', lastPingTimestamp: Date.now() },
      { action: 'Inspecting Vault Manifest', targetLabel: 'Contract_Q3.pdf', module: 'Secure Vault', lastPingTimestamp: Date.now() },
      { action: 'Reviewing Runway Ledger', targetLabel: 'Treasury OS', module: 'Treasury OS', lastPingTimestamp: Date.now() },
      { action: 'Idle / Standby', module: 'Standby', lastPingTimestamp: Date.now() - 1000 * 180 },
    ];

    set((state) => {
      if (state.operators.length === 0) return {};
      // Pick random non-founder operator to shift
      const nonFounders = state.operators.filter((o) => o.role !== 'Founder' && o.status !== 'revoked');
      if (nonFounders.length === 0) return {};
      const target = nonFounders[Math.floor(Math.random() * nonFounders.length)];
      const newActivity = activities[Math.floor(Math.random() * activities.length)];

      const updated = state.operators.map((o) =>
        o.id === target.id
          ? {
              ...o,
              currentActivity: newActivity,
              status: (newActivity.module === 'Standby' ? 'idle' : 'active') as OperatorStatus,
            }
          : o
      );

      return { operators: updated };
    });
  },
}));
