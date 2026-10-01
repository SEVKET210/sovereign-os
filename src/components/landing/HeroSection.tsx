import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Cpu, Layers } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const HeroSection: React.FC<{
  onOpenHardwareDrawer: () => void;
}> = ({ onOpenHardwareDrawer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetX = -9999;
    let targetY = -9999;
    let currX = -9999;
    let currY = -9999;
    let animId: number | null = null;
    let isRunning = false;

    const SPACING = 42;
    const INFLUENCE = 110;

    const drawFrame = (mx: number, my: number) => {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const cols = Math.min(60, Math.ceil(w / SPACING) + 1);
      const rows = Math.min(35, Math.ceil(h / SPACING) + 1);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Batch horizontal grid lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let x = c * SPACING;
          let y = r * SPACING;

          if (mx > -1000) {
            const dx = x - mx;
            const dy = y - my;
            const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
            if (dist < INFLUENCE) {
              const pull = (1 - dist / INFLUENCE) * 10;
              x += (dx / dist) * pull;
              y += (dy / dist) * pull;
            }
          }

          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      // Batch vertical grid lines
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          let x = c * SPACING;
          let y = r * SPACING;

          if (mx > -1000) {
            const dx = x - mx;
            const dy = y - my;
            const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
            if (dist < INFLUENCE) {
              const pull = (1 - dist / INFLUENCE) * 10;
              x += (dx / dist) * pull;
              y += (dy / dist) * pull;
            }
          }

          if (r === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      // Single stroke call for entire mesh
      ctx.stroke();
    };

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = Math.min(1920, rect?.width || window.innerWidth);
      canvas.height = Math.min(1080, rect?.height || window.innerHeight);
      drawFrame(currX, currY);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const animLoop = () => {
      const dx = targetX - currX;
      const dy = targetY - currY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        currX += dx * 0.18;
        currY += dy * 0.18;
        drawFrame(currX, currY);
        animId = requestAnimationFrame(animLoop);
      } else {
        currX = targetX;
        currY = targetY;
        drawFrame(currX, currY);
        isRunning = false;
        animId = null;
      }
    };

    const wakeAnimation = () => {
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(animLoop);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      wakeAnimation();
    };

    const handleMouseLeave = () => {
      targetX = -9999;
      targetY = -9999;
      wakeAnimation();
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    // Initial resting draw
    drawFrame(-9999, -9999);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, []);

  const handleLaunchSandbox = () => {
    TactileSoundEngine.playClick();
    navigate('/auth');
  };

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        padding: 'var(--sp-24) var(--sp-8) var(--sp-16)',
        overflow: 'hidden',
      }}
    >
      {/* ── Interactive Coordinate Mesh Canvas ─────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Focus Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 70% 80% at 30% 50%, var(--bg-primary) 25%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Hero Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 780,
        }}
      >
        {/* Environmental Seal Line */}
        <div
          className={mounted ? 'anim-enter-fade' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            marginBottom: 'var(--sp-6)',
          }}
        >
          <div
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Shield size={11} color="var(--clr-accent)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.06em',
              }}
            >
              {t.hero.enclaveBadge}
            </span>
          </div>
        </div>

        {/* Surgical Bold Headline */}
        <h1
          className={`type-display ${mounted ? 'anim-enter-up stagger-1' : ''}`}
          style={{
            fontSize: 'clamp(2.4rem, 4.8vw, 4.4rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.06,
            marginBottom: 'var(--sp-6)',
          }}
        >
          {t.hero.titleMain}{' '}
          <span
            className="type-editorial"
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {t.hero.titleAccent}
          </span>
        </h1>

        {/* Editorial Subhead */}
        <p
          className={`type-body ${mounted ? 'anim-enter-up stagger-2' : ''}`}
          style={{
            fontSize: 'var(--text-lg)',
            maxWidth: 620,
            marginBottom: 'var(--sp-8)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {t.hero.subtitle}
        </p>

        {/* Dual Actions */}
        <div
          className={mounted ? 'anim-enter-up stagger-3' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Primary Action */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleLaunchSandbox}
            id="launch-sandbox-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
          >
            {t.hero.launchSandbox}
            <ArrowRight size={16} strokeWidth={2} />
          </button>

          {/* Secondary Action */}
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => { TactileSoundEngine.playClick(); onOpenHardwareDrawer(); }}
            id="hardware-security-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px' }}
          >
            <Cpu size={15} />
            {t.hero.hardwareSecurity}
          </button>
        </div>

        {/* Verification badges */}
        <div
          className={mounted ? 'anim-enter-up stagger-4' : ''}
          style={{
            marginTop: 'var(--sp-10)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-6)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} color="var(--clr-accent)" />
            <span>{t.hero.badgeCluster}</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} color="var(--clr-positive)" />
            <span>{t.hero.badgeByos}</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />
          <span>{t.hero.badgeFips}</span>
        </div>
      </div>
    </section>
  );
};
