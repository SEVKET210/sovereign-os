import React, { useState } from 'react';
import type { Operator, Department } from '../../types/team';
import type { ClearanceLevel } from '../../types';
import {
  Shield,
  Key,
  MoreVertical,
  Check,
  UserX,
  UserCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { useTeamStore } from '../../stores/useTeamStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

interface OperatorCardProps {
  operator: Operator;
}

const CLEARANCE_COLORS: Record<ClearanceLevel, { bg: string; text: string; border: string }> = {
  LEVEL_1: { bg: 'rgba(255, 255, 255, 0.05)', text: '#a0a0a0', border: 'rgba(255, 255, 255, 0.15)' },
  LEVEL_2: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  LEVEL_3: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  LEVEL_4: { bg: 'rgba(78, 242, 210, 0.1)', text: 'var(--clr-accent, #4ef2d2)', border: 'rgba(78, 242, 210, 0.35)' },
};

const DEPARTMENTS: Department[] = ['Engineering', 'Operations', 'Finance', 'Legal', 'Executive'];
const CLEARANCE_LEVELS: ClearanceLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];

export const OperatorCard: React.FC<OperatorCardProps> = ({ operator }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [subView, setSubView] = useState<'main' | 'clearance' | 'department'>('main');

  const {
    updateOperatorClearance,
    transferOperatorDepartment,
    revokeOperator,
  } = useTeamStore();

  const isRevoked = operator.status === 'revoked';
  const isIdle = operator.status === 'idle';
  const clearanceStyle = CLEARANCE_COLORS[operator.clearance];

  const hasManageRoles = usePermissionStore((state) => state.hasPermission('team:manage_roles'));

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasManageRoles) {
      TactileSoundEngine.playSeismicWarning();
      showToast('Yetki Yetersiz: Operatör yetkilerini sadece Yönetici (L4) değiştirebilir.', 'warning');
      return;
    }
    TactileSoundEngine.playClick();
    setIsMenuOpen((prev) => !prev);
    setSubView('main');
  };

  const handleSelectClearance = (lvl: ClearanceLevel) => {
    updateOperatorClearance(operator.id, lvl);
    setIsMenuOpen(false);
  };

  const handleSelectDepartment = (dept: Department) => {
    transferOperatorDepartment(operator.id, dept);
    setIsMenuOpen(false);
  };

  const handleRevoke = () => {
    revokeOperator(operator.id);
    setIsMenuOpen(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        background: isRevoked ? 'rgba(244, 63, 94, 0.03)' : 'var(--bg-secondary, rgba(16, 18, 22, 0.7))',
        border: `1px solid ${isRevoked ? 'rgba(244, 63, 94, 0.25)' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))'}`,
        borderRadius: 'var(--radius-md, 6px)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Card Header: Alias, Role, Clearance Badge, Actions Menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar Identifier */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 4,
              background: clearanceStyle.bg,
              border: `1px solid ${clearanceStyle.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: clearanceStyle.text,
              flexShrink: 0,
            }}
          >
            {operator.alias.slice(0, 2)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: isRevoked ? '#f43f5e' : 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                {operator.alias}
              </span>
              {isRevoked && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: '#f43f5e',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                  }}
                >
                  REVOKED
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {operator.role}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>•</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {operator.department}
              </span>
            </div>
          </div>
        </div>

        {/* Clearance Tier Badge & Menu Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 3,
              background: clearanceStyle.bg,
              color: clearanceStyle.text,
              border: `1px solid ${clearanceStyle.border}`,
              letterSpacing: '0.04em',
            }}
          >
            {operator.clearance}
          </div>

          <button
            onClick={handleToggleMenu}
            className="btn btn-ghost btn-xs"
            style={{
              padding: 4,
              color: hasManageRoles ? 'var(--text-muted)' : 'var(--border-subtle)',
              cursor: hasManageRoles ? 'pointer' : 'not-allowed',
              opacity: hasManageRoles ? 1 : 0.4,
            }}
            title={hasManageRoles ? 'Yönetici Personel İşlemleri' : 'Yetki Yetersiz: Sadece Yönetici'}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Key Fingerprint Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 4,
          border: '1px solid var(--border-hairline, rgba(255, 255, 255, 0.05))',
          fontSize: '0.66rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Key size={11} color="var(--clr-accent)" />
          <span>FINGERPRINT:</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {operator.keyFingerprint.slice(0, 10)}...{operator.keyFingerprint.slice(-4)}
          </span>
        </div>
        <span>{operator.assignedNodesCount} NODES</span>
      </div>

      {/* Real-Time Activity Telemetry Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 4,
          background: isRevoked
            ? 'rgba(244, 63, 94, 0.06)'
            : isIdle
            ? 'rgba(245, 158, 11, 0.05)'
            : 'rgba(78, 242, 210, 0.05)',
          border: `1px solid ${
            isRevoked
              ? 'rgba(244, 63, 94, 0.15)'
              : isIdle
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(78, 242, 210, 0.15)'
          }`,
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Pulsating status indicator LED */}
        <span className="relative flex h-2 w-2 shrink-0">
          {!isRevoked && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isIdle ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isRevoked ? 'bg-rose-500' : isIdle ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>

        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          <span style={{ color: isRevoked ? '#f43f5e' : isIdle ? '#f59e0b' : 'var(--text-secondary)' }}>
            {operator.currentActivity.action}:{' '}
          </span>
          <span style={{ color: isRevoked ? 'rgba(244, 63, 94, 0.8)' : 'var(--text-primary)', fontWeight: 500 }}>
            {operator.currentActivity.targetLabel ? `[${operator.currentActivity.targetLabel}]` : ''}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
            ({operator.currentActivity.module})
          </span>
        </div>
      </div>

      {/* Founder Action Popover Menu */}
      {isMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 48,
            right: 16,
            zIndex: 50,
            background: 'var(--bg-primary, #0c0e12)',
            border: '1px solid var(--border-moderate, rgba(78, 242, 210, 0.25))',
            borderRadius: 6,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.85)',
            padding: 4,
            minWidth: 200,
            animation: 'fadeIn 0.1s ease-out',
          }}
        >
          {subView === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                onClick={() => setSubView('clearance')}
                className="btn btn-ghost btn-xs"
                style={{ justifyContent: 'space-between', padding: '6px 8px', fontSize: '0.7rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={12} color="var(--clr-accent)" />
                  <span>Modify Clearance Tier</span>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>&gt;</span>
              </button>

              <button
                onClick={() => setSubView('department')}
                className="btn btn-ghost btn-xs"
                style={{ justifyContent: 'space-between', padding: '6px 8px', fontSize: '0.7rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowRightLeft size={12} color="var(--clr-accent)" />
                  <span>Transfer Department</span>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>&gt;</span>
              </button>

              <div style={{ height: 1, background: 'var(--border-hairline)', margin: '2px 0' }} />

              <button
                onClick={handleRevoke}
                className="btn btn-ghost btn-xs"
                style={{
                  justifyContent: 'flex-start',
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  color: isRevoked ? 'var(--clr-positive)' : '#f43f5e',
                }}
              >
                {isRevoked ? (
                  <>
                    <UserCheck size={12} style={{ marginRight: 6 }} />
                    <span>Re-Instate Enclave Access</span>
                  </>
                ) : (
                  <>
                    <UserX size={12} style={{ marginRight: 6 }} />
                    <span>Revoke Enclave Access</span>
                  </>
                )}
              </button>
            </div>
          )}

          {subView === 'clearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-hairline)',
                }}
              >
                SELECT CLEARANCE TIER
              </div>
              {CLEARANCE_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleSelectClearance(lvl)}
                  className="btn btn-ghost btn-xs"
                  style={{
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    fontSize: '0.7rem',
                    color: operator.clearance === lvl ? 'var(--clr-accent)' : 'var(--text-primary)',
                  }}
                >
                  <span>{lvl}</span>
                  {operator.clearance === lvl && <Check size={12} color="var(--clr-accent)" />}
                </button>
              ))}
            </div>
          )}

          {subView === 'department' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-hairline)',
                }}
              >
                SELECT DEPARTMENT
              </div>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => handleSelectDepartment(dept)}
                  className="btn btn-ghost btn-xs"
                  style={{
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    fontSize: '0.7rem',
                    color: operator.department === dept ? 'var(--clr-accent)' : 'var(--text-primary)',
                  }}
                >
                  <span>{dept}</span>
                  {operator.department === dept && <Check size={12} color="var(--clr-accent)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
