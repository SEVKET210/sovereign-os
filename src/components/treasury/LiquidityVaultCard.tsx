import { DollarSign, Landmark, Coins, Wallet, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import type { LiquidityVault } from '../../types';
import { usePermissionStore } from '../../stores/usePermissionStore';

const ICONS = {
  petty_cash: Coins,
  commercial_reserve: Landmark,
  forex_metals: DollarSign,
  digital_assets: Wallet,
};

export const LiquidityVaultCard: React.FC<{
  vault: LiquidityVault;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onFund?: (id: string) => void;
}> = ({ vault, isSelected, onSelect, onFund }) => {
  const Icon = ICONS[vault.id] || Coins;
  const isPositive = vault.change24h >= 0;

  const formatCurrency = (amount: number, cur: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur === 'USDT' ? 'USD' : cur,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasViewReserves = usePermissionStore((state) => state.hasPermission('treasury:view_reserves'));
  const canFund = usePermissionStore((state) => state.hasPermission('treasury:fund'));

  return (
    <div
      onClick={() => onSelect && onSelect(vault.id)}
      className="interactive"
      style={{
        padding: 'var(--sp-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onSelect ? 'pointer' : 'default',
        minHeight: 180,
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color="var(--clr-accent)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {vault.name}
            </div>
            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {vault.category.toUpperCase()}
            </div>
          </div>
        </div>

        {/* 24h Change Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            background: isPositive ? 'var(--clr-positive-alpha)' : 'var(--clr-negative-alpha)',
            color: isPositive ? 'var(--clr-positive)' : 'var(--clr-negative)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.64rem',
            fontWeight: 600,
          }}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span>{isPositive ? '+' : ''}{vault.change24h}%</span>
        </div>
      </div>

      {/* Balance Readout */}
      <div style={{ marginTop: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        {hasViewReserves ? (
          <>
            <div
              className="tabular-nums"
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(vault.balance, vault.currency)}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              ≈ ${vault.usdEquivalent.toLocaleString()} USD ({vault.allocationPercent}% PORTFOLIO)
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 700,
                color: 'var(--clr-caution)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '0.05em',
              }}
            >
              <Lock size={15} />
              <span>$•••,••• (GİZLİ)</span>
            </div>
            <div
              style={{
                fontSize: '0.58rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-caution)',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 6px',
                borderRadius: 3,
                width: 'fit-content',
                fontWeight: 600,
              }}
            >
              STAJYER KISITLAMASI: REZERV GİZLİ
            </div>
          </div>
        )}
      </div>

      {/* Bottom Block Telemetry */}
      <div
        style={{
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 'var(--sp-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <span>AUDITED BLOCK: #{vault.lastAuditedBlock}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onFund && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (canFund) onFund(vault.id);
              }}
              disabled={!canFund}
              className="btn btn-ghost btn-xs"
              style={{
                fontSize: '0.60rem',
                padding: '1px 6px',
                height: 20,
                color: canFund ? 'var(--clr-accent)' : 'var(--text-muted)',
                border: `1px solid ${canFund ? 'var(--border-moderate)' : 'var(--border-subtle)'}`,
                fontFamily: 'var(--font-mono)',
                cursor: canFund ? 'pointer' : 'not-allowed',
                opacity: canFund ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
              title={
                canFund
                  ? `${vault.name} kasasına fon/bakiye yatır`
                  : 'Yetki Yetersiz: Sadece Yönetici kasayı fonlayabilir'
              }
            >
              {!canFund && <Lock size={9} />}
              <span>+ Fonla</span>
            </button>
          )}
          <span style={{ color: 'var(--clr-positive)' }}>CHAIN VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
