/* ============================================================
   SOVEREIGN-OS — RBAC Spatial Visibility & Guard Utilities
   ============================================================ */

import type { BlueprintNode, SystemRole, ClearanceLevel, TaskNodeData } from '../types';

export const CLEARANCE_HIERARCHY: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

/**
 * Checks if a Blueprint DAG node / Kanban card is visible to the active user.
 */
export function isNodeVisibleToUser(
  node: BlueprintNode,
  userRole: SystemRole,
  userClearance: ClearanceLevel,
  userAlias: string
): boolean {
  // Founder has universal architectural visibility across the enterprise
  if (userRole === 'Founder') {
    return true;
  }

  // Enforce spatial clearance hierarchy (operators cannot see nodes higher than clearance)
  const nodeRank = CLEARANCE_HIERARCHY[node.clearance] || 1;
  const userRank = CLEARANCE_HIERARCHY[userClearance] || 1;
  if (nodeRank > userRank) {
    return false;
  }

  // Auditor has read-only visibility up to their clearance level
  if (userRole === 'Auditor') {
    return true;
  }

  const isManager = userRole === 'Lead Architect' || userRole === 'Senior Operator';

  // Scope: MANAGERS_ONLY
  if (node.visibilityScope === 'MANAGERS_ONLY') {
    if (!isManager) {
      return false;
    }
  }

  // Scope: ASSIGNED_ONLY
  if (node.visibilityScope === 'ASSIGNED_ONLY') {
    if (isManager) {
      return true;
    }
    if (node.type === 'task') {
      const task = node as TaskNodeData;
      return task.assignee === userAlias || (node.allowedRoles?.includes(userRole) ?? false);
    }
    return node.allowedRoles?.includes(userRole) ?? false;
  }

  // Explicit allowed roles check
  if (node.allowedRoles && node.allowedRoles.length > 0) {
    if (!node.allowedRoles.includes(userRole)) {
      if (node.type === 'task' && (node as TaskNodeData).assignee === userAlias) {
        return true;
      }
      return false;
    }
  }

  // Intern specific culling: only LEVEL_1 nodes, assigned or open
  if (userRole === 'Intern') {
    if (node.clearance !== 'LEVEL_1') return false;
    if (node.visibilityScope === 'MANAGERS_ONLY') return false;
    if (node.type === 'task') {
      const task = node as TaskNodeData;
      return !task.assignee || task.assignee === userAlias || task.assignee.toLowerCase().includes('intern') || task.assignee === 'ALL';
    }
    return true;
  }

  return true;
}
