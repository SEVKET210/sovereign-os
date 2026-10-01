import React, { useState } from 'react';
import { X, Coins, ShieldCheck } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { marketDataService } from '../../services/market/MarketDataService';
import type { LiquidityVault, VaultId } from '../../types';

interface FundVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: LiquidityVault[];
  defaultVaultId?: string | null;
  onFundVault: (vaultId: VaultId, amount: number, currency: string, note: string) => Promise<void>;
}

export const FundVaultModal: React.FC<FundVaultModalProps> = ({
  isOpen,
  onClose,
  vaults,
  defaultVaultId,
  onFundVault,
}) => {
  const [vaultId, setVaultId] = useState<VaultId>(
    (defaultVaultId as VaultId) || 'commercial_reserve'
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('İlk Sermaye Tahsisi ve Hazine Fonlaması');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedVault = vaults.find((v) => v.id === vaultId) || vaults[0];
  const rawAmount = parseFloat(amountStr) || 0;

  // Live currency conversion
  const eurUsd = marketDataService.getTick('EUR/USD')?.price || 1.1605;
  const usdTry = marketDataService.getTick('USD/TRY')?.price || 48.6;

  let estimatedUsd = rawAmount;
  if (selectedVault.currency === 'EUR') {
    estimatedUsd = rawAmount * eurUsd;
  } else if (selectedVault.currency === 'TRY') {
    estimatedUsd = usdTry > 0 ? rawAmount / usdTry : rawAmount;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onFundVault(
        vaultId,
        rawAmount,
        selectedVault.currency,
        note.trim() || 'Hazine Kasa Fonlaması'
      );
      setAmountStr('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
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
            <Coins size={18} color="var(--clr-accent)" />
            <div>
              <h3 className="type-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                Kasaya Bakiye / Fon Yatır
              </h3>
              <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                GERÇEK SERMAYE GİRİŞİ VE İLK BAKİYE TANIMLAMA
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
          {/* Target Vault */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              FONLANACAK KASA (TARGET VAULT)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
              {vaults.map((v) => {
                const isSelected = v.id === vaultId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      TactileSoundEngine.playClick();
                      setVaultId(v.id as VaultId);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected
                        ? 'rgba(var(--accent-rgb, 59 130 246) / 0.12)'
                        : 'var(--bg-secondary)',
                      border: isSelected
                        ? '1px solid var(--clr-accent)'
                        : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{v.name}</div>
                    <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Para Birimi: {v.currency}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              YATIRILACAK TUTAR ({selectedVault.currency})
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="Örn: 25000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--clr-accent)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                }}
              >
                {selectedVault.currency}
              </span>
            </div>

            {rawAmount > 0 && selectedVault.currency !== 'USD' && (
              <div style={{ marginTop: 4, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                ≈ ${estimatedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              FONLAMA AÇIKLAMASI
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Kurucu Sermaye Aktarımı / Q3 Operasyonel Fonlama"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                outline: 'none',
              }}
            />
          </div>

          {/* Submit */}
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
              disabled={isSubmitting || rawAmount <= 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ShieldCheck size={15} />
              <span>{isSubmitting ? 'Mühürleniyor...' : 'Kasayı Fonla & Deftere Mühürle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
