import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CornerDownRight, CheckCircle2, Trash2 } from 'lucide-react';
import { LedgerHashChain } from '../../services/crypto/LedgerHashChain';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { ChainedLedgerEntry } from '../../types';

export const ChainedLedgerTable: React.FC<{
  entries: ChainedLedgerEntry[];
  onOffsetEntry?: (index: number) => void;
  onPurgeAll?: () => void;
}> = ({ entries, onOffsetEntry, onPurgeAll }) => {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    count: number;
    headHash: string;
  } | null>(null);

  const handleVerifyChain = async () => {
    TactileSoundEngine.playClick();
    setVerifying(true);
    const res = await LedgerHashChain.verifyChain(entries);
    setVerifying(false);
    setVerificationResult({
      verified: res.isValid,
      count: res.verifiedEntriesCount,
      headHash: res.headHash,
    });
    if (res.isValid) {
      TactileSoundEngine.playLedgerSealThud();
      showToast(`Double-entry ledger verified. All ${res.verifiedEntriesCount} chained hashes valid.`, 'success');
    } else {
      showToast(`CHAIN TAMPER DETECTED at block #${res.brokenAtBlock}!`, 'error');
    }
  };

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          padding: 'var(--sp-4) var(--sp-6)',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--sp-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <ShieldCheck size={16} color="var(--clr-accent)" />
            <h3 className="type-title" style={{ fontSize: 'var(--text-md)' }}>
              Chained Double-Entry Hash Ledger
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginTop: 2,
              display: 'block',
            }}
          >
            Hash_n = SHA-256(Hash_n-1 + VaultID + Amount + Timestamp)
          </span>
        </div>

        {/* Verification Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {verificationResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--clr-positive)', fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 size={13} />
              <span>{verificationResult.count} BLOCKS VALID</span>
            </div>
          )}

          <button
            className="btn btn-secondary btn-xs"
            onClick={handleVerifyChain}
            disabled={verifying}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={12} className={verifying ? 'anim-spin' : ''} />
            {verifying ? 'Auditing Math Chain...' : 'Verify Full Hash Chain'}
          </button>

          {onPurgeAll && entries.length > 0 && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={onPurgeAll}
              title="Tüm sahte ve geçmiş işlemleri sil"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--clr-negative)',
                borderColor: 'rgba(255, 75, 75, 0.25)',
              }}
            >
              <Trash2 size={11} />
              Defteri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Table Viewport */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-xs)' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-hairline)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.64rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <th style={{ padding: '8px 16px' }}>Block #</th>
              <th style={{ padding: '8px 16px' }}>Vault ID</th>
              <th style={{ padding: '8px 16px' }}>Transaction</th>
              <th style={{ padding: '8px 16px' }}>Amount</th>
              <th style={{ padding: '8px 16px' }}>Previous Hash (n-1)</th>
              <th style={{ padding: '8px 16px' }}>Chained SHA-256 Hash</th>
              <th style={{ padding: '8px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  HENÜZ ZİNCİRLENMİŞ İŞLEM KAYDI BULUNMUYOR — YENİ İŞLEM EKLEYEREK BAŞLAYABİLİRSİNİZ
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
              const isCredit = entry.type === 'CREDIT';
              return (
                <tr
                  key={entry.index}
                  className="interactive"
                  style={{
                    borderBottom: '1px solid var(--border-hairline)',
                    background: entry.isOffsetting ? 'var(--clr-caution-alpha)' : 'transparent',
                  }}
                >
                  {/* Block Index */}
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>
                    #{entry.index.toString().padStart(4, '0')}
                  </td>

                  {/* Vault ID */}
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {entry.vaultId}
                  </td>

                  {/* Description & Signatory */}
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{entry.description}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      SIG: {entry.signatory}
                    </div>
                  </td>

                  {/* Amount */}
                  <td
                    className="tabular-nums"
                    style={{
                      padding: '10px 16px',
                      fontWeight: 600,
                      color: isCredit ? 'var(--clr-positive)' : 'var(--clr-negative)',
                    }}
                  >
                    {isCredit ? '+' : '-'}${entry.amount.toLocaleString()} {entry.currency}
                  </td>

                  {/* Previous Hash */}
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {entry.prevHash.slice(0, 10)}...{entry.prevHash.slice(-6)}
                  </td>

                  {/* Chained Hash */}
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--clr-accent)' }}>
                    {entry.hash.slice(0, 12)}...{entry.hash.slice(-8)}
                  </td>

                  {/* Compensatory Offset Action */}
                  <td style={{ padding: '10px 16px' }}>
                    {!entry.isOffsetting && onOffsetEntry && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          TactileSoundEngine.playClick();
                          onOffsetEntry(entry.index);
                        }}
                        title="Create immutable compensatory offset transaction"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px' }}
                      >
                        <CornerDownRight size={11} />
                        Offset
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
