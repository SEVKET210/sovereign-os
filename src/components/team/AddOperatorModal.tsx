import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { Department, SystemRole } from '../../types/team';
import type { ClearanceLevel } from '../../types';

interface AddOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS: Department[] = ['Engineering', 'Operations', 'Finance', 'Legal', 'Executive'];

const ROLES: SystemRole[] = ['Lead Architect', 'Senior Operator', 'Auditor', 'Founder'];

const CLEARANCES: ClearanceLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];

export const AddOperatorModal: React.FC<AddOperatorModalProps> = ({ isOpen, onClose }) => {
  const addOperator = useTeamStore((state) => state.addOperator);

  const [alias, setAlias] = useState('');
  const [department, setDepartment] = useState<Department>('Engineering');
  const [role, setRole] = useState<SystemRole>('Senior Operator');
  const [clearance, setClearance] = useState<ClearanceLevel>('LEVEL_2');
  const [keyFingerprint, setKeyFingerprint] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) return;

    addOperator(
      alias.trim(),
      department,
      role,
      clearance,
      keyFingerprint.trim() || undefined
    );

    setAlias('');
    setKeyFingerprint('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 1000)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <UserPlus size={18} color="var(--clr-accent)" />
            <div>
              <h3 className="type-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                Yeni Operatör Ekle // Direct Enrollment
              </h3>
              <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ENKLAVA DOĞRUDAN EKİP ÜYESİ VE YETKİ TANIMLAMA
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 'var(--sp-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
          }}
        >
          {/* Alias */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              OPERATÖR KOD ADI / ALIAS
            </label>
            <input
              type="text"
              required
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Örn: OPERATOR_KAYA veya AHMET_SECURITY"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          {/* Department & Role Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div>
              <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                DEPARTMAN
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                SİSTEM ROLÜ
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SystemRole)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clearance Level */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              GÜVENLİK YETKİ SEVİYESİ (CLEARANCE LEVEL)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-2)' }}>
              {CLEARANCES.map((lvl) => {
                const isSelected = clearance === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      TactileSoundEngine.playClick();
                      setClearance(lvl);
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected
                        ? '1px solid var(--clr-accent)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'rgba(var(--accent-rgb, 59 130 246) / 0.15)'
                        : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--clr-accent)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {lvl.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Key Fingerprint */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              DONANIM ANAHTARI / PARMAK İZİ (OPSİYONEL)
            </label>
            <input
              type="text"
              value={keyFingerprint}
              onChange={(e) => setKeyFingerprint(e.target.value)}
              placeholder="Boş bırakılırsa otomatik CSPRNG üretilir (0x...)"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 'var(--sp-3)',
              marginTop: 'var(--sp-2)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                TactileSoundEngine.playClick();
                onClose();
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!alias.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <UserPlus size={15} />
              <span>Operatörü Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
