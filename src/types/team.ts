/* ============================================================
   SOVEREIGN-OS — Team Governance & Operator Types
   Domain interfaces for operators, hierarchy desk, cryptographic
   invitation pipeline, and real-time activity telemetry.
   ============================================================ */

import type { ClearanceLevel } from './index';

export type Department = 'Engineering' | 'Operations' | 'Finance' | 'Legal' | 'Executive';

export type SystemRole =
  | 'Founder'
  | 'Lead Architect'
  | 'Senior Operator'
  | 'Employee'
  | 'Intern'
  | 'Auditor';

export type OperatorStatus = 'active' | 'idle' | 'revoked';

export interface OperatorActivity {
  action: 'Editing Node' | 'Inspecting Vault Manifest' | 'Reviewing Runway Ledger' | 'Idle / Standby';
  targetLabel?: string;
  module: 'Blueprint DAG' | 'Secure Vault' | 'Treasury OS' | 'Standby';
  lastPingTimestamp: number;
}

export interface Operator {
  id: string;
  alias: string;
  department: Department;
  role: SystemRole;
  clearance: ClearanceLevel;
  keyFingerprint: string;
  status: OperatorStatus;
  joinedAt: number;
  currentActivity: OperatorActivity;
  assignedNodesCount: number;
}

export type InviteExpirationOption = '1h' | '24h' | '7d' | 'single-use';

export interface InviteToken {
  id: string;
  token: string; // e.g. SOV-INV-XXXX-YYYY-ZZZZ
  department: Department | 'Open';
  /** Role pre-assigned by the founder at invite creation time */
  preAssignedRole: SystemRole;
  /** Clearance pre-assigned by the founder at invite creation time */
  preAssignedClearance: ClearanceLevel;
  /** Optional: display name/note for who this invite is for */
  recipientNote?: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number;
  expirationOption: InviteExpirationOption;
  createdBy: string;
  createdAt: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'REVOKED' | 'EXPIRED';
  signature: string;
}

export interface PendingJoinApproval {
  id: string;
  inviteToken: string;
  candidateAlias: string;
  deviceFingerprint: string;
  publicKey: string;
  submittedAt: number;
  status: 'PENDING_FOUNDER_APPROVAL' | 'APPROVED' | 'REJECTED';
  assignedDepartment?: Department;
  assignedRole?: SystemRole;
  assignedClearance?: ClearanceLevel;
  decisionTimestamp?: number;
  decisionSignature?: string;
}

export interface TeamGovernanceStats {
  totalHeadcount: number;
  activeOperatorsCount: number;
  pendingApprovalsCount: number;
  departmentBreakdown: Record<Department, number>;
}
