import React from 'react';

/* ── GlassCard removed — manifesto bans glassmorphism ──────
   Replaced with precise surface system from index.css.
   This file now exports two precise, structural card variants.
   ──────────────────────────────────────────────────────────── */

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padded?: boolean;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
  id?: string;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children, style, padded = true, onClick, as: Tag = 'div', id,
}) => (
  <Tag
    id={id}
    onClick={onClick}
    style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: padded ? 'var(--sp-6)' : undefined,
      display: 'flex',
      flexDirection: 'column',
      cursor: onClick ? 'pointer' : undefined,
      transition: onClick
        ? 'border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)'
        : undefined,
      ...style,
    }}
    {...(onClick ? {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-moderate)';
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
      },
    } : {})}
  >
    {children}
  </Tag>
);

/* ── MetricCard — pure data display ─────────────────────── */
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;   /* functional color — signal only */
  icon?: React.ReactNode;
  trend?: number;
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, sub, color, icon, trend, id,
}) => (
  <div
    id={id}
    style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--sp-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-3)',
      /* Fixed aspect preserved via min-height — zero CLS */
      minHeight: 120,
    }}
  >
    {/* Label row */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className="label-overline">{label}</span>
      {icon && (
        <span style={{ color: color ?? 'var(--text-muted)', opacity: 0.7 }}>
          {icon}
        </span>
      )}
    </div>

    {/* Primary value */}
    <div style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      fontSize: 'var(--text-2xl)',
      letterSpacing: '-0.02em',
      color: color ?? 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1,
    }}>
      {value}
    </div>

    {/* Sub-line */}
    {(sub !== undefined || trend !== undefined) && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 'auto' }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: trend >= 0 ? 'var(--clr-positive)' : 'var(--clr-negative)',
          }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
        {sub && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{sub}</span>
        )}
      </div>
    )}
  </div>
);

/* Legacy export alias for build compatibility */
export const GlassCard = SurfaceCard;
