import React from 'react';
import { Compass } from 'lucide-react';
import type { RunwayTelemetry } from '../../types';

export const RunwayTelemetryGauge: React.FC<{
  telemetry: RunwayTelemetry;
}> = ({ telemetry }) => {
  const maxMonths = 36;
  const progressRatio = Math.min(1, telemetry.survivalMonths / maxMonths);

  return (
    <div
      style={{
        padding: 'var(--sp-6)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-4)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Compass size={16} color="var(--clr-accent)" />
          <span className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
            Runway & Burn Telemetry Radar
          </span>
        </div>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--clr-positive-alpha)',
            border: '1px solid var(--clr-positive)',
            color: 'var(--clr-positive)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.64rem',
            fontWeight: 600,
          }}
        >
          {telemetry.runwayHealth} STATUS
        </div>
      </div>

      {/* Main Metric Output */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <div
          className="tabular-nums"
          style={{
            fontSize: 'clamp(2.2rem, 3vw, 2.8rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {telemetry.survivalMonths.toFixed(1)}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Months Operational Survival (90-Day Rolling Burn)
        </div>
      </div>

      {/* Radar Progress Gauge */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>0 MO</span>
          <span>12 MO (BUFFER)</span>
          <span>24 MO (STANDARD)</span>
          <span>36+ MO (SOVEREIGN)</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              width: `${progressRatio * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--clr-caution) 0%, var(--clr-positive) 100%)',
              transition: 'width var(--dur-slow) var(--ease-out)',
            }}
          />
        </div>
      </div>

      {/* Telemetry Numbers Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--sp-3)',
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 'var(--sp-4)',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>UNRESERVED LIQUIDITY</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
            ${(telemetry.unreservedLiquidity / 1000000).toFixed(2)}M USD
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>DAILY OPERATIONAL BURN</div>
          <div style={{ color: 'var(--clr-caution)', fontWeight: 600, marginTop: 2 }}>
            ${telemetry.burnRatePerDay.toLocaleString()} / day
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>ROLLING 90D EXPENDITURE</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
            ${(telemetry.rolling90DayExpenditure / 1000).toFixed(0)}k USD
          </div>
        </div>
      </div>
    </div>
  );
};
