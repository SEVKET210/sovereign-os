import React, { useState, useEffect } from 'react';
import { LiquidityVaultCard } from './LiquidityVaultCard';
import { RunwayTelemetryGauge } from './RunwayTelemetryGauge';
import { ChainedLedgerTable } from './ChainedLedgerTable';
import { AddTransactionModal } from './AddTransactionModal';
import { FundVaultModal } from './FundVaultModal';
import { LedgerHashChain } from '../../services/crypto/LedgerHashChain';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { ZkPersistenceManager } from '../../services/crypto/ZkPersistenceManager';
import { ThreatDetectionEngine } from '../../services/security/ThreatDetectionEngine';
import { marketDataService } from '../../services/market/MarketDataService';
import { showToast } from '../Toast';
import { Plus, Coins, Trash2, Lock } from 'lucide-react';
import { usePermissionStore } from '../../stores/usePermissionStore';
import type { LiquidityVault, ChainedLedgerEntry, RunwayTelemetry, VaultId } from '../../types';

const INITIAL_VAULTS: LiquidityVault[] = [
  {
    id: 'commercial_reserve',
    name: 'Commercial Bank Reserve',
    category: 'Commercial Banking',
    balance: 0,
    currency: 'USD',
    usdEquivalent: 0,
    allocationPercent: 0,
    change24h: 0,
    description: 'Tier-1 Institutional Reserve Escrow (Standby / Ready for Funding)',
    lastAuditedBlock: 1,
  },
  {
    id: 'digital_assets',
    name: 'Digital Asset Vault',
    category: 'Digital Assets',
    balance: 0,
    currency: 'USDT',
    usdEquivalent: 0,
    allocationPercent: 0,
    change24h: 0,
    description: 'Multi-Sig Smart Vault with automated rebalancing and L2 gas subsidies',
    lastAuditedBlock: 1,
  },
  {
    id: 'forex_metals',
    name: 'Forex & Precious Metals',
    category: 'Forex & Metals',
    balance: 0,
    currency: 'EUR',
    usdEquivalent: 0,
    allocationPercent: 0,
    change24h: 0,
    description: 'Physical allocated bullion and sovereign currency hedge reserve',
    lastAuditedBlock: 1,
  },
  {
    id: 'petty_cash',
    name: 'Petty Operational Cash',
    category: 'Physical',
    balance: 0,
    currency: 'USD',
    usdEquivalent: 0,
    allocationPercent: 0,
    change24h: 0,
    description: 'Physical cash contingency held in sovereign security enclaves',
    lastAuditedBlock: 1,
  },
];

export const TreasuryDashboard: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<ChainedLedgerEntry[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Modals state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundModalVaultId, setFundModalVaultId] = useState<string | null>(null);

  // Live market rates for accurate USD valuation
  const eurUsd = marketDataService.getTick('EUR/USD')?.price || 1.1605;
  const usdTry = marketDataService.getTick('USD/TRY')?.price || 48.6;

  // Dynamically derive vaults, balances, and block audit counts from real ledger transactions
  const derivedVaults: LiquidityVault[] = INITIAL_VAULTS.map((base) => {
    const vEntries = ledgerEntries.filter((e) => e.vaultId === base.id);
    const credits = vEntries.filter((e) => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
    const debits = vEntries.filter((e) => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
    const balance = Math.max(0, credits - debits);
    const lastAuditedBlock = vEntries.length > 0 ? vEntries[vEntries.length - 1].index + 1 : 1;

    let usdEquivalent = balance;
    if (base.currency === 'EUR') {
      usdEquivalent = balance * eurUsd;
    } else if (base.currency === 'TRY') {
      usdEquivalent = usdTry > 0 ? balance / usdTry : balance;
    }

    return {
      ...base,
      balance,
      usdEquivalent: Math.round(usdEquivalent),
      lastAuditedBlock,
    };
  });

  const totalReserves = derivedVaults.reduce((acc, v) => acc + v.usdEquivalent, 0);

  const vaults: LiquidityVault[] = derivedVaults.map((v) => ({
    ...v,
    allocationPercent: totalReserves > 0 ? Math.round((v.usdEquivalent / totalReserves) * 100) : 0,
  }));

  const debits = ledgerEntries.filter((e) => e.type === 'DEBIT' && !e.isOffsetting);
  const totalDebits = debits.reduce((acc, e) => acc + e.amount, 0);
  const dailyBurn = totalDebits > 0 ? totalDebits / 90 : 0;
  const survivalMonths = dailyBurn > 0 ? totalReserves / (dailyBurn * 30) : totalReserves > 0 ? 36 : 0;

  const telemetry: RunwayTelemetry = {
    rolling90DayExpenditure: totalDebits,
    unreservedLiquidity: totalReserves,
    survivalMonths,
    burnRatePerDay: Math.round(dailyBurn),
    runwayHealth: survivalMonths >= 24 ? 'SOVEREIGN' : survivalMonths >= 12 ? 'NOMINAL' : survivalMonths >= 6 ? 'RESTRICTED' : 'CRITICAL',
  };

  // Initialize zero-knowledge encrypted ledger; strictly purge any legacy mock data automatically
  useEffect(() => {
    const CLEAN_SLATE_KEY = 'sovereign_treasury_purged_mock_v8';
    const isCleaned = typeof window !== 'undefined' && localStorage.getItem(CLEAN_SLATE_KEY);

    if (!isCleaned) {
      // Force clean slate for user: remove any mock genesis blocks stored in IndexedDB
      ZkPersistenceManager.clearLedger()
        .then(() => {
          localStorage.setItem(CLEAN_SLATE_KEY, 'true');
          setLedgerEntries([]);
        })
        .catch(() => {
          setLedgerEntries([]);
        });
    } else {
      ZkPersistenceManager.loadLedger()
        .then((loaded) => {
          const MOCK_PATTERNS = [
            'Genesis Capital Allocation',
            'Multi-Sig Liquid Buffer',
            'Sovereign FX Hedge',
            'SIG-FOUNDER-001',
            'SIG-TREASURER-004',
            'SIG-RISK-002',
          ];
          const hasMock = (loaded || []).some(
            (e) =>
              MOCK_PATTERNS.some((p) => e.description.includes(p)) ||
              MOCK_PATTERNS.includes(e.signatory)
          );

          if (hasMock) {
            ZkPersistenceManager.clearLedger().catch(() => {});
            setLedgerEntries([]);
          } else {
            setLedgerEntries(loaded || []);
          }
        })
        .catch(() => {
          setLedgerEntries([]);
        });
    }
  }, []);

  const { hasPermission } = usePermissionStore();
  const canFund = hasPermission('treasury:fund');
  const canTransact = hasPermission('treasury:transact');
  const canPurge = hasPermission('treasury:purge');

  const handlePurgeAllData = async () => {
    if (!canPurge) {
      TactileSoundEngine.playSeismicWarning();
      showToast('Yetki Yetersiz: Sadece Yönetici (L4) defteri sıfırlayabilir.', 'error');
      return;
    }
    TactileSoundEngine.playClick();
    if (!window.confirm('Tüm defter işlemlerini ve sahte kayıtları silerek kasaları sıfırlamak istiyor musunuz?')) {
      return;
    }
    await ZkPersistenceManager.clearLedger();
    setLedgerEntries([]);
    TactileSoundEngine.playLedgerSealThud();
    showToast('Tüm hazine verileri ve geçmiş kayıtlar silindi. Kasalar $0.00 olarak sıfırlandı.', 'warning');
  };

  // Autonomous Threat Sentinel: Monitor treasury liquid runway survival months
  useEffect(() => {
    if (telemetry.unreservedLiquidity > 0 && telemetry.burnRatePerDay > 0) {
      ThreatDetectionEngine.checkTreasuryRunway(telemetry.survivalMonths);
    }
  }, [telemetry.survivalMonths, telemetry.unreservedLiquidity, telemetry.burnRatePerDay]);

  const handleApplyTransaction = async (data: {
    vaultId: VaultId;
    amount: number;
    currency: string;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    signatory: string;
    category?: string;
  }) => {
    TactileSoundEngine.playClick();
    const updated = await LedgerHashChain.appendEntry(
      ledgerEntries,
      data.vaultId,
      data.amount,
      data.currency,
      data.type,
      data.description,
      data.signatory
    );
    TactileSoundEngine.playLedgerSealThud();
    setLedgerEntries((prev) => [...prev, updated]);
    ZkPersistenceManager.persistLedgerBlock(updated).catch(() => {});
    showToast(
      `${data.type === 'DEBIT' ? 'Harcama' : 'Gelir'} zincire mühürlendi (${data.amount.toLocaleString()} ${data.currency}).`,
      'success'
    );
  };

  const handleFundVault = async (
    vaultId: VaultId,
    amount: number,
    currency: string,
    note: string
  ) => {
    TactileSoundEngine.playClick();
    const updated = await LedgerHashChain.appendEntry(
      ledgerEntries,
      vaultId,
      amount,
      currency,
      'CREDIT',
      note || 'Sermaye Tahsisi / Kasa Fonlaması',
      'OPERATOR_00 [FOUNDER]'
    );
    TactileSoundEngine.playLedgerSealThud();
    setLedgerEntries((prev) => [...prev, updated]);
    ZkPersistenceManager.persistLedgerBlock(updated).catch(() => {});
    showToast(
      `Kasaya ${amount.toLocaleString()} ${currency} fon yatırıldı ve SHA-256 bloğu mühürlendi.`,
      'success'
    );
  };

  const handleOffset = async (entryIndex: number) => {
    TactileSoundEngine.playClick();
    const offset = await LedgerHashChain.createCompensatoryOffset(
      ledgerEntries,
      entryIndex,
      'Operator Reversal Request',
      'SIG-CHIEF-AUDITOR'
    );
    if (offset) {
      TactileSoundEngine.playLedgerSealThud();
      setLedgerEntries((prev) => [...prev, offset]);
      ZkPersistenceManager.persistLedgerBlock(offset).catch(() => {});
      showToast(`Compensatory offset block envelope-sealed for Entry #${entryIndex}.`, 'warning');
    }
  };

  return (
    <div
      style={{
        padding: 'var(--sp-8)',
        maxWidth: 1240,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-6)',
      }}
    >
      {/* ── Top Header & Telemetry Strip ────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: 'var(--sp-6)',
          flexWrap: 'wrap',
          gap: 'var(--sp-4)',
        }}
      >
        <div>
          <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
            Multi-Vault Treasury OS // Autonomous Liquidity Control
          </span>
          <h1 className="type-display" style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em' }}>
            Treasury & Cashflow Engine
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (!canFund) {
                showToast('Yetki Yetersiz: Kasayı fonlamak için Yönetici yetkisi gereklidir.', 'warning');
                return;
              }
              setFundModalVaultId(selectedVaultId || 'commercial_reserve');
              setIsFundModalOpen(true);
            }}
            disabled={!canFund}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: canFund ? 1 : 0.5,
              cursor: canFund ? 'pointer' : 'not-allowed',
            }}
            title={canFund ? 'Kasaya Fon / Bakiye Yatır' : 'Yetki Yetersiz: Sadece Yönetici kasayı fonlayabilir'}
          >
            {canFund ? <Coins size={14} /> : <Lock size={14} />}
            Kasaya Fon / Bakiye Yatır
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!canTransact) {
                showToast('Yetki Yetersiz: Stajyer seviyesinde finansal işlem kaydedilemez.', 'warning');
                return;
              }
              setIsAddTxModalOpen(true);
            }}
            disabled={!canTransact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: canTransact ? 1 : 0.5,
              cursor: canTransact ? 'pointer' : 'not-allowed',
            }}
            title={canTransact ? 'Yeni Harcama / Gelir Kaydet' : 'Yetki Yetersiz: Stajyer seviyesinde işlem kaydedilemez'}
          >
            {canTransact ? <Plus size={14} /> : <Lock size={14} />}
            Yeni Harcama / Gelir Kaydet
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handlePurgeAllData}
            disabled={!canPurge}
            title={canPurge ? 'Tüm sahte ve geçmiş işlemleri sil, kasaları sıfırla' : 'Yetki Yetersiz: Sadece Yönetici defteri sıfırlayabilir'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: canPurge ? 'var(--clr-negative)' : 'var(--text-muted)',
              borderColor: canPurge ? 'rgba(255, 75, 75, 0.25)' : 'var(--border-subtle)',
              background: canPurge ? 'rgba(255, 75, 75, 0.05)' : 'transparent',
              opacity: canPurge ? 1 : 0.4,
              cursor: canPurge ? 'pointer' : 'not-allowed',
            }}
          >
            {canPurge ? <Trash2 size={13} /> : <Lock size={13} />}
            Defteri Sıfırla
          </button>
        </div>
      </div>


      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
          <span className="label-overline">Four Sovereign Liquidity Vaults</span>
          <span className="label-mono" style={{ fontSize: '0.62rem' }}>
            {hasPermission('treasury:view_reserves') ? (
              <>TOTAL RESERVES: {telemetry.unreservedLiquidity >= 1000000 ? `$${(telemetry.unreservedLiquidity / 1000000).toFixed(2)}M USD` : `$${telemetry.unreservedLiquidity.toLocaleString()} USD`}</>
            ) : (
              <span style={{ color: 'var(--clr-caution)' }}>🔒 TOTAL RESERVES: $•••,••• (STAJYER KISITLAMASI)</span>
            )}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--sp-4)',
          }}
        >
          {vaults.map((vault) => (
            <LiquidityVaultCard
              key={vault.id}
              vault={vault}
              isSelected={selectedVaultId === vault.id}
              onSelect={(id) => setSelectedVaultId(selectedVaultId === id ? null : id)}
              onFund={(id) => {
                if (canFund) {
                  setFundModalVaultId(id);
                  setIsFundModalOpen(true);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Runway & Burn Telemetry Gauge ───────────────────── */}
      <RunwayTelemetryGauge telemetry={telemetry} />

      {/* ── Chained Double-Entry Hash Ledger Table ──────────── */}
      <ChainedLedgerTable
        entries={ledgerEntries}
        onOffsetEntry={handleOffset}
        onPurgeAll={canPurge ? handlePurgeAllData : undefined}
      />

      {/* ── Real Data Input Modals ──────────────────────────── */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        vaults={vaults}
        defaultVaultId={selectedVaultId}
        onSubmitTransaction={handleApplyTransaction}
      />

      <FundVaultModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        vaults={vaults}
        defaultVaultId={fundModalVaultId}
        onFundVault={handleFundVault}
      />
    </div>
  );
};
