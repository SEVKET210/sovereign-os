import React, { useEffect, useRef, useState } from 'react';

interface ForensicWatermarkProps {
  operatorAlias?: string;
  clearanceTier?: string;
  workspaceHash?: string;
}

export const ForensicWatermark: React.FC<ForensicWatermarkProps> = ({
  operatorAlias = 'OPERATOR_00',
  clearanceTier = 'LEVEL_4',
  workspaceHash = '0x8f4cd19a...3b7a',
}) => {
  // Disabled by default to keep the background clean and avoid distracting moving text.
  // Can be enabled via localStorage.setItem('sov_enable_forensic_watermark', 'true')
  const isExplicitlyEnabled =
    typeof window !== 'undefined' &&
    window.localStorage &&
    localStorage.getItem('sov_enable_forensic_watermark') === 'true';

  const [timestamp, setTimestamp] = useState<string>('');
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Update UTC timestamp every second
  useEffect(() => {
    if (!isExplicitlyEnabled) return;

    const updateTime = () => {
      const now = new Date();
      setTimestamp(now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isExplicitlyEnabled]);

  // Subtle sinusoidal drift across viewport to prevent static pixel subtraction
  useEffect(() => {
    if (!isExplicitlyEnabled) return;

    let start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const x = Math.sin(elapsed / 2600) * 16;
      const y = Math.cos(elapsed / 2100) * 12;
      setOffset({ x, y });
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isExplicitlyEnabled]);

  if (!isExplicitlyEnabled) {
    return null;
  }

  const watermarkText = `${operatorAlias} • ${clearanceTier} • ${workspaceHash} • ${timestamp}`;

  // Generate grid of repeated watermark labels
  const rows = 14;
  const cols = 6;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: -100, // Extend beyond bounds to handle drift
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        opacity: 0.038, // 3.8% opacity: invisible to normal workflow, reveals on camera captures
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(-18deg)`,
        willChange: 'transform',
      }}
    >
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={`wm_row_${rIdx}`}
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            whiteSpace: 'nowrap',
            gap: 60,
          }}
        >
          {Array.from({ length: cols }).map((_, cIdx) => (
            <span
              key={`wm_cell_${rIdx}_${cIdx}`}
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
