import React from 'react';
import { ArrowRight } from 'lucide-react';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { ROLE_DEFINITIONS } from '../../types/permissions';

export const RoleAlertBanner: React.FC = () => {
  const { getActiveRole, switchDevRole, openMatrixModal } = usePermissionStore();
  const { isDevMode, appMode } = useCompanyStore();

  const role = getActiveRole();

  // Founder doesn't need an alert banner
  if (role === 'Founder') return null;
  // In company member mode the role is fixed — banner shows info about restrictions
  // but without the "switch to Founder" button (not allowed)
  // In dev mode the banner shows with the switch button

  const roleDef = ROLE_DEFINITIONS[role];

  return (
    <div
      style={{
        width: '100%',
        padding: '5px 16px',
        background:
          role === 'Intern'
            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)'
            : 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)',
        borderBottom: `1px solid ${
          role === 'Intern' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.64rem',
        fontFamily: 'var(--font-mono)',
        zIndex: 90,
        gap: 12,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.9rem' }}>{roleDef.badgeEmoji}</span>
        <span
          style={{
            fontWeight: 700,
            color: role === 'Intern' ? 'var(--clr-caution, #f59e0b)' : 'var(--clr-accent, #38bdf8)',
          }}
        >
          {roleDef.labelTr.toUpperCase()} MODU ({roleDef.clearance}):
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {role === 'Intern' && (
            <>Kısıtlı gözlemci modu. Finansal rezervler maskelenir; işlem ekleme, fonlama ve defteri silme kilitlidir.</>
          )}
          {role === 'Employee' && (
            <>Operasyonel yetki devrede. Harcama işlemi ve görev girebilirsiniz; kasa fonlama ve defteri sıfırlama kilitlidir.</>
          )}
          {role === 'Auditor' && (
            <>Bağımsız denetim modu. Tüm kayıtları inceleyebilirsiniz; veri ekleme veya silme kilitlidir.</>
          )}
          {role === 'Lead Architect' && (
            <>Takım lideri modu. Operasyonel görevler serbesttir; root defteri sıfırlama kilitlidir.</>
          )}
        </span>
        {/* Company member: role is fixed — explain it */}
        {appMode === 'COMPANY_MEMBER' && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.60rem' }}>
            · Rol davetiye ile atanmıştır, değiştirilemez.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={openMatrixModal}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.60rem',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'underline',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Yetkileri Gör
        </button>

        {/* Only show the "switch to Founder" button in devmode */}
        {isDevMode && (
          <button
            onClick={() => switchDevRole('Founder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 3,
              border: '1px solid var(--clr-accent)',
              background: 'var(--clr-accent)',
              color: '#060B18',
              fontWeight: 700,
              fontSize: '0.60rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>👑 Yönetici Yetkisine Geç</span>
            <ArrowRight size={10} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
};
