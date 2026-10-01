import React, { useState } from 'react';
import { Calculator, TrendingDown } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const InstitutionalRoi: React.FC = () => {
  const { t } = useLanguage();
  const [headcount, setHeadcount] = useState<number>(45);
  const [computeNodes, setComputeNodes] = useState<number>(12);
  const [legacySaaSIndex, setLegacySaaSIndex] = useState<number>(3); // 1 = Minimal, 2 = Medium, 3 = Heavy Enterprise

  // Calculations
  // Legacy stack cost: Headcount * ($40 Slack + $25 Jira + $20 Notion + $120 ERP/HR per seat/mo) * 12
  const saasPerSeatAnnual = legacySaaSIndex === 1 ? 960 : legacySaaSIndex === 2 ? 1800 : 2760;
  const legacyToolingCost = headcount * saasPerSeatAnnual;
  const legacyCloudComputeCost = computeNodes * 8400; // $700/mo per node managed
  const legacyTotalAnnual = legacyToolingCost + legacyCloudComputeCost;

  // Sovereign-OS Autonomous Stack
  // Self-hosted sovereign node flat licensing + client-side direct cloud
  const sovereignAnnual = Math.round(legacyTotalAnnual * 0.28); // 72% average reduction
  const annualSavings = legacyTotalAnnual - sovereignAnnual;
  const savingsPercent = Math.round((annualSavings / legacyTotalAnnual) * 100);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <section
      style={{
        padding: 'var(--sp-20) var(--sp-8)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-hairline)',
        borderBottom: '1px solid var(--border-hairline)',
      }}
    >
      <div className="container" style={{ maxWidth: 1040 }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--sp-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <Calculator size={14} color="var(--clr-accent)" />
            <span className="label-overline">{t.roi.overline}</span>
          </div>
          <h2 className="type-title" style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em' }}>
            {t.roi.title}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 640 }}>
            {t.roi.subtitle}
          </p>
        </div>

        {/* Matrix Grid: Left Sliders / Right Output */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 'var(--sp-8)',
            alignItems: 'center',
          }}
        >
          {/* Sliders Control Panel */}
          <div
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-6)',
            }}
          >
            {/* Slider 1: Headcount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.roi.headcountLabel}</span>
                <span className="tabular-nums" style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>
                  {headcount} {t.roi.headcountUnits}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={headcount}
                onChange={(e) => {
                  TactileSoundEngine.playClick();
                  setHeadcount(Number(e.target.value));
                }}
                style={{ width: '100%', accentColor: 'var(--clr-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <span>5</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>

            {/* Slider 2: Compute Nodes */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.roi.computeLabel}</span>
                <span className="tabular-nums" style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>
                  {computeNodes} {t.roi.computeUnits}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={64}
                step={2}
                value={computeNodes}
                onChange={(e) => {
                  TactileSoundEngine.playClick();
                  setComputeNodes(Number(e.target.value));
                }}
                style={{ width: '100%', accentColor: 'var(--clr-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <span>2</span>
                <span>32</span>
                <span>64</span>
              </div>
            </div>

            {/* Selector 3: Legacy Tooling Level */}
            <div>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
                {t.roi.saasComplexityLabel}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
                {[
                  { level: 1, label: t.roi.saasOptions[0].split(' ')[0], desc: t.roi.saasOptions[0].split('(')[1]?.replace(')', '') || '$80/mo' },
                  { level: 2, label: t.roi.saasOptions[1].split(' ')[0], desc: t.roi.saasOptions[1].split('(')[1]?.replace(')', '') || '$150/mo' },
                  { level: 3, label: t.roi.saasOptions[2].split(' ')[0], desc: t.roi.saasOptions[2].split('(')[1]?.replace(')', '') || '$230/mo' },
                ].map((tier) => (
                  <button
                    key={tier.level}
                    className={`btn btn-xs ${legacySaaSIndex === tier.level ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      TactileSoundEngine.playClick();
                      setLegacySaaSIndex(tier.level);
                    }}
                    style={{ flexDirection: 'column', padding: '6px 4px', height: 'auto' }}
                  >
                    <span style={{ fontWeight: 600 }}>{tier.label}</span>
                    <span style={{ fontSize: '0.58rem', opacity: 0.8 }}>{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Economic Ledger Output */}
          <div
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-moderate)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-5)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="label-overline">{t.roi.annualSavings}</span>
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--clr-positive-alpha)',
                  border: '1px solid var(--clr-positive)',
                  color: 'var(--clr-positive)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.70rem',
                  fontWeight: 600,
                }}
              >
                -{savingsPercent}% EXPENDITURE
              </div>
            </div>

            <div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  fontWeight: 700,
                  color: 'var(--clr-accent)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {formatCurrency(annualSavings)}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {t.roi.breakdownNote}
              </span>
            </div>

            {/* Detailed Row Breakdown */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                borderTop: '1px solid var(--border-hairline)',
                paddingTop: 'var(--sp-4)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.roi.legacyAnnual}:</span>
                <span style={{ color: 'var(--clr-negative)' }}>{formatCurrency(legacyTotalAnnual)} / yr</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.roi.sovereignAnnual}:</span>
                <span style={{ color: 'var(--clr-positive)' }}>{formatCurrency(sovereignAnnual)} / yr</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.roi.annualSavings}:</span>
                <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>{formatCurrency(annualSavings)} / yr</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              <TrendingDown size={14} color="var(--clr-positive)" />
              {t.roi.auditBadge}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
