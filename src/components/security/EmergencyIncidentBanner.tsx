/* ============================================================
   SOVEREIGN-OS — Authoritative Emergency Threat Incident Banner
   Mounted beneath LiveMarketTicker in document flow upon Critical
   or Catastrophic operational invariant breach.
   Pulsing amber/crimson aesthetic + operator audit acknowledgment
   ============================================================ */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  VolumeX,
  Volume2,
  CheckCircle2,
  Sliders,
  Radio,
} from 'lucide-react';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export const EmergencyIncidentBanner: React.FC = () => {
  const incidents = useIncidentStore((state) => state.incidents);
  const isAlarmPlaying = useIncidentStore((state) => state.isAlarmPlaying);
  const acknowledgeIncident = useIncidentStore((state) => state.acknowledgeIncident);
  const silenceAlarm = useIncidentStore((state) => state.silenceAlarm);
  const openCockpit = useIncidentStore((state) => state.openCockpit);

  const [operatorAlias, setOperatorAlias] = useState('');
  const [showSignPrompt, setShowSignPrompt] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Active unacknowledged critical/catastrophic non-duress incidents
  const criticalIncidents = incidents.filter(
    (i) =>
      (i.severity === 'CRITICAL' || i.severity === 'CATASTROPHIC') &&
      i.status === 'ACTIVE' &&
      !i.isDuress
  );

  const activeIncident = criticalIncidents[0];

  useEffect(() => {
    if (!activeIncident) {
      setElapsedSec(0);
      return;
    }

    const start = new Date(activeIncident.timestamp).getTime();
    const updateElapsed = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeIncident]);

  if (!activeIncident) return null;

  const isCatastrophic = activeIncident.severity === 'CATASTROPHIC';
  const pulseColor = isCatastrophic ? 'var(--clr-negative, #f43f5e)' : 'var(--clr-caution, #f59e0b)';
  const pulseBg = isCatastrophic ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const borderColor = isCatastrophic ? 'rgba(244, 63, 94, 0.6)' : 'rgba(245, 158, 11, 0.6)';

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAcknowledgeClick = () => {
    TactileSoundEngine.playClick();
    setShowSignPrompt(true);
  };

  const handleConfirmAcknowledgment = async () => {
    const signatory = operatorAlias.trim() || 'LEAD_OPERATOR_01';
    await acknowledgeIncident(activeIncident.id, signatory);
    setShowSignPrompt(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 40,
        width: '100%',
        background: isCatastrophic ? '#0d0406' : '#0e0b04',
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: `0 4px 20px ${pulseBg}, inset 0 0 12px ${pulseBg}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        userSelect: 'none',
        animation: 'pulseGlow 2.5s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 2px 14px ${pulseBg}, inset 0 0 8px ${pulseBg}; }
          50% { box-shadow: 0 4px 28px ${pulseColor}44, inset 0 0 16px ${pulseColor}33; }
        }
        @keyframes radarBeacon {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>

      {/* Left: Incident Identity & Radar Beacon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            background: pulseBg,
            border: `1px solid ${borderColor}`,
            animation: 'radarBeacon 1.2s ease-in-out infinite',
            flexShrink: 0,
          }}
        >
          {isCatastrophic ? (
            <ShieldAlert size={16} color={pulseColor} />
          ) : (
            <AlertTriangle size={16} color={pulseColor} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 3,
              background: pulseColor,
              color: '#000000',
              letterSpacing: '0.04em',
            }}
          >
            {activeIncident.severity}
          </span>

          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            [{activeIncident.source}]
          </span>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.01em',
            }}
          >
            {activeIncident.sanitizedTitle}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: pulseColor,
            }}
          >
            <Radio size={11} />
            <span>T+{formatElapsed(elapsedSec)}</span>
          </div>
        </div>
      </div>

      {/* Right: Operational Controls & Audit Signatory Prompt */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {showSignPrompt ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-secondary)',
              padding: '2px 6px',
              borderRadius: 4,
              border: `1px solid ${borderColor}`,
            }}
          >
            <input
              type="text"
              placeholder="Signatory Alias (e.g. founder)"
              value={operatorAlias}
              onChange={(e) => setOperatorAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAcknowledgment();
                if (e.key === 'Escape') setShowSignPrompt(false);
              }}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                width: 140,
              }}
            />
            <button
              className="btn btn-xs btn-primary"
              onClick={handleConfirmAcknowledgment}
              style={{
                fontSize: '0.62rem',
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <CheckCircle2 size={11} />
              Commit
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setShowSignPrompt(false)}
              style={{ fontSize: '0.62rem', padding: '2px 4px' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="btn btn-xs"
            onClick={handleAcknowledgeClick}
            style={{
              background: pulseColor,
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.66rem',
              padding: '4px 10px',
              border: 'none',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: `0 0 10px ${pulseColor}66`,
              cursor: 'pointer',
            }}
            title="Silence seismic alarm and seal audit acknowledgment to double-entry ledger"
          >
            <CheckCircle2 size={12} />
            Acknowledge Incident
          </button>
        )}

        {/* Audio Alarm Mute Toggle */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            if (isAlarmPlaying) {
              silenceAlarm();
            } else {
              TactileSoundEngine.startEmergencySeismicAlarm();
            }
          }}
          style={{
            padding: '4px 6px',
            color: isAlarmPlaying ? pulseColor : 'var(--text-muted)',
          }}
          title={isAlarmPlaying ? 'Silence Seismic Alarm Audio' : 'Alarm Silenced'}
        >
          {isAlarmPlaying ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>

        {/* Open Governance Cockpit */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => openCockpit('incidents')}
          style={{
            padding: '4px 6px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.65rem',
          }}
          title="Open Emergency Governance & Escalation Cockpit"
        >
          <Sliders size={12} />
          Cockpit
        </button>

        {criticalIncidents.length > 1 && (
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 5px',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
            }}
          >
            +{criticalIncidents.length - 1} MORE
          </span>
        )}
      </div>
    </div>
  );
};
