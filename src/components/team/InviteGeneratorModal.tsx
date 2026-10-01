import React, { useState } from 'react';
import { X, KeyRound, Copy, Check, Clock, UserCog, Building2 } from 'lucide-react';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { Department, InviteExpirationOption, SystemRole } from '../../types/team';
import type { ClearanceLevel } from '../../types';

const DEPARTMENTS: Array<Department | 'Open'> = [
  'Open',
  'Engineering',
  'Operations',
  'Finance',
  'Legal',
  'Executive',
];

const EXPIRATION_OPTIONS: Array<{ id: InviteExpirationOption; label: string }> = [
  { id: '1h',          label: '1 Saat (Acil Flash)' },
  { id: '24h',         label: '24 Saat (Standart)' },
  { id: '7d',          label: '7 Gün (İşe Alım Penceresi)' },
  { id: 'single-use',  label: 'Tek Kullanım (Yak-Oku)' },
];

const ROLE_OPTIONS: Array<{ role: SystemRole; clearance: ClearanceLevel; emoji: string; labelTr: string; desc: string }> = [
  {
    role: 'Lead Architect',
    clearance: 'LEVEL_3',
    emoji: '🏗️',
    labelTr: 'Takım Lideri',
    desc: 'Teknik liderlik, rezervleri görebilir, ekip yönetemez',
  },
  {
    role: 'Employee',
    clearance: 'LEVEL_2',
    emoji: '💼',
    labelTr: 'Çalışan',
    desc: 'Standart operasyonel erişim, işlem girebilir',
  },
  {
    role: 'Intern',
    clearance: 'LEVEL_1',
    emoji: '🎓',
    labelTr: 'Stajyer',
    desc: 'Sadece gözlem, finansal veriler gizli, silme yok',
  },
  {
    role: 'Auditor',
    clearance: 'LEVEL_2',
    emoji: '🔍',
    labelTr: 'Denetçi',
    desc: 'Denetim erişimi, okuma ağırlıklı, değişiklik yapamaz',
  },
];

export const InviteGeneratorModal: React.FC = () => {
  const { isInviteModalOpen, closeInviteModal, createInvite } = useTeamStore();

  const [selectedDept, setSelectedDept] = useState<Department | 'Open'>('Open');
  const [selectedRole, setSelectedRole] = useState<SystemRole>('Employee');
  const [selectedClearance, setSelectedClearance] = useState<ClearanceLevel>('LEVEL_2');
  const [selectedExpiration, setSelectedExpiration] = useState<InviteExpirationOption>('24h');
  const [maxUses, setMaxUses] = useState<number>(1);
  const [recipientNote, setRecipientNote] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isInviteModalOpen) return null;

  const handleSelectRole = (role: SystemRole, clearance: ClearanceLevel) => {
    TactileSoundEngine.playMechanicalTransient();
    setSelectedRole(role);
    setSelectedClearance(clearance);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const invite = await createInvite(
        selectedDept,
        selectedRole,
        selectedClearance,
        selectedExpiration === 'single-use' ? 1 : maxUses,
        selectedExpiration,
        recipientNote
      );
      setGeneratedToken(invite.token);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    TactileSoundEngine.playClick();
    navigator.clipboard.writeText(generatedToken).catch(() => {});
    setCopied(true);
    showToast('Davetiye kodu panoya kopyalandı.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setGeneratedToken(null);
    setCopied(false);
    setRecipientNote('');
  };

  const selectedRoleOpt = ROLE_OPTIONS.find((r) => r.role === selectedRole);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeInviteModal}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal Surface */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-secondary, #0c0e12)',
          border: '1px solid var(--border-moderate, rgba(78, 242, 210, 0.3))',
          borderRadius: 10,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 24px rgba(78, 242, 210, 0.08)',
          overflow: 'hidden',
          zIndex: 1,
          animation: 'enter-scale 0.18s ease-out both',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} color="var(--clr-accent)" />
            <h3 style={{ fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>
              Şifreli Davetiye Oluştur
            </h3>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={closeInviteModal} style={{ padding: 4 }}>
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '80vh', overflowY: 'auto' }}>
          {!generatedToken ? (
            <>
              {/* ── Recipient Note ─────────────────────────────── */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
                  KİME GÖNDERİLİYOR? (İSTEĞE BAĞLI NOT)
                </label>
                <input
                  type="text"
                  value={recipientNote}
                  onChange={(e) => setRecipientNote(e.target.value)}
                  placeholder="örn. Ahmet Yılmaz — Frontend Geliştirici"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-moderate)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* ── Role Selection (KEY SECTION) ────────────────── */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                  <UserCog size={11} style={{ display: 'inline', marginRight: 4 }} />
                  ATANAN ROL — Bu davetiyeyle katılan kişi bu rolle gelir
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = selectedRole === opt.role;
                    return (
                      <div
                        key={opt.role}
                        onClick={() => handleSelectRole(opt.role, opt.clearance)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(78, 242, 210, 0.08)' : 'var(--bg-primary)',
                          border: `1px solid ${isSelected ? 'rgba(78, 242, 210, 0.4)' : 'var(--border-hairline)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.1rem' }}>{opt.emoji}</span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {opt.labelTr}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: isSelected ? 'rgba(78, 242, 210, 0.15)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--clr-accent)' : 'var(--text-muted)',
                            border: `1px solid ${isSelected ? 'rgba(78, 242, 210, 0.3)' : 'var(--border-hairline)'}`,
                          }}>
                            {opt.clearance.replace('_', '-')}
                          </span>
                          {isSelected && <Check size={14} color="var(--clr-accent)" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Department ─────────────────────────────────── */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
                  <Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                  DEPARTMAN KISITLAMASI
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDept === dept;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => { TactileSoundEngine.playMechanicalTransient(); setSelectedDept(dept); }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 4,
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          background: isSelected ? 'rgba(78, 242, 210, 0.12)' : 'var(--bg-primary)',
                          color: isSelected ? 'var(--clr-accent)' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'rgba(78, 242, 210, 0.4)' : 'var(--border-hairline)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Expiration ─────────────────────────────────── */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
                  GEÇERLİLİK SÜRESİ
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {EXPIRATION_OPTIONS.map((opt) => {
                    const isSelected = selectedExpiration === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { TactileSoundEngine.playMechanicalTransient(); setSelectedExpiration(opt.id); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(78, 242, 210, 0.08)' : 'var(--bg-primary)',
                          border: `1px solid ${isSelected ? 'rgba(78, 242, 210, 0.35)' : 'var(--border-hairline)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={13} color={isSelected ? 'var(--clr-accent)' : 'var(--text-muted)'} />
                          <span style={{ fontSize: '0.74rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {opt.label}
                          </span>
                        </div>
                        {isSelected && <Check size={14} color="var(--clr-accent)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Max Uses ───────────────────────────────────── */}
              {selectedExpiration !== 'single-use' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
                    MAKSİMUM KULLANIM ({maxUses} kişi)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--clr-accent)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>1</span>
                    <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>{maxUses}</span>
                    <span>25</span>
                  </div>
                </div>
              )}

              {/* ── Summary Banner ─────────────────────────────── */}
              <div style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: 'rgba(78, 242, 210, 0.06)',
                border: '1px solid rgba(78, 242, 210, 0.2)',
                fontSize: '0.74rem',
              }}>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>DAVETİYE ÖZETİ</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {recipientNote && <span style={{ fontWeight: 600 }}>{recipientNote} → </span>}
                  <span>{selectedRoleOpt?.emoji} {selectedRoleOpt?.labelTr}</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {selectedDept === 'Open' ? 'Tüm departmanlar' : selectedDept}</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {selectedExpiration === 'single-use' ? '1 kullanım' : `${maxUses} kişi`}</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <KeyRound size={15} />
                {isGenerating ? 'Şifreleniyor...' : 'Kriptografik Davetiye Oluştur'}
              </button>
            </>
          ) : (
            /* ── Generated Token View ──────────────────────── */
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 4 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Davetiye Hazır
                </div>
                {recipientNote && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {recipientNote} → {selectedRoleOpt?.emoji} {selectedRoleOpt?.labelTr}
                  </div>
                )}
              </div>

              <div style={{
                padding: '14px 16px',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-moderate)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--clr-accent)',
                letterSpacing: '0.06em',
                textAlign: 'center',
                wordBreak: 'break-all',
              }}>
                {generatedToken}
              </div>

              {/* Role Reminder */}
              <div style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: 'rgba(78, 242, 210, 0.06)',
                border: '1px solid rgba(78, 242, 210, 0.2)',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: '1.1rem' }}>{selectedRoleOpt?.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Bu kodu kullanan kişi otomatik olarak <span style={{ color: 'var(--clr-accent)' }}>{selectedRoleOpt?.labelTr}</span> rolüyle sisteme girer.
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{selectedRoleOpt?.desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCopy}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Kopyalandı!' : 'Kodu Kopyala'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ flex: 1 }}
                >
                  Yeni Davetiye
                </button>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={closeInviteModal}
                style={{ width: '100%' }}
              >
                Kapat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
