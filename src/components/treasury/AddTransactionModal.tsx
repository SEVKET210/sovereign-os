import React, { useState } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  FileText,
  UserCheck,
} from 'lucide-react';
import { marketDataService } from '../../services/market/MarketDataService';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { LiquidityVault, VaultId } from '../../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: LiquidityVault[];
  defaultVaultId?: string | null;
  defaultType?: 'DEBIT' | 'CREDIT';
  onSubmitTransaction: (data: {
    vaultId: VaultId;
    amount: number;
    currency: string;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    signatory: string;
    category?: string;
  }) => Promise<void>;
}

const CATEGORIES = [
  'Sunucu & Bulut Altyapısı (AWS/GPU/VDS)',
  'Personel & Maaş Ödemeleri',
  'Ofis & Operasyonel Giderler',
  'Yazılım, API & Lisanslar',
  'Güvenlik & Bağımsız Denetim',
  'Pazarlama & İletişim',
  'Müşteri Tahsilatı / Gelir',
  'Sermaye Artırımı / Fonlama',
  'Diğer / Özel Gider',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  vaults,
  defaultVaultId,
  defaultType = 'DEBIT',
  onSubmitTransaction,
}) => {
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>(defaultType);
  const [vaultId, setVaultId] = useState<VaultId>(
    (defaultVaultId as VaultId) || 'commercial_reserve'
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [signatory, setSignatory] = useState<string>('OPERATOR_00 [FOUNDER]');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedVault = vaults.find((v) => v.id === vaultId) || vaults[0];

  // Dynamic currency conversion to USD equivalent using live market data
  const rawAmount = parseFloat(amountStr) || 0;
  const eurUsd = marketDataService.getTick('EUR/USD')?.price || 1.1605;
  const usdTry = marketDataService.getTick('USD/TRY')?.price || 48.6;

  let estimatedUsd = rawAmount;
  if (currency === 'EUR') {
    estimatedUsd = rawAmount * eurUsd;
  } else if (currency === 'TRY') {
    estimatedUsd = usdTry > 0 ? rawAmount / usdTry : rawAmount;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const finalDesc = description.trim()
        ? `[${category.split(' ')[0]}] ${description.trim()}`
        : category;

      await onSubmitTransaction({
        vaultId,
        amount: rawAmount,
        currency,
        type,
        description: finalDesc,
        signatory: signatory.trim() || 'OPERATOR_00',
        category,
      });

      // Reset form
      setAmountStr('');
      setDescription('');
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
          maxWidth: 580,
          maxHeight: '90vh',
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
            <ShieldCheck size={18} color="var(--clr-accent)" />
            <div>
              <h3 className="type-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                Kriptografik İşlem Girişi // Chained Ledger
              </h3>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                ÇİFT KAYITLI DEFTER VE ANLIK KASA BAKİYE GÜNCELLEMESİ
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

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 'var(--sp-6)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
          }}
        >
          {/* Transaction Type Segmented Toggle */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              İŞLEM TÜRÜ (TRANSACTION TYPE)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--sp-2)',
                background: 'var(--bg-secondary)',
                padding: 4,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setType('DEBIT');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  background:
                    type === 'DEBIT'
                      ? 'rgba(239, 68, 68, 0.18)'
                      : 'transparent',
                  color: type === 'DEBIT' ? '#ef4444' : 'var(--text-muted)',
                  boxShadow:
                    type === 'DEBIT' ? '0 0 0 1px rgba(239, 68, 68, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowDownRight size={16} />
                <span>GİDER / HARCAMA (DEBIT)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setType('CREDIT');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  background:
                    type === 'CREDIT'
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'transparent',
                  color: type === 'CREDIT' ? '#10b981' : 'var(--text-muted)',
                  boxShadow:
                    type === 'CREDIT' ? '0 0 0 1px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowUpRight size={16} />
                <span>GELİR / FONLAMA (CREDIT)</span>
              </button>
            </div>
          </div>

          {/* Target Vault Selection */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              HEDEF KASA (LIQUIDITY VAULT)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--sp-2)',
              }}
            >
              {vaults.map((v) => {
                const isSelected = v.id === vaultId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      TactileSoundEngine.playClick();
                      setVaultId(v.id as VaultId);
                      setCurrency(v.currency);
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
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {v.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 4,
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Mevcut:</span>
                      <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>
                        ${v.usdEquivalent.toLocaleString()} USD
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Amount & Currency */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              TUTAR VE PARA BİRİMİ
            </label>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$'}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
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
              </div>

              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: 100,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USDT">USDT ($)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>

            {/* Real-Time Live Conversion Pill */}
            {rawAmount > 0 && currency !== 'USD' && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>≈ ${estimatedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  (Canlı kur: {currency === 'EUR' ? `1 EUR = $${eurUsd.toFixed(4)}` : `1 USD = ₺${usdTry.toFixed(2)}`})
                </span>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              GİDER / GELİR KATEGORİSİ
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Tag
                size={14}
                style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              İŞLEM AÇIKLAMASI (DESCRIPTION)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FileText
                size={14}
                style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Örn: H100 GPU Hesaplama Kümesi Aylık Barındırma Faturası"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Signatory */}
          <div>
            <label
              className="label-overline"
              style={{ display: 'block', marginBottom: 'var(--sp-2)' }}
            >
              İMZALAYAN OPERATÖR (SIGNATORY IDENTITY)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <UserCheck
                size={14}
                style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                required
                value={signatory}
                onChange={(e) => setSignatory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Dynamic Impact Summary Box */}
          {rawAmount > 0 && (
            <div
              style={{
                padding: 'var(--sp-3) var(--sp-4)',
                background:
                  type === 'DEBIT'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(16, 185, 129, 0.08)',
                border: `1px dashed ${type === 'DEBIT' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>KASA ETKİSİ: </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVault.name}
                </span>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  color: type === 'DEBIT' ? '#ef4444' : '#10b981',
                }}
              >
                {type === 'DEBIT' ? '-' : '+'}
                {rawAmount.toLocaleString()} {currency}
                {currency !== 'USD' && (
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                    (≈ ${estimatedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={isSubmitting}
            >
              İptal
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || rawAmount <= 0 || !description.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: type === 'DEBIT' ? '#ef4444' : 'var(--clr-accent)',
                borderColor: type === 'DEBIT' ? '#dc2626' : 'var(--clr-accent)',
              }}
            >
              <ShieldCheck size={15} />
              <span>
                {isSubmitting
                  ? 'Kriptografik Olarak Mühürleniyor...'
                  : type === 'DEBIT'
                  ? 'Harcamayı İmzala & Zincire Ekle'
                  : 'Geliri İmzala & Kasaya Ekle'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
