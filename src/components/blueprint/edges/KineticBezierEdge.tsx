import React from 'react';
import type { KineticBezierEdgeData } from '../../../types';

interface KineticBezierEdgeProps {
  edge: KineticBezierEdgeData;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isSelected?: boolean;
  onClick?: (edgeId: string) => void;
}

export const KineticBezierEdge: React.FC<KineticBezierEdgeProps> = ({
  edge,
  sourceX,
  sourceY,
  targetX,
  targetY,
  isSelected = false,
  onClick,
}) => {
  // Compute cubic Bezier control points
  const dx = Math.abs(targetX - sourceX) * 0.5;
  const cp1x = sourceX + Math.max(50, dx);
  const cp1y = sourceY;
  const cp2x = targetX - Math.max(50, dx);
  const cp2y = targetY;

  const pathD = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;

  const activeColor = isSelected ? '#00d4ff' : 'var(--clr-accent)';
  const strokeWidth = isSelected ? 2.5 : 1.5;

  return (
    <g
      className="kinetic-bezier-edge"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={() => onClick?.(edge.id)}
    >
      {/* Invisible wide hit area for easier clicking */}
      {onClick && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          style={{ cursor: 'pointer' }}
        />
      )}

      {/* Background shadow line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--bg-primary)"
        strokeWidth={isSelected ? 5 : 4}
      />

      {/* Selection glow */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#00d4ff"
          strokeWidth={5}
          strokeOpacity={0.2}
          filter="url(#glow-filter)"
        />
      )}

      {/* Main spine */}
      <path
        d={pathD}
        fill="none"
        stroke={activeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={edge.isActive ? '5 3' : 'none'}
        strokeOpacity={edge.isActive ? 1 : 0.4}
      />

      {/* Kinetic particle flow — active throughput animation */}
      {edge.isActive && (
        <circle r={isSelected ? 4 : 3} fill={activeColor} opacity={0.9}>
          <animateMotion
            path={pathD}
            dur={`${Math.max(0.8, 3.5 / (edge.particleVelocity || 1))}s`}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Terminus dot at target */}
      <circle
        cx={targetX}
        cy={targetY}
        r={isSelected ? 4 : 3}
        fill={activeColor}
        opacity={0.6}
      />
    </g>
  );
};
