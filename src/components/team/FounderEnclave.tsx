import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Activity,
  KeyRound,
  Trash2,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { useTeamStore } from '../../stores/useTeamStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { OperatorCard } from './OperatorCard';
import { PendingApprovalsQueue } from './PendingApprovalsQueue';
import { InviteGeneratorModal } from './InviteGeneratorModal';
import { AddOperatorModal } from './AddOperatorModal';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { Department } from '../../types/team';
import type { ClearanceLevel } from '../../types';

const DEPARTMENTS: Array<Department | 'ALL'> = [
  'ALL',
  'Engineering',
  'Operations',
  'Finance',
  'Legal',
  'Executive',
];

const CLEARANCE_LEVELS: Array<ClearanceLevel | 'ALL'> = [
  'ALL',
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3',
  'LEVEL_4',
];

export const FounderEnclave: React.FC = () => {
  const {
    operators,
    invites,
    departmentFilter,
    clearanceFilter,
    searchQuery,
    setDepartmentFilter,
    setClearanceFilter,
    setSearchQuery,
    openInviteModal,
    openPendingQueue,
    revokeInvite,
    getGovernanceStats,
    simulateHeartbeat,
  } = useTeamStore();

  const [isAddOperatorModalOpen, setIsAddOperatorModalOpen] = useState(false);
  const { hasPermission } = usePermissionStore();
  const hasManageRoles = hasPermission('team:manage_roles');
  const hasInvite = hasPermission('team:invite');
  const hasApprove = hasPermission('team:approve');

  const openCockpit = useIncidentStore((state) => state.openCockpit);
  const activeThreatsCount = useIncidentStore((state) =>
    state.incidents.filter((i) => i.status === 'ACTIVE' && !i.isDuress).length
  );

  // Run live activity heartbeat simulation every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      simulateHeartbeat();
    }, 8000);
    return () => clearInterval(timer);
  }, [simulateHeartbeat]);

  const stats = getGovernanceStats();

  // Filter operators
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const matchDept = departmentFilter === 'ALL' || op.department === departmentFilter;
      const matchClearance = clearanceFilter === 'ALL' || op.clearance === clearanceFilter;
      const matchSearch =
        !searchQuery.trim() ||
        op.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.keyFingerprint.toLowerCase().includes(searchQuery.toLowerCase());

      return matchDept && matchClearance && matchSearch;
    });
  }, [operators, departmentFilter, clearanceFilter, searchQuery]);

  const activeInvites = invites.filter((inv) => inv.status === 'ACTIVE');

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* ── Top Governance & KPI Ribbon ───────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {/* Metric 1: Total Headcount */}
        <div
          style={{
            background: 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
            border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              TOTAL ENCLAVE HEADCOUNT
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>
              {stats.totalHeadcount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} color="var(--text-secondary)" />
          </div>
        </div>

        {/* Metric 2: Active Real-Time Operators */}
        <div
          style={{
            background: 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
            border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              ACTIVE REAL-TIME OPERATORS
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--clr-accent, #4ef2d2)', marginTop: 2 }}>
              {stats.activeOperatorsCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              background: 'rgba(78, 242, 210, 0.1)',
              border: '1px solid rgba(78, 242, 210, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color="var(--clr-accent, #4ef2d2)" />
          </div>
        </div>

        {/* Metric 3: Pending Approvals (Interactive Button) */}
        <div
          onClick={() => {
            if (!hasApprove) {
              TactileSoundEngine.playSeismicWarning();
              showToast('Yetki Yetersiz: Katılım başvurularını sadece Yönetici (L4) onaylayabilir.', 'warning');
              return;
            }
            TactileSoundEngine.playMechanicalTransient();
            openPendingQueue();
          }}
          style={{
            background: stats.pendingApprovalsCount > 0 ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
            border: `1px solid ${stats.pendingApprovalsCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-moderate, rgba(255, 255, 255, 0.1))'}`,
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: hasApprove ? 'pointer' : 'not-allowed',
            opacity: hasApprove ? 1 : 0.6,
            transition: 'all 0.15s ease',
          }}
          title={hasApprove ? 'Click to open Pending Approvals Drawer' : 'Yetki Yetersiz: Sadece Yönetici aday onaylayabilir'}
        >
          <div>
            <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: stats.pendingApprovalsCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
              PENDING FOUNDER APPROVALS
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: stats.pendingApprovalsCount > 0 ? '#f59e0b' : 'var(--text-primary)', marginTop: 2 }}>
              {stats.pendingApprovalsCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              background: stats.pendingApprovalsCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCheck size={18} color={stats.pendingApprovalsCount > 0 ? '#f59e0b' : 'var(--text-secondary)'} />
          </div>
        </div>

        {/* Metric 4: Department Distribution */}
        <div
          style={{
            background: 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
            border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
            borderRadius: 6,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <div style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            DEPARTMENT BREAKDOWN
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(stats.departmentBreakdown).map(([dept, count]) => (
              <span
                key={dept}
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-hairline)',
                  color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {dept.slice(0, 3).toUpperCase()}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Metric 5: Emergency Threat & Escalation Cockpit */}
        <div
          onClick={() => {
            TactileSoundEngine.playMechanicalTransient();
            openCockpit('incidents');
          }}
          style={{
            background: activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
            border: `1px solid ${activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.45)' : 'var(--border-moderate, rgba(255, 255, 255, 0.1))'}`,
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Click to open Emergency Governance & Escalation Cockpit"
        >
          <div>
            <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: activeThreatsCount > 0 ? '#f43f5e' : 'var(--text-muted)' }}>
              EMERGENCY SENTINEL THREATS
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: activeThreatsCount > 0 ? '#f43f5e' : 'var(--clr-positive)', marginTop: 2 }}>
              {activeThreatsCount > 0 ? `${activeThreatsCount} ACTIVE` : 'ARMED / NOMINAL'}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              background: activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={18} color={activeThreatsCount > 0 ? '#f43f5e' : 'var(--clr-positive)'} />
          </div>
        </div>
      </div>

      {/* ── Control Bar: Filters, Search, and Action Triggers ─ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
          border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
          borderRadius: 6,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 4,
            minWidth: 240,
            flex: 1,
            maxWidth: 360,
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search alias, role, department, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-sans)',
              width: '100%',
            }}
          />
        </div>

        {/* Department Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginRight: 4 }}>
            DEPT:
          </span>
          {DEPARTMENTS.map((dept) => {
            const isSelected = departmentFilter === dept;
            return (
              <button
                key={dept}
                onClick={() => {
                  TactileSoundEngine.playMechanicalTransient();
                  setDepartmentFilter(dept);
                }}
                className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.64rem', padding: '3px 8px', fontFamily: 'var(--font-mono)' }}
              >
                {dept.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Clearance Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginRight: 4 }}>
            CLEARANCE:
          </span>
          {CLEARANCE_LEVELS.map((lvl) => {
            const isSelected = clearanceFilter === lvl;
            return (
              <button
                key={lvl}
                onClick={() => {
                  TactileSoundEngine.playMechanicalTransient();
                  setClearanceFilter(lvl);
                }}
                className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.64rem', padding: '3px 7px', fontFamily: 'var(--font-mono)' }}
              >
                {lvl === 'ALL' ? 'ALL' : lvl.replace('LEVEL_', 'L')}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (!hasManageRoles) {
                showToast('Yetki Yetersiz: Operatör eklemek için Yönetici (L4) yetkisi gereklidir.', 'warning');
                return;
              }
              TactileSoundEngine.playMechanicalTransient();
              setIsAddOperatorModalOpen(true);
            }}
            disabled={!hasManageRoles}
            className="btn btn-primary btn-xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '0.72rem',
              opacity: hasManageRoles ? 1 : 0.5,
              cursor: hasManageRoles ? 'pointer' : 'not-allowed',
            }}
            title={hasManageRoles ? 'Yeni Operatör Ekle' : 'Yetki Yetersiz: Sadece Yönetici operatör ekleyebilir'}
          >
            {hasManageRoles ? <UserPlus size={13} /> : <Lock size={13} />}
            <span>+ Operatör / Ekip Ekle</span>
          </button>

          <button
            onClick={() => {
              if (!hasInvite) {
                showToast('Yetki Yetersiz: Davetiye üretmek için Yönetici yetkisi gereklidir.', 'warning');
                return;
              }
              TactileSoundEngine.playMechanicalTransient();
              openInviteModal();
            }}
            disabled={!hasInvite}
            className="btn btn-secondary btn-xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '0.72rem',
              opacity: hasInvite ? 1 : 0.5,
              cursor: hasInvite ? 'pointer' : 'not-allowed',
            }}
            title={hasInvite ? 'Davet Kodu Üret' : 'Yetki Yetersiz: Sadece Yönetici davet kodu üretebilir'}
          >
            {hasInvite ? <KeyRound size={13} /> : <Lock size={13} />}
            <span>Davet Kodu Üret</span>
          </button>

          <button
            onClick={() => {
              if (!hasApprove) {
                showToast('Yetki Yetersiz: Başvuruları sadece Yönetici inceleyip onaylayabilir.', 'warning');
                return;
              }
              TactileSoundEngine.playMechanicalTransient();
              openPendingQueue();
            }}
            disabled={!hasApprove}
            className="btn btn-secondary btn-xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '0.72rem',
              position: 'relative',
              opacity: hasApprove ? 1 : 0.5,
              cursor: hasApprove ? 'pointer' : 'not-allowed',
            }}
            title={hasApprove ? 'Aday Başvuru Kuyruğu' : 'Yetki Yetersiz: Sadece Yönetici aday onaylayabilir'}
          >
            {hasApprove ? (
              <UserCheck size={13} color={stats.pendingApprovalsCount > 0 ? '#f59e0b' : undefined} />
            ) : (
              <Lock size={13} />
            )}
            <span>Review Queue</span>
            {stats.pendingApprovalsCount > 0 && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: '#f59e0b',
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                {stats.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              TactileSoundEngine.playMechanicalTransient();
              openCockpit('incidents');
            }}
            className="btn btn-xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '0.72rem',
              background: activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)',
              border: `1px solid ${activeThreatsCount > 0 ? 'rgba(244, 63, 94, 0.5)' : 'var(--border-moderate)'}`,
              color: activeThreatsCount > 0 ? '#f43f5e' : 'var(--text-secondary)',
            }}
            title="Open Emergency Governance & Escalation Cockpit"
          >
            <ShieldAlert size={13} color={activeThreatsCount > 0 ? '#f43f5e' : 'var(--text-secondary)'} />
            <span>Emergency Cockpit</span>
          </button>
        </div>
      </div>

      {/* ── Operators Grid ────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingInline: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              PERSONNEL ROSTER
            </span>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              ({filteredOperators.length} MATCHING)
            </span>
          </div>

          <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            HEARTBEAT TELEMETRY: 8s CYCLES
          </span>
        </div>

        {filteredOperators.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            NO OPERATORS MATCH ACTIVE FILTER CRITERIA
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {filteredOperators.map((op) => (
              <OperatorCard key={op.id} operator={op} />
            ))}
          </div>
        )}
      </div>

      {/* ── Active Invitations Strip ──────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
          border: '1px solid var(--border-moderate, rgba(255, 255, 255, 0.1))',
          borderRadius: 6,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={15} color="var(--clr-accent, #4ef2d2)" />
            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
              ACTIVE CORPORATE INVITATIONS ({activeInvites.length})
            </span>
          </div>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            HMAC-SHA256 SIGNED
          </span>
        </div>

        {activeInvites.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            No active corporate invitations issued. Click "Generate Invite" above to onboard candidates.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeInvites.map((inv) => {
              const remainingMs = Math.max(0, inv.expiresAt - Date.now());
              const hoursLeft = Math.round(remainingMs / (1000 * 60 * 60));

              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 4,
                    border: '1px solid var(--border-hairline)',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                      {inv.token}
                    </span>
                    <span style={{ color: 'var(--clr-accent)' }}>
                      DEPT: {inv.department}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      USES: {inv.usedCount}/{inv.maxUses}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      EXPIRES: ~{hoursLeft}h
                    </span>
                  </div>

                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="btn btn-ghost btn-xs"
                    style={{ padding: '3px 8px', color: '#f43f5e', fontSize: '0.64rem' }}
                    title="Revoke Token"
                  >
                    <Trash2 size={12} style={{ marginRight: 4 }} />
                    <span>Revoke</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide Drawer & Modals */}
      <PendingApprovalsQueue />
      <InviteGeneratorModal />
      <AddOperatorModal
        isOpen={isAddOperatorModalOpen}
        onClose={() => setIsAddOperatorModalOpen(false)}
      />
    </div>
  );
};
