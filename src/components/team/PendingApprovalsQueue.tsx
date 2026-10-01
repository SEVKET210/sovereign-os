import React, { useState } from 'react';
import {
  X,
  UserCheck,
  UserX,
  Shield,
  Laptop,
  Key,
  CheckCircle,
} from 'lucide-react';
import { useTeamStore } from '../../stores/useTeamStore';
import type { Department, SystemRole, PendingJoinApproval } from '../../types/team';
import type { ClearanceLevel } from '../../types';

const DEPARTMENTS: Department[] = ['Engineering', 'Operations', 'Finance', 'Legal', 'Executive'];
const ROLES: SystemRole[] = ['Lead Architect', 'Senior Operator', 'Auditor'];
const CLEARANCE_LEVELS: ClearanceLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];

export const PendingApprovalsQueue: React.FC = () => {
  const {
    pendingApprovals,
    isPendingQueueOpen,
    closePendingQueue,
    approveCandidate,
    rejectCandidate,
  } = useTeamStore();

  const [assignments, setAssignments] = useState<
    Record<
      string,
      {
        department: Department;
        role: SystemRole;
        clearance: ClearanceLevel;
      }
    >
  >({});

  if (!isPendingQueueOpen) return null;

  const pendingList = pendingApprovals.filter((a) => a.status === 'PENDING_FOUNDER_APPROVAL');

  const getAssignment = (item: PendingJoinApproval) => {
    return (
      assignments[item.id] || {
        department: item.assignedDepartment || 'Engineering',
        role: 'Senior Operator',
        clearance: 'LEVEL_2',
      }
    );
  };

  const handleUpdateAssignment = (
    id: string,
    field: 'department' | 'role' | 'clearance',
    value: any
  ) => {
    setAssignments((prev) => {
      const current = prev[id] || {
        department: 'Engineering',
        role: 'Senior Operator',
        clearance: 'LEVEL_2',
      };
      return {
        ...prev,
        [id]: { ...current, [field]: value },
      };
    });
  };

  const handleApprove = (item: PendingJoinApproval) => {
    const cfg = getAssignment(item);
    approveCandidate(item.id, cfg.department, cfg.role, cfg.clearance);
  };

  const handleReject = (id: string) => {
    rejectCandidate(id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Scrim */}
      <div
        onClick={closePendingQueue}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Slide Drawer Surface */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          height: '100%',
          background: 'var(--bg-secondary, #0c0e12)',
          borderLeft: '1px solid var(--border-moderate, rgba(78, 242, 210, 0.25))',
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.8))',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'enter-up 0.2s ease-out both',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-hairline, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-primary, #08090c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={16} color="#f59e0b" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#f59e0b',
                  letterSpacing: '0.04em',
                }}
              >
                FOUNDER ENCLAVE GATEWAY
              </div>
              <h2
                style={{
                  fontSize: '0.92rem',
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                Pending Join Approvals ({pendingList.length})
              </h2>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-xs"
            onClick={closePendingQueue}
            style={{ padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body / Queue */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {pendingList.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-muted)',
              }}
            >
              <CheckCircle size={32} color="var(--clr-accent, #4ef2d2)" />
              <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                NO PENDING JOIN APPROVALS
              </div>
              <div style={{ fontSize: '0.72rem', maxWidth: 280, lineHeight: 1.4 }}>
                All cryptographic candidate requests have been reviewed and attested.
              </div>
            </div>
          ) : (
            pendingList.map((item) => {
              const currentCfg = getAssignment(item);

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-primary, #08090c)',
                    border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
                    borderRadius: 6,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Candidate Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.candidateAlias}
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--clr-accent)',
                          marginTop: 2,
                        }}
                      >
                        TOKEN: {item.inviteToken}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      AWAITING ATTESTATION
                    </span>
                  </div>

                  {/* Device Fingerprint & Key */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '8px 10px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      borderRadius: 4,
                      fontSize: '0.66rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Laptop size={11} color="var(--clr-accent)" />
                      <span>DEVICE:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.deviceFingerprint}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Key size={11} color="var(--clr-accent)" />
                      <span>PUBKEY:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.publicKey.slice(0, 18)}...{item.publicKey.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Founder Clearance Configuration Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div
                      style={{
                        fontSize: '0.64rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      GRANULAR ENCLAVE ASSIGNMENT:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {/* Department Select */}
                      <div>
                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                          DEPARTMENT
                        </label>
                        <select
                          value={currentCfg.department}
                          onChange={(e) =>
                            handleUpdateAssignment(item.id, 'department', e.target.value as Department)
                          }
                          style={{
                            width: '100%',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '4px 6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-primary)',
                            borderRadius: 4,
                          }}
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Role Select */}
                      <div>
                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                          SYSTEM ROLE
                        </label>
                        <select
                          value={currentCfg.role}
                          onChange={(e) =>
                            handleUpdateAssignment(item.id, 'role', e.target.value as SystemRole)
                          }
                          style={{
                            width: '100%',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '4px 6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-primary)',
                            borderRadius: 4,
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Clearance Select */}
                      <div>
                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                          CLEARANCE TIER
                        </label>
                        <select
                          value={currentCfg.clearance}
                          onChange={(e) =>
                            handleUpdateAssignment(item.id, 'clearance', e.target.value as ClearanceLevel)
                          }
                          style={{
                            width: '100%',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '4px 6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-primary)',
                            borderRadius: 4,
                          }}
                        >
                          {CLEARANCE_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Decision Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => handleApprove(item)}
                      className="btn btn-primary btn-xs"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      <UserCheck size={13} />
                      <span>Grant Enclave Access</span>
                    </button>

                    <button
                      onClick={() => handleReject(item.id)}
                      className="btn btn-ghost btn-xs"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                      }}
                    >
                      <UserX size={13} style={{ marginRight: 4 }} />
                      <span>Reject & Purge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
