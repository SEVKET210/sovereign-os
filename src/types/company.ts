/* ============================================================
   SOVEREIGN-OS — Company & Session Profile Types
   Defines the multi-tenant company model and the active
   session profile that drives role-based access control.
   ============================================================ */

import type { Department, SystemRole } from './team';
import type { ClearanceLevel } from './index';

export type AppMode =
  | 'LOADING'          // Initial state while reading localStorage
  | 'SETUP'            // First launch — show setup wizard
  | 'SOLO'             // Solo user, implicit Founder
  | 'COMPANY_FOUNDER'  // Founder of a company
  | 'COMPANY_MEMBER';  // Invited member with pre-assigned role

export interface CompanyProfile {
  id: string;           // UUID
  name: string;         // e.g. "Acme Corp"
  logoEmoji: string;    // e.g. "🏢"
  foundedAt: number;    // Unix ms timestamp
  founderId: string;    // operator id of founder (e.g. "op_00")
}

/**
 * The active identity that drives all permission checks.
 * Written to localStorage when:
 *  - Solo mode is chosen (isSolo = true, role = Founder)
 *  - Company is founded (isSolo = false, isFounder = true)
 *  - Invite is accepted (isSolo = false, isFounder = false, role = pre-assigned)
 */
export interface SessionProfile {
  operatorId: string;
  alias: string;
  role: SystemRole;
  clearance: ClearanceLevel;
  department: Department;
  companyId: string | null;  // null in solo mode
  companyName: string | null;
  isFounder: boolean;
  isSolo: boolean;
}
