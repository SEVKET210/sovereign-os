import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore, type CanvasNode, type CanvasViewport, type PermissionLevel } from './useCanvasState';
import { useAudio } from '../audio/useAudio';

// ── Precision Color System — Braun/Instrument palette ────
// No neon. Node types distinguished by border weight + accent only.
const NODE_COLORS: Record<string, { bg: string; border: string; header: string; accent: string }> = {
  process:   { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#4a90d9' },
  crypto:    { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#428be1' },
  ledger:    { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#34a87a' },
  condition: { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#d29432' },
  output:    { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#c84040' },
  input:     { bg: '#0d1117', border: '#2d3748', header: '#1a202c', accent: '#7c7cce' },
};

// Edge colors — muted, functional distinction
const EDGE_COLORS: Record<string, string> = {
  exec:   '#d29432',  // caution — control flow
  data:   '#4a90d9',  // accent — data
  crypto: '#428be1',  // accent-bright — crypto
  ledger: '#34a87a',  // positive — ledger
};

const LEVEL_ALPHA: Record<PermissionLevel, number> = { 1: 1.0, 2: 1.0, 3: 0.45, 4: 0.18 };

const PORT_RADIUS = 7;
const HEADER_HEIGHT = 28;
const GRID_SIZE = 28;

type Point = { x: number; y: number };

function screenToWorld(p: Point, vp: CanvasViewport): Point {
  return { x: (p.x - vp.x) / vp.scale, y: (p.y - vp.y) / vp.scale };
}

function getPortWorldPos(node: CanvasNode, portId: string): Point {
  const port = node.ports.find((p) => p.id === portId);
  if (!port) return { x: node.x, y: node.y };
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (port.side) {
    case 'left':   return { x: node.x, y: cy };
    case 'right':  return { x: node.x + node.width, y: cy };
    case 'top':    return { x: cx, y: node.y };
    case 'bottom': return { x: cx, y: node.y + node.height };
    default:       return { x: cx, y: cy };
  }
}



export const BlueprintCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport, selectedNodeId, draggingEdge, userPermissionLevel,
          updateNode, selectNode, setViewport, addEdge, setDraggingEdge } = useCanvasStore();
  const { nodeConnect } = useAudio();

  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const vpStart = useRef<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const dragNode = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [mouseWorld, setMouseWorld] = useState<Point>({ x: 0, y: 0 });

  // ── Draw ──────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#060b18';
    ctx.fillRect(0, 0, width, height);

    // Dot grid
    ctx.save();
    const gridStep = GRID_SIZE * viewport.scale;
    const offsetX = ((viewport.x % gridStep) + gridStep) % gridStep;
    const offsetY = ((viewport.y % gridStep) + gridStep) % gridStep;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = offsetX; x < width; x += gridStep) {
      for (let y = offsetY; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.scale, viewport.scale);

    // ── Draw edges ──────────────────────────────────────────
    for (const edge of edges) {
      const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
      const toNode   = nodes.find((n) => n.id === edge.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromPos = getPortWorldPos(fromNode, edge.fromPortId);
      const toPos   = getPortWorldPos(toNode, edge.toPortId);

      const alpha = Math.min(
        LEVEL_ALPHA[userPermissionLevel >= fromNode.level ? userPermissionLevel : 1],
        LEVEL_ALPHA[userPermissionLevel >= toNode.level   ? userPermissionLevel : 1]
      );

      const color = EDGE_COLORS[edge.type] ?? '#fff';

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      const dx = Math.abs(toPos.x - fromPos.x) * 0.6;
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.bezierCurveTo(fromPos.x + dx, fromPos.y, toPos.x - dx, toPos.y, toPos.x, toPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Arrow tip
      const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
      ctx.translate(toPos.x, toPos.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.restore();
    }

    // ── Dragging edge preview ────────────────────────────────
    if (draggingEdge) {
      const fromNode = nodes.find((n) => n.id === draggingEdge.fromNodeId);
      if (fromNode) {
        const fromPos = getPortWorldPos(fromNode, draggingEdge.fromPortId);
        ctx.save();
        ctx.beginPath();
        const dx = Math.abs(draggingEdge.toX - fromPos.x) * 0.5;
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.bezierCurveTo(fromPos.x + dx, fromPos.y, draggingEdge.toX - dx, draggingEdge.toY, draggingEdge.toX, draggingEdge.toY);
        ctx.strokeStyle = 'rgba(0,210,255,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Draw nodes ──────────────────────────────────────────
    for (const node of nodes) {
      const culled = userPermissionLevel < node.level;
      const alpha = culled ? LEVEL_ALPHA[(4 - node.level + 1) as PermissionLevel] ?? 0.15 : 1;
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      const colors = NODE_COLORS[node.type] ?? NODE_COLORS.process;
      const isSelected = node.selected;
      const r = 8; // border radius

      // Shadow / glow
      if (isSelected) {
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = 20;
      }

      // Body
      ctx.beginPath();
      roundRect(ctx, node.x, node.y, node.width, node.height, r);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.strokeStyle = isSelected ? colors.border : `${colors.border}80`;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Header
      ctx.beginPath();
      roundRectTop(ctx, node.x, node.y, node.width, HEADER_HEIGHT, r);
      ctx.fillStyle = colors.header;
      ctx.fill();

      // Level badge
      const lvlText = `L${node.level}`;
      ctx.font = `500 10px "JetBrains Mono", monospace`;
      ctx.fillStyle = colors.border;
      ctx.textAlign = 'right';
      ctx.fillText(lvlText, node.x + node.width - 8, node.y + 18);

      // Node label
      ctx.font = `600 11px "Inter", sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(node.label, node.x + 10, node.y + 18);

      // Ports
      for (const port of node.ports) {
        const pos = getPortWorldPos(node, port.id);
        const pColor = EDGE_COLORS[port.type] ?? '#fff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, PORT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = port.connected ? pColor : '#1e293b';
        ctx.strokeStyle = pColor;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Port label
        ctx.font = `400 9px "Inter", sans-serif`;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = port.side === 'right' ? 'right' : 'left';
        const labelX = port.side === 'right' ? pos.x - 12 : pos.x + 12;
        ctx.fillText(port.label, labelX, pos.y + 3);
      }

      ctx.restore();
    }

    ctx.restore();

    // ── Minimap ────────────────────────────────────────────
    drawMinimap(ctx, width, height, nodes, viewport, userPermissionLevel);
  }, [nodes, edges, viewport, selectedNodeId, draggingEdge, userPermissionLevel, mouseWorld]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    ro.observe(canvas);
    draw();
    return () => ro.disconnect();
  }, [draw]);

  // ── Pointer events ────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const screen: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = screenToWorld(screen, viewport);

    // Check port hit (for edge drawing)
    for (const node of nodes) {
      if (userPermissionLevel < node.level) continue;
      for (const port of node.ports) {
        if (port.side !== 'right' && port.side !== 'bottom') continue;
        const pos = getPortWorldPos(node, port.id);
        const dx = pos.x - world.x, dy = pos.y - world.y;
        if (Math.sqrt(dx * dx + dy * dy) < PORT_RADIUS + 4) {
          setDraggingEdge({ fromNodeId: node.id, fromPortId: port.id, toX: world.x, toY: world.y });
          return;
        }
      }
    }

    // Check node hit
    const hitNode = [...nodes].reverse().find(
      (n) => world.x >= n.x && world.x <= n.x + n.width && world.y >= n.y && world.y <= n.y + n.height
    );

    if (hitNode) {
      selectNode(hitNode.id);
      dragNode.current = { id: hitNode.id, ox: world.x - hitNode.x, oy: world.y - hitNode.y };
    } else {
      selectNode(null);
      isPanning.current = true;
      canvas.style.cursor = 'grabbing';
      panStart.current = screen;
      vpStart.current = { ...viewport };
    }
    canvas.setPointerCapture(e.pointerId);
  }, [nodes, viewport, userPermissionLevel, selectNode, setDraggingEdge]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const screen: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = screenToWorld(screen, viewport);
    setMouseWorld(world);

    if (draggingEdge) {
      setDraggingEdge({ ...draggingEdge, toX: world.x, toY: world.y });
      return;
    }

    if (dragNode.current) {
      updateNode(dragNode.current.id, {
        x: world.x - dragNode.current.ox,
        y: world.y - dragNode.current.oy,
      });
      return;
    }

    if (isPanning.current) {
      const dx = screen.x - panStart.current.x;
      const dy = screen.y - panStart.current.y;
      setViewport({ x: vpStart.current.x + dx, y: vpStart.current.y + dy });
    }
  }, [viewport, draggingEdge, updateNode, setViewport, setDraggingEdge]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const screen: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = screenToWorld(screen, viewport);

    if (draggingEdge) {
      // Check target port
      for (const node of nodes) {
        if (userPermissionLevel < node.level) continue;
        for (const port of node.ports) {
          if (port.side !== 'left' && port.side !== 'top') continue;
          const pos = getPortWorldPos(node, port.id);
          const dx = pos.x - world.x, dy = pos.y - world.y;
          if (Math.sqrt(dx * dx + dy * dy) < PORT_RADIUS + 6) {
            addEdge({
              id: `e${Date.now()}`,
              fromNodeId: draggingEdge.fromNodeId,
              fromPortId: draggingEdge.fromPortId,
              toNodeId: node.id,
              toPortId: port.id,
              type: 'data',
            });
            nodeConnect();
            break;
          }
        }
      }
      setDraggingEdge(null);
    }

    dragNode.current = null;
    isPanning.current = false;
    canvas.style.cursor = 'crosshair';
  }, [viewport, nodes, draggingEdge, userPermissionLevel, addEdge, nodeConnect, setDraggingEdge]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.15, Math.min(3, viewport.scale * delta));
    const factor = newScale / viewport.scale;
    setViewport({
      scale: newScale,
      x: mx - (mx - viewport.x) * factor,
      y: my - (my - viewport.y) * factor,
    });
  }, [viewport, setViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    />
  );
};

// ── Canvas helpers ────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  nodes: CanvasNode[],
  vp: CanvasViewport,
  userLevel: PermissionLevel
) {
  const MAP_W = 180, MAP_H = 120, PAD = 16;
  const mx = cw - MAP_W - PAD;
  const my = ch - MAP_H - PAD;

  ctx.save();
  ctx.fillStyle = 'rgba(6,11,24,0.85)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, mx, my, MAP_W, MAP_H, 8);
  ctx.fill();
  ctx.stroke();

  // Compute world bounds
  const xs = nodes.map((n) => [n.x, n.x + n.width]).flat();
  const ys = nodes.map((n) => [n.y, n.y + n.height]).flat();
  if (xs.length === 0) { ctx.restore(); return; }
  const minX = Math.min(...xs) - 40, maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40, maxY = Math.max(...ys) + 40;
  const scaleX = MAP_W / (maxX - minX);
  const scaleY = MAP_H / (maxY - minY);
  const s = Math.min(scaleX, scaleY) * 0.85;

  for (const node of nodes) {
    if (userLevel < node.level) continue;
    const colors = NODE_COLORS[node.type] ?? NODE_COLORS.process;
    const px = mx + (node.x - minX) * s + (MAP_W - (maxX - minX) * s) / 2;
    const py = my + (node.y - minY) * s + (MAP_H - (maxY - minY) * s) / 2;
    ctx.fillStyle = colors.border;
    ctx.fillRect(px, py, Math.max(node.width * s, 4), Math.max(node.height * s, 4));
  }

  // Viewport rect
  const vpW = (cw / vp.scale) * s;
  const vpH = (ch / vp.scale) * s;
  const vpX = mx + (-vp.x / vp.scale - minX) * s + (MAP_W - (maxX - minX) * s) / 2;
  const vpY = my + (-vp.y / vp.scale - minY) * s + (MAP_H - (maxY - minY) * s) / 2;
  ctx.strokeStyle = 'rgba(0,210,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vpX, vpY, vpW, vpH);

  ctx.restore();
}
