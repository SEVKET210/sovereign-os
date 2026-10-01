/* ============================================================
   SOVEREIGN-OS — Role / Identity Display Badge (Navbar)

   Behavior by mode:
   - SOLO:            Shows "👤 ALIAS — Solo Kurucu" (no switching)
   - COMPANY_FOUNDER: Shows "👑 ALIAS — Kurucu / CompanyName" (no switching)
   - COMPANY_MEMBER:  Shows "💼 ALIAS — Role / CompanyName" (no switching)
   - DEV MODE:        Full role switcher dropdown for testing

   The Permission Matrix modal is always accessible.
   ============================================================ */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, Beaker, Check, Building2, User } from 'lucide-react';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { usePermissionStore, DEV_PROFILES } from '../../stores/usePermissionStore';
import { ROLE_DEFINITIONS } from '../../types/permissions';
import type { SystemRole } from '../../types/team';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export const RoleSwitcher: React.FC = () => {
  const { appMode, sessionProfile, company, isDevMode } = useCompanyStore();
  const { getActiveRoleDef, devOperatorId, switchDevRole, openMatrixModal } = usePermissionStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleDef = getActiveRoleDef();

  // ── Render helpers ──────────────────────────────────────────

  // The display name shown in the badge
  const displayAlias = sessionProfile?.alias || 'OPERATOR_00';
  const companyLabel = company?.name || sessionProfile?.companyName;

  // Badge color by clearance
  const badgeColor =
    roleDef.clearance === 'LEVEL_4' ? 'var(--clr-accent)' :
    roleDef.clearance === 'LEVEL_3' ? '#f59e0b' :
    roleDef.clearance === 'LEVEL_2' ? '#38bdf8' :
    '#9ca3af';

  const badgeBg =
    roleDef.clearance === 'LEVEL_4' ? 'rgba(78, 242, 210, 0.08)' :
    roleDef.clearance === 'LEVEL_3' ? 'rgba(245, 158, 11, 0.08)' :
    roleDef.clearance === 'LEVEL_2' ? 'rgba(56, 189, 248, 0.08)' :
    'rgba(156, 163, 175, 0.08)';

  // ── DEV MODE switcher ───────────────────────────────────────
  if (isDevMode) {
    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => { TactileSoundEngine.playClick(); setIsOpen((v) => !v); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            cursor: 'pointer',
            color: '#eab308',
          }}
          title="Dev Mode: Role Switcher Active"
        >
          <Beaker size={13} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {roleDef.badgeEmoji} {roleDef.labelTr.toUpperCase()}
          </span>
          <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 230,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 8,
            boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: 500,
            animation: 'enter-up 0.15s ease-out both',
          }}>
            <div style={{ padding: '8px 12px', fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: '#eab308', borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Beaker size={11} />
              DEV MODE — ROL DEĞİŞTİRİCİ
            </div>
            {DEV_PROFILES.map((profile) => {
              const def = ROLE_DEFINITIONS[profile.role as SystemRole];
              const isActive = devOperatorId === profile.id;
              return (
                <div
                  key={profile.id}
                  onClick={() => { switchDevRole(profile.role as SystemRole); setIsOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(234, 179, 8, 0.06)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-primary)'; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem' }}>{def.badgeEmoji}</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? '#eab308' : 'var(--text-primary)' }}>{def.labelTr}</div>
                      <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{profile.alias}</div>
                    </div>
                  </div>
                  {isActive && <Check size={14} color="#eab308" />}
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border-hairline)', padding: '8px 14px' }}>
              <button className="btn btn-ghost btn-xs" onClick={() => { openMatrixModal(); setIsOpen(false); }} style={{ width: '100%', fontSize: '0.7rem' }}>
                <Shield size={12} style={{ marginRight: 4 }} />
                Yetki Matrisi Görüntüle
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PRODUCTION badge (info only, no switching) ──────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { TactileSoundEngine.playClick(); setIsOpen((v) => !v); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          background: badgeBg,
          border: `1px solid ${badgeColor}40`,
          cursor: 'pointer',
          color: badgeColor,
        }}
        title={`Aktif Kimlik: ${displayAlias} — ${roleDef.labelTr}`}
      >
        <span style={{ fontSize: '0.9rem' }}>{roleDef.badgeEmoji}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: badgeColor }}>
          {displayAlias}
        </span>
        <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: badgeColor }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 260,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 8,
          boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          zIndex: 500,
          animation: 'enter-up 0.15s ease-out both',
        }}>
          {/* Identity header */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: badgeBg, border: `1px solid ${badgeColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {roleDef.badgeEmoji}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{displayAlias}</div>
                <div style={{ fontSize: '0.7rem', color: badgeColor, fontFamily: 'var(--font-mono)' }}>
                  {roleDef.labelTr} · {roleDef.clearance.replace('_', '-')}
                </div>
              </div>
            </div>
          </div>

          {/* Company info */}
          {companyLabel && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={13} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ŞİRKET</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{company?.logoEmoji} {companyLabel}</div>
              </div>
            </div>
          )}

          {/* Mode info */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={13} color="var(--text-muted)" />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MOD</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {appMode === 'SOLO'             && '👤 Solo Kullanım'}
                {appMode === 'COMPANY_FOUNDER'  && '👑 Şirket Kurucusu'}
                {appMode === 'COMPANY_MEMBER'   && '💼 Şirket Üyesi (Rol atanmış)'}
              </div>
            </div>
          </div>

          {/* Role description */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>ROLÜNÜZ</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {roleDef.descriptionTr || roleDef.labelTr}
            </div>
          </div>

          {/* Matrix button */}
          <div style={{ padding: '10px 14px' }}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => { openMatrixModal(); setIsOpen(false); }}
              style={{ width: '100%', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Shield size={12} />
              Yetki Matrisi Görüntüle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
