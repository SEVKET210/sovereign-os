/* ============================================================
   SOVEREIGN-OS — Company Setup Wizard
   Shown on first launch. The user chooses:
   (A) Solo mode — single operator, full Founder access
   (B) Create Company — multi-user, invite-based team
   (C) Accept Invite — enter a token received from a patron
   ============================================================ */

import React, { useState } from 'react';
import { Building2, User, KeyRound, ArrowRight, Check, X, ChevronLeft, Sparkles, Shield, Cpu, Layers, Globe, Terminal } from 'lucide-react';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

type WizardStep =
  | 'CHOOSE_MODE'
  | 'SOLO_SETUP'
  | 'COMPANY_SETUP'
  | 'ACCEPT_INVITE';

const ENTERPRISE_ICONS = [
  { id: 'building', label: 'Kurumsal', icon: Building2 },
  { id: 'shield', label: 'Savunma', icon: Shield },
  { id: 'cpu', label: 'Kuantum', icon: Cpu },
  { id: 'layers', label: 'Protokol', icon: Layers },
  { id: 'globe', label: 'Ağ', icon: Globe },
  { id: 'terminal', label: 'Enclave', icon: Terminal },
];

export const CompanySetupWizard: React.FC = () => {
  const { chooseSoloMode, createCompany, acceptInvite } = useCompanyStore();
  const { invites } = useTeamStore();

  const [step, setStep] = useState<WizardStep>('CHOOSE_MODE');

  // Solo form
  const [soloAlias, setSoloAlias] = useState('');

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [founderAlias, setFounderAlias] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('building');

  // Invite form
  const [inviteToken, setInviteToken] = useState('');
  const [memberAlias, setMemberAlias] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleSoloConfirm = () => {
    TactileSoundEngine.playUnlockShimmer();
    chooseSoloMode(soloAlias || 'OPERATOR_00');
  };

  const handleCompanyCreate = () => {
    if (!companyName.trim()) return;
    TactileSoundEngine.playUnlockShimmer();
    createCompany(companyName.trim(), selectedIconId, founderAlias || 'KURUCU');
  };

  const handleAcceptInvite = () => {
    if (!inviteToken.trim() || !memberAlias.trim()) return;
    setInviteError('');
    setIsAccepting(true);
    TactileSoundEngine.playMechanicalTransient();

    setTimeout(() => {
      const result = acceptInvite(inviteToken.trim().toUpperCase(), memberAlias.trim(), invites);
      if (!result.success) {
        setInviteError(result.error || 'Bilinmeyen hata.');
        TactileSoundEngine.playSeismicWarning();
      }
      setIsAccepting(false);
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(78, 242, 210, 0.06) 0%, #08090c 60%)',
        padding: 24,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        height: 200,
        background: 'radial-gradient(ellipse, rgba(78, 242, 210, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: step === 'CHOOSE_MODE' ? 680 : 460,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 16,
        boxShadow: '0 40px 80px -16px rgba(0,0,0,0.9), 0 0 40px rgba(78,242,210,0.06)',
        overflow: 'hidden',
        animation: 'enter-scale 0.25s ease-out both',
      }}>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div style={{
          padding: '20px 28px 18px',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {step !== 'CHOOSE_MODE' && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => { TactileSoundEngine.playClick(); setStep('CHOOSE_MODE'); setInviteError(''); }}
              style={{ padding: 5 }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              SOVEREIGN-OS v3.0
            </div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {step === 'CHOOSE_MODE'  ? 'Sisteme Hoş Geldiniz' : ''}
              {step === 'SOLO_SETUP'   ? 'Solo Kurulum' : ''}
              {step === 'COMPANY_SETUP'? 'Şirket Kurulumu' : ''}
              {step === 'ACCEPT_INVITE'? 'Daveti Kabul Et' : ''}
            </h1>
          </div>
        </div>

        {/* ── Step: Choose Mode ─────────────────────────────── */}
        {step === 'CHOOSE_MODE' && (
          <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Sovereign OS'u nasıl kullanmak istediğinizi seçin. Bu tercih daha sonra Ayarlar'dan değiştirilebilir.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Solo Card */}
              <div
                onClick={() => { TactileSoundEngine.playClick(); setStep('SOLO_SETUP'); }}
                style={{
                  padding: '24px 20px',
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(78,242,210,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-moderate)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-primary)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(78,242,210,0.1)', border: '1px solid rgba(78,242,210,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={22} color="var(--clr-accent)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    👤 Solo Kullanım
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    Tek başına kullan. Tam Kurucu yetkisiyle tüm modüllere erişim. Ekip davet özelliği devre dışı.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--clr-accent)', fontWeight: 600 }}>
                  <span>Başla</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Company Card */}
              <div
                onClick={() => { TactileSoundEngine.playClick(); setStep('COMPANY_SETUP'); }}
                style={{
                  padding: '24px 20px',
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-moderate)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-primary)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    🏢 Şirket Kurulumu
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    Ekibinizle birlikte kullanın. Patron olarak çalışanları davet edin, rol ve yetki atayın.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                  <span>Şirket Kur</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>

            {/* Accept Invite CTA */}
            <div
              onClick={() => { TactileSoundEngine.playClick(); setStep('ACCEPT_INVITE'); }}
              style={{
                padding: '14px 18px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px dashed var(--border-moderate)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-moderate)'; }}
            >
              <KeyRound size={18} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Davetiye kodum var
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Patronunuzdan aldığınız SOV-INV-... kodunu girerek katılın
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        )}

        {/* ── Step: Solo Setup ──────────────────────────────── */}
        {step === 'SOLO_SETUP' && (
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'rgba(78,242,210,0.06)', border: '1px solid rgba(78,242,210,0.2)' }}>
              <Sparkles size={16} color="var(--clr-accent)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tam Kurucu yetkisiyle (L4) tüm modüllere erişeceksiniz.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                TAKINIZ / OPERATÖR TAKMA ADI
              </label>
              <input
                type="text"
                value={soloAlias}
                onChange={(e) => setSoloAlias(e.target.value)}
                placeholder="OPERATOR_00"
                maxLength={32}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSoloConfirm()}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Boş bırakırsanız "OPERATOR_00" kullanılır
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSoloConfirm}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Check size={16} />
              Solo Olarak Başla
            </button>
          </div>
        )}

        {/* ── Step: Company Setup ───────────────────────────── */}
        {step === 'COMPANY_SETUP' && (
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                ŞİRKET İSMİ
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Şirket Adını Girin"
                maxLength={48}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                ENKLAV LOGOSU
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ENTERPRISE_ICONS.map(({ id, icon: IconComp }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedIconId(id)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: selectedIconId === id ? 'rgba(78,242,210,0.12)' : 'var(--bg-primary)',
                      border: `2px solid ${selectedIconId === id ? 'var(--clr-accent)' : 'var(--border-hairline)'}`,
                      color: selectedIconId === id ? 'var(--clr-accent)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <IconComp size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                KURUCU TAKMA ADINIZ
              </label>
              <input
                type="text"
                value={founderAlias}
                onChange={(e) => setFounderAlias(e.target.value)}
                placeholder="KURUCU"
                maxLength={32}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCompanyCreate}
              disabled={!companyName.trim()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: companyName.trim() ? 1 : 0.5 }}
            >
              <Building2 size={16} />
              {companyName.trim() || 'Şirket'} Kur
            </button>
          </div>
        )}

        {/* ── Step: Accept Invite ───────────────────────────── */}
        {step === 'ACCEPT_INVITE' && (
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <KeyRound size={16} color="#6366f1" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Patronunuzdan aldığınız SOV-INV-... kodunu girin. Rolünüz otomatik atanacak.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                DAVETİYE KODU
              </label>
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => { setInviteToken(e.target.value); setInviteError(''); }}
                placeholder="SOV-INV-XXXX-YYYY-ZZZZ"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: `1px solid ${inviteError ? 'var(--clr-negative)' : 'var(--border-moderate)'}`,
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  boxSizing: 'border-box',
                }}
              />
              {inviteError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-negative)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} />
                  {inviteError}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>
                SİZİN TAKINIZ / TAKINIZ
              </label>
              <input
                type="text"
                value={memberAlias}
                onChange={(e) => setMemberAlias(e.target.value)}
                placeholder="örn. AHMET_YILMAZ"
                maxLength={32}
                onKeyDown={(e) => e.key === 'Enter' && handleAcceptInvite()}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleAcceptInvite}
              disabled={isAccepting || !inviteToken.trim() || !memberAlias.trim()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!inviteToken.trim() || !memberAlias.trim()) ? 0.5 : 1 }}
            >
              <KeyRound size={16} />
              {isAccepting ? 'Doğrulanıyor...' : 'Daveti Kabul Et & Katıl'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
