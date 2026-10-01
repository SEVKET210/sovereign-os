import React, { useEffect } from 'react';
import {
  X,
  Shield,
  Eye,
  Edit3,
  Key,
  Check,
  Sparkles,
} from 'lucide-react';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { ROLE_DEFINITIONS } from '../../types/permissions';
import type { SystemRole } from '../../types/team';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export const PermissionMatrixModal: React.FC = () => {
  const {
    isMatrixModalOpen,
    closeMatrixModal,
    getActiveRole,
    switchRole,
  } = usePermissionStore();

  const currentRole = getActiveRole();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMatrixModalOpen) {
        closeMatrixModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMatrixModalOpen, closeMatrixModal]);

  if (!isMatrixModalOpen) return null;

  const rolesToDisplay: SystemRole[] = ['Founder', 'Employee', 'Intern', 'Auditor'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeMatrixModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          background: 'var(--bg-secondary, #0b0f19)',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))',
          borderRadius: 'var(--radius-lg, 10px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'enter-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-hairline, rgba(255, 255, 255, 0.08))',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'rgba(var(--clr-accent-raw, 250 204 21) / 0.15)',
                border: '1px solid var(--clr-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={16} color="var(--clr-accent)" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                SOVEREIGN-OS Rol ve Yetki Matrisi (RBAC)
              </h2>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                Yönetici, Çalışan ve Stajyer profillerinin görme, değiştirme ve yönetim yetkileri
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              closeMatrixModal();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Active Profile Info Banner */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'rgba(var(--clr-accent-raw, 250 204 21) / 0.08)',
              border: '1px solid rgba(var(--clr-accent-raw, 250 204 21) / 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="var(--clr-accent)" />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                Şu anki aktif rolünüz:{' '}
                <strong style={{ color: 'var(--clr-accent)' }}>
                  {ROLE_DEFINITIONS[currentRole].badgeEmoji}{' '}
                  {ROLE_DEFINITIONS[currentRole].labelTr} (
                  {ROLE_DEFINITIONS[currentRole].clearance})
                </strong>
                . Tablodaki herhangi bir rolün altındaki butona basarak o role anında geçiş yapabilirsiniz.
              </span>
            </div>
          </div>

          {/* Role Comparison Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {rolesToDisplay.map((role) => {
              const def = ROLE_DEFINITIONS[role];
              const isActive = role === currentRole;

              return (
                <div
                  key={role}
                  style={{
                    background: isActive
                      ? 'rgba(var(--clr-accent-raw, 250 204 21) / 0.05)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${
                      isActive
                        ? 'var(--clr-accent)'
                        : 'var(--border-subtle, rgba(255, 255, 255, 0.08))'
                    }`,
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    position: 'relative',
                    boxShadow: isActive
                      ? '0 0 20px rgba(var(--clr-accent-raw, 250 204 21) / 0.1)'
                      : 'none',
                  }}
                >
                  {/* Top Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.2rem' }}>{def.badgeEmoji}</span>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          {def.labelTr}
                        </div>
                        <div
                          style={{
                            fontSize: '0.60rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {def.clearance}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <span
                        style={{
                          fontSize: '0.55rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: 'var(--clr-accent)',
                          color: '#060B18',
                        }}
                      >
                        AKTİF
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: '0.66rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      margin: 0,
                      minHeight: 38,
                    }}
                  >
                    {def.shortDescTr}
                  </p>

                  {/* Section 1: GÖREBİLDİKLERİ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--clr-positive, #34d399)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <Eye size={11} />
                      <span>GÖREBİLDİKLERİ</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {def.canSeeTr.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: '0.62rem',
                            color: item.startsWith('⚠️') ? 'var(--clr-caution, #f59e0b)' : 'var(--text-secondary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 2: DEĞİŞTİREBİLDİKLERİ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--clr-accent, #4ef2d2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <Edit3 size={11} />
                      <span>DEĞİŞTİREBİLDİKLERİ</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {def.canEditTr.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: '0.62rem',
                            color: item.startsWith('❌') ? 'var(--clr-negative, #f87171)' : 'var(--text-secondary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 3: YETKİLERİ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <Key size={11} />
                      <span>YÖNETİM YETKİLERİ</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {def.canExecuteTr.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: '0.62rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action: Switch to this role button */}
                  <button
                    onClick={() => {
                      switchRole(role);
                    }}
                    disabled={isActive}
                    style={{
                      marginTop: 'auto',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      border: `1px solid ${
                        isActive ? 'var(--border-subtle)' : 'var(--clr-accent)'
                      }`,
                      background: isActive
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'var(--clr-accent)',
                      color: isActive ? 'var(--text-muted)' : '#060B18',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: isActive ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isActive ? (
                      <>
                        <Check size={12} strokeWidth={3} />
                        <span>Şu Anki Rolünüz</span>
                      </>
                    ) : (
                      <>
                        <span>Bu Role Geç ({def.labelTr})</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
