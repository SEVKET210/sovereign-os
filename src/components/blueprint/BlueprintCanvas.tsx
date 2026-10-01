import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  Plus,
  Lock,
  GitBranch,
  Kanban as KanbanIcon,
  Trash2,
  Magnet,
} from 'lucide-react';
import { TaskNode } from './nodes/TaskNode';
import { VaultFileNode } from './nodes/VaultFileNode';
import { BudgetNode } from './nodes/BudgetNode';
import { NarrativeNode } from './nodes/NarrativeNode';
import { KineticBezierEdge } from './edges/KineticBezierEdge';
import { CanvasContextMenu } from './CanvasContextMenu';
import { NodeWorkspaceDrawer } from './NodeWorkspaceDrawer';
import { CreateNodeModal } from './CreateNodeModal';
import { RamFilePreviewModal } from '../vault/RamFilePreviewModal';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { ThreatDetectionEngine } from '../../services/security/ThreatDetectionEngine';
import { DependencyLockEngine } from '../../services/blueprint/DependencyLockEngine';
import { showToast } from '../Toast';
import { useBlueprintStore, getNodeDimensions } from '../../stores/useBlueprintStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { isNodeVisibleToUser } from '../../utils/rbacFilter';
import type {
  ClearanceLevel,
  BlueprintNodeType,
  TaskNodeData,
  VaultFileNodeData,
  BudgetNodeData,
  NarrativeNodeData,
  KineticBezierEdgeData,
} from '../../types';

const CLEARANCE_RANKS: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

// Convert screen coords to canvas world coords: (screen - pan) / scale
function screenToWorld(
  screenX: number,
  screenY: number,
  pan: { x: number; y: number },
  scale: number
): { x: number; y: number } {
  return {
    x: (screenX - pan.x) / scale,
    y: (screenY - pan.y) / scale,
  };
}

export const BlueprintCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    activeClearance,
    setActiveClearance,
    selectedNodeId,
    selectedEdgeId,
    setSelectedNodeId,
    setSelectedEdgeId,
    activeDrawerNode,
    setActiveDrawerNode,
    draggingEdge,
    setDraggingEdge,
    contextMenu,
    setContextMenu,
    updateNode,
    updateNodePosition,
    commitSpatialState,
    hydrateSpatialState,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    loadNodes,
  } = useBlueprintStore();

  const { getActiveRole, getActiveClearance, getCurrentAlias, hasPermission } = usePermissionStore();
  const activeRole = getActiveRole();
  const userClearance = getActiveClearance();
  const currentAlias = getCurrentAlias();
  const canCreateNode = hasPermission('blueprint:create');
  const canEditNode = hasPermission('blueprint:edit');
  const canDeleteNode = hasPermission('blueprint:delete');

  const { viewMode, setViewMode } = useKanbanStore();

  // Canvas Pan & Zoom Transform
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1.0);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Magnetic Grid Snapping (16px or 20px)
  const [gridSnap, setGridSnap] = useState(true);
  const [gridSize, setGridSize] = useState<16 | 20>(16);

  // Dynamic node creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalPos, setCreateModalPos] = useState<{ x: number; y: number } | undefined>(undefined);

  // Hardware-accelerated pointer drag state
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null);
  const dragRef = useRef<{
    nodeId: string;
    pointerId: number;
    grabOffsetX: number;
    grabOffsetY: number;
    hasMoved: boolean;
    startPos: { x: number; y: number };
  } | null>(null);

  // Debounced viewport persistence timer
  const viewportCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleViewportCommit = useCallback(
    (newPan: { x: number; y: number }, newScale: number) => {
      if (viewportCommitTimer.current) clearTimeout(viewportCommitTimer.current);
      viewportCommitTimer.current = setTimeout(() => {
        commitSpatialState(
          { pan: newPan, scale: newScale },
          { enabled: gridSnap, size: gridSize }
        ).catch(() => {});
      }, 500);
    },
    [commitSpatialState, gridSnap, gridSize]
  );

  // Hydrate encrypted zero-knowledge layout on mount
  useEffect(() => {
    let isMounted = true;
    hydrateSpatialState().then((layout) => {
      if (isMounted && layout) {
        if (layout.viewport) {
          setPan(layout.viewport.pan);
          setScale(layout.viewport.scale);
        }
        if (layout.gridSnap) {
          setGridSnap(layout.gridSnap.enabled);
          setGridSize(layout.gridSnap.size);
        }
      }
    });
    loadNodes();
    return () => {
      isMounted = false;
      if (viewportCommitTimer.current) clearTimeout(viewportCommitTimer.current);
    };
  }, [hydrateSpatialState, loadNodes]);

  // Autonomous Threat Sentinel: Invariant checks for budget gate ceilings & critical SLA deadlines
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      ThreatDetectionEngine.checkBlueprintBudgetGates(nodes);
      ThreatDetectionEngine.checkTaskSlaDeadlines(nodes);
    }
  }, [nodes]);

  // Active connection pin hover (for drag-to-connect visual feedback)
  const [hoveredPin, setHoveredPin] = useState<{ nodeId: string; side: 'output' | 'input' } | null>(null);

  // Spatial Permission Masking with RBAC
  const currentClearanceRank = CLEARANCE_RANKS[activeClearance];
  const visibleNodes = nodes.filter((n) => {
    const rankOk = CLEARANCE_RANKS[n.clearance] <= currentClearanceRank;
    if (!rankOk) return false;
    return isNodeVisibleToUser(n, activeRole, userClearance, currentAlias);
  });
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) =>
      visibleNodeIds.has(e.sourceId) &&
      visibleNodeIds.has(e.targetId) &&
      CLEARANCE_RANKS[e.clearance] <= currentClearanceRank
  );
  const culledCount = nodes.length - visibleNodes.length;

  // ── Keyboard: Delete / Backspace ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          if (!canDeleteNode) {
            showToast('Yetkisiz işlem: Düğüm silme yetkiniz yok.', 'error');
            return;
          }
          removeNode(selectedNodeId);
        } else if (selectedEdgeId) {
          if (!canEditNode) {
            showToast('Yetkisiz işlem: Bağlantı silme yetkiniz yok.', 'error');
            return;
          }
          removeEdge(selectedEdgeId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setContextMenu(null);
        setDraggingEdge(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, canDeleteNode, canEditNode, removeNode, removeEdge, setSelectedNodeId, setSelectedEdgeId, setContextMenu, setDraggingEdge]);

  // ── Canvas wheel zoom ─────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.001;
      const newScale = Math.min(2.0, Math.max(0.25, scale + zoomDelta));
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = newScale / scale;

      const nextPan = {
        x: mx - (mx - pan.x) * factor,
        y: my - (my - pan.y) * factor,
      };

      setPan(nextPan);
      setScale(newScale);
      scheduleViewportCommit(nextPan, newScale);
    },
    [scale, pan, scheduleViewportCommit]
  );

  // ── Canvas background pan ─────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (
        (e.target as HTMLElement).closest('[data-node]') ||
        (e.target as HTMLElement).closest('[data-pin]')
      ) {
        return;
      }

      setContextMenu(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      if (draggingEdge) {
        setDraggingEdge(null);
        return;
      }

      isPanningRef.current = true;
      if (canvasContainerRef.current) {
        canvasContainerRef.current.style.cursor = 'grabbing';
      }
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [pan, draggingEdge, setContextMenu, setSelectedNodeId, setSelectedEdgeId, setDraggingEdge]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        setPan({ x: e.clientX - startPanRef.current.x, y: e.clientY - startPanRef.current.y });
      }

      // Update dragging wire cursor position
      if (draggingEdge && canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, scale);
        setDraggingEdge({ ...draggingEdge, cursorX: world.x, cursorY: world.y });
      }
    },
    [draggingEdge, pan, scale, setDraggingEdge]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (canvasContainerRef.current) {
          canvasContainerRef.current.style.cursor = draggingEdge ? 'crosshair' : 'default';
        }
        commitSpatialState({ pan, scale }, { enabled: gridSnap, size: gridSize }).catch(() => {});
      }

      // If releasing a drag wire over empty canvas — check for node input pin hit
      if (draggingEdge && e.button === 0 && canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        let closestNode: typeof visibleNodes[0] | null = null;
        let closestDist = 32 / scale;

        for (const node of visibleNodes) {
          if (node.id === draggingEdge.sourceId) continue;
          const dim = getNodeDimensions(node.type);
          const pinX = node.x;
          const pinY = node.y + dim.height / 2;
          const pinScreenX = pinX * scale + pan.x;
          const pinScreenY = pinY * scale + pan.y;
          const dist = Math.hypot(screenX - pinScreenX, screenY - pinScreenY);
          if (dist < closestDist * scale) {
            closestDist = dist / scale;
            closestNode = node;
          }
        }

        if (closestNode) {
          if (DependencyLockEngine.wouldCreateCycle(draggingEdge.sourceId, closestNode.id, edges)) {
            showToast('This would create a circular dependency and permanently lock both nodes.', 'error');
            TactileSoundEngine.playSeismicWarning();
            setDraggingEdge(null);
            return;
          }

          const newEdge: KineticBezierEdgeData = {
            id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sourceId: draggingEdge.sourceId,
            targetId: closestNode.id,
            throughputRate: 8.0,
            particleVelocity: 2.0,
            isActive: true,
            clearance: activeClearance,
          };
          try {
            addEdge(newEdge);
            showToast(`Edge established: ${draggingEdge.sourceId} → ${closestNode.id}`, 'success');
          } catch {
            // Already reported to user
          }
        }

        setDraggingEdge(null);
      }
    },
    [
      draggingEdge,
      visibleNodes,
      pan,
      scale,
      activeClearance,
      gridSnap,
      gridSize,
      addEdge,
      setDraggingEdge,
      commitSpatialState,
    ]
  );

  // ── Right-click context menu ──────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if ((e.target as HTMLElement).closest('[data-node]')) return;

      TactileSoundEngine.playClick();
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, scale);
      setContextMenu({
        screenX: e.clientX,
        screenY: e.clientY,
        worldX: world.x,
        worldY: world.y,
      });
    },
    [pan, scale, setContextMenu]
  );

  // ── Spawn node at world coordinate ───────────────────────
  const handleAddNodeAt = useCallback(
    async (type: BlueprintNodeType, worldX: number, worldY: number) => {
      TactileSoundEngine.playNodeConnectSnap();
      const id = `n_${type}_${Date.now()}`;
      const dim = getNodeDimensions(type);
      const base = {
        id,
        x: worldX - dim.width / 2,
        y: worldY - dim.height / 2,
        clearance: activeClearance,
        status: 'pending' as const,
      };

      let node;
      if (type === 'task') {
        node = {
          ...base,
          type,
          title: 'New Task Node',
          assignee: 'unassigned',
          priority: 'MEDIUM' as const,
          slaCountdownSeconds: 3600,
          checklist: [],
        } as TaskNodeData;
      } else if (type === 'vaultFile') {
        node = {
          ...base,
          type,
          title: 'New Vault File',
          fileHash: `0x${Date.now().toString(16)}`,
          fragmentCount: 4,
          sizeBytes: 4194304,
          cipher: 'AES-256-GCM',
          inMemoryDecryptedPreview: '',
        } as VaultFileNodeData;
      } else if (type === 'budget') {
        node = {
          ...base,
          type,
          title: 'New Budget Gate',
          allocatedAmount: 0,
          spentAmount: 0,
          currency: 'USD',
          autoBlockExhausted: true,
        } as BudgetNodeData;
      } else {
        node = {
          ...base,
          type,
          title: 'New Narrative Node',
          currentChapter: 1,
          totalChapters: 5,
          milestoneTitle: 'Untitled Milestone',
          objectives: [],
        } as NarrativeNodeData;
      }

      await addNode(node);
      await commitSpatialState({ pan, scale }, { enabled: gridSnap, size: gridSize });
      showToast(`${type} node spawned at (${Math.round(worldX)}, ${Math.round(worldY)})`, 'info');
    },
    [activeClearance, pan, scale, gridSnap, gridSize, addNode, commitSpatialState]
  );

  // ── Start dragging wire from output pin ───────────────────
  const handleOutputPinMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (!canEditNode) {
        showToast('Yetkisiz işlem: Düğümleri birbirine bağlama yetkiniz yok.', 'warning');
        return;
      }
      const node = visibleNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const dim = getNodeDimensions(node.type);
      const pinWorldX = node.x + dim.width;
      const pinWorldY = node.y + dim.height / 2;

      TactileSoundEngine.playClick();
      setDraggingEdge({
        sourceId: nodeId,
        sourceX: pinWorldX,
        sourceY: pinWorldY,
        cursorX: pinWorldX,
        cursorY: pinWorldY,
      });
    },
    [visibleNodes, canEditNode, setDraggingEdge]
  );

  // ── Hardware-Accelerated Node Drag Pipeline with Pointer Capture ──
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('[data-pin]') ||
        target.closest('button, input, select, textarea, a')
      ) {
        return;
      }

      e.stopPropagation();

      TactileSoundEngine.playMechanicalTransient();
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setContextMenu(null);

      // If user lacks blueprint:edit, allow selection but block dragging
      if (!canEditNode) {
        return;
      }

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('[CANVAS_DRAG] Pointer capture invocation failed:', err);
      }

      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, scale);
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      dragRef.current = {
        nodeId,
        pointerId: e.pointerId,
        grabOffsetX: world.x - targetNode.x,
        grabOffsetY: world.y - targetNode.y,
        hasMoved: false,
        startPos: { x: targetNode.x, y: targetNode.y },
      };
      setActiveDragNodeId(nodeId);
    },
    [pan, scale, nodes, canEditNode, setSelectedNodeId, setSelectedEdgeId, setContextMenu]
  );

  const handleNodePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      const drag = dragRef.current;
      if (!drag || drag.nodeId !== nodeId || drag.pointerId !== e.pointerId) return;

      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, scale);
      let rawX = world.x - drag.grabOffsetX;
      let rawY = world.y - drag.grabOffsetY;

      if (gridSnap) {
        rawX = Math.round(rawX / gridSize) * gridSize;
        rawY = Math.round(rawY / gridSize) * gridSize;
      }

      const deltaDist = Math.hypot(rawX - drag.startPos.x, rawY - drag.startPos.y);
      if (deltaDist > 2) {
        drag.hasMoved = true;
      }

      // Synchronous reactive store coordinate update: Bezier wires flex at 60-120fps
      updateNodePosition(nodeId, rawX, rawY);
    },
    [pan, scale, gridSnap, gridSize, updateNodePosition]
  );

  const handleNodePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      const drag = dragRef.current;
      if (!drag || drag.nodeId !== nodeId || drag.pointerId !== e.pointerId) return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      const hadMoved = drag.hasMoved;
      dragRef.current = null;
      setActiveDragNodeId(null);

      if (hadMoved) {
        // Tactile WebAudio transient click on precision placement drop
        TactileSoundEngine.playMechanicalTransient();

        // Authenticated AES-256-GCM zero-knowledge cryptographic sealing
        await commitSpatialState({ pan, scale }, { enabled: gridSnap, size: gridSize });
      }
    },
    [pan, scale, gridSnap, gridSize, commitSpatialState]
  );

  return (
    <div
      ref={canvasContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        cursor: draggingEdge ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* ── Precision Dot Grid Background ──────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, var(--border-moderate) 1px, transparent 1px)',
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Top Canvas HUD / Toolbar ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--sp-4)',
          left: 'var(--sp-4)',
          right: 'var(--sp-4)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        {/* Left: View Switcher & Clearance Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', pointerEvents: 'auto' }}>
          <div
            style={{
              display: 'flex',
              padding: 2,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              className={`btn btn-xs ${viewMode === 'canvas' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('canvas')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem' }}
            >
              <GitBranch size={12} />Blueprint DAG
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('kanban')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem' }}
            >
              <KanbanIcon size={12} />Kanban Matrix
            </button>
          </div>

          {/* Clearance Masking */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              padding: '5px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Shield size={12} color="var(--clr-accent)" />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Clearance:</span>
            {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'] as ClearanceLevel[])
              .filter((lvl) => CLEARANCE_RANKS[lvl] <= CLEARANCE_RANKS[userClearance])
              .map((lvl) => (
                <button
                  key={lvl}
                  className={`btn btn-xs ${activeClearance === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setActiveClearance(lvl);
                    showToast(`Clearance set to ${lvl}.`, 'info');
                  }}
                  style={{ fontSize: '0.6rem', padding: '3px 7px' }}
                >
                  {lvl.replace('_', ' ')}
                </button>
              ))}
            {activeRole === 'Auditor' && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--clr-caution)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                🔍 DENETÇİ / SALT-OKUNUR
              </span>
            )}
            {activeRole === 'Intern' && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--clr-accent)',
                  background: 'rgba(78, 242, 210, 0.1)',
                  border: '1px solid rgba(78, 242, 210, 0.25)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                🎓 STAJYER / KISITLI
              </span>
            )}
            {culledCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--clr-caution)',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Lock size={11} />
                <span>{culledCount} RESTRICTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Grid Snap HUD */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Magnetic Grid Snapping Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <Magnet size={12} color={gridSnap ? 'var(--clr-accent)' : 'var(--text-muted)'} />
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                TactileSoundEngine.playMechanicalTransient();
                if (!gridSnap) {
                  setGridSnap(true);
                  setGridSize(16);
                  showToast('Magnetic grid snap: 16px', 'info');
                  commitSpatialState({ pan, scale }, { enabled: true, size: 16 }).catch(() => {});
                } else if (gridSize === 16) {
                  setGridSize(20);
                  showToast('Magnetic grid snap: 20px', 'info');
                  commitSpatialState({ pan, scale }, { enabled: true, size: 20 }).catch(() => {});
                } else {
                  setGridSnap(false);
                  showToast('Magnetic grid snap disabled', 'info');
                  commitSpatialState({ pan, scale }, { enabled: false, size: 16 }).catch(() => {});
                }
              }}
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 4px',
                color: gridSnap ? 'var(--clr-accent)' : 'var(--text-muted)',
              }}
              title="Toggle Magnetic Grid Snap (16px / 20px / OFF)"
            >
              SNAP: {gridSnap ? `${gridSize}px` : 'OFF'}
            </button>
          </div>

          {canCreateNode && (
            <button
              className="btn btn-primary btn-xs"
              onClick={() => {
                setCreateModalPos({
                  x: Math.round((400 - pan.x) / scale),
                  y: Math.round((200 - pan.y) / scale),
                });
                setIsCreateModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              title="Yeni Görev veya Bütçe Kapısı Düğümü Oluştur"
            >
              <Plus size={12} />+ Düğüm Ekle
            </button>
          )}

          {/* Delete selected */}
          {canDeleteNode && (selectedNodeId || selectedEdgeId) && (
            <button
              className="btn btn-xs"
              onClick={() => {
                if (selectedNodeId) removeNode(selectedNodeId);
                else if (selectedEdgeId) removeEdge(selectedEdgeId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--clr-negative)',
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.3)',
              }}
              title="Delete selected (Del)"
            >
              <Trash2 size={12} />Sil
            </button>
          )}

          <div style={{ width: 1, height: 16, background: 'var(--border-hairline)' }} />

          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              const nextScale = Math.min(2.0, scale + 0.15);
              setScale(nextScale);
              scheduleViewportCommit(pan, nextScale);
            }}
            style={{ padding: 5 }}
            title="Zoom In (+)"
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              const nextScale = Math.max(0.25, scale - 0.15);
              setScale(nextScale);
              scheduleViewportCommit(pan, nextScale);
            }}
            style={{ padding: 5 }}
            title="Zoom Out (-)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setScale(1.0);
              setPan({ x: 40, y: 40 });
              scheduleViewportCommit({ x: 40, y: 40 }, 1.0);
            }}
            style={{ padding: 5 }}
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              paddingRight: 4,
              color: 'var(--text-muted)',
            }}
          >
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* ── Transformable Canvas Viewport ───────────────────── */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
          willChange: 'transform',
        }}
      >
        {/* ── SVG Layer: Edges + Drag-Wire Preview ───────────── */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: 4000,
            height: 4000,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Committed kinetic Bezier edges dynamically recalculating at 60-120fps */}
          <g style={{ pointerEvents: 'all' }}>
            {visibleEdges.map((edge) => {
              const src = visibleNodes.find((n) => n.id === edge.sourceId);
              const tgt = visibleNodes.find((n) => n.id === edge.targetId);
              if (!src || !tgt) return null;
              const srcDim = getNodeDimensions(src.type);
              const tgtDim = getNodeDimensions(tgt.type);
              return (
                <KineticBezierEdge
                  key={edge.id}
                  edge={edge}
                  sourceX={src.x + srcDim.width}
                  sourceY={src.y + srcDim.height / 2}
                  targetX={tgt.x}
                  targetY={tgt.y + tgtDim.height / 2}
                  isSelected={selectedEdgeId === edge.id}
                  onClick={(id) => setSelectedEdgeId(id)}
                />
              );
            })}
          </g>

          {/* Live drag-wire preview */}
          {draggingEdge && (
            <g style={{ pointerEvents: 'none' }}>
              {(() => {
                const dx = Math.abs(draggingEdge.cursorX - draggingEdge.sourceX) * 0.5;
                const cp1x = draggingEdge.sourceX + Math.max(50, dx);
                const cp2x = draggingEdge.cursorX - Math.max(50, dx);
                const pathD = `M ${draggingEdge.sourceX} ${draggingEdge.sourceY} C ${cp1x} ${draggingEdge.sourceY}, ${cp2x} ${draggingEdge.cursorY}, ${draggingEdge.cursorX} ${draggingEdge.cursorY}`;
                return (
                  <>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(0,212,255,0.8)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <circle cx={draggingEdge.cursorX} cy={draggingEdge.cursorY} r={5} fill="rgba(0,212,255,0.6)" />
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* ── Polymorphic Node Layer: Hardware-Accelerated Pointer Interaction ── */}
        {visibleNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const dim = getNodeDimensions(node.type);
          const isDragging = activeDragNodeId === node.id;

          const nodeProps = {
            isSelected,
            onSelect: (id: string) => setSelectedNodeId(id),
            onDoubleClick: (n: typeof node) => setActiveDrawerNode(n),
          };

          return (
            <div
              key={node.id}
              data-node={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerMove={(e) => handleNodePointerMove(e, node.id)}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onPointerCancel={(e) => handleNodePointerUp(e, node.id)}
              onLostPointerCapture={(e) => handleNodePointerUp(e, node.id)}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: dim.width,
                zIndex: isSelected ? 15 : isDragging ? 14 : 5,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                willChange: 'left, top',
              }}
            >
              {/* Output connection pin (right edge) */}
              <div
                data-pin="output"
                onMouseDown={(e) => handleOutputPinMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredPin({ nodeId: node.id, side: 'output' })}
                onMouseLeave={() => setHoveredPin(null)}
                style={{
                  position: 'absolute',
                  left: dim.width - 7,
                  top: dim.height / 2 - 7,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background:
                    hoveredPin?.nodeId === node.id && hoveredPin.side === 'output'
                      ? 'var(--clr-accent)'
                      : 'var(--bg-secondary)',
                  border: '2px solid var(--clr-accent)',
                  cursor: 'crosshair',
                  zIndex: 20,
                  transition: 'background 0.15s ease, transform 0.15s ease',
                  transform:
                    hoveredPin?.nodeId === node.id && hoveredPin.side === 'output'
                      ? 'scale(1.3)'
                      : 'scale(1)',
                }}
                title="Drag to connect wire"
              />

              {/* Input connection pin (left edge) — active during wire dragging */}
              {draggingEdge && draggingEdge.sourceId !== node.id && (
                <div
                  data-pin="input"
                  style={{
                    position: 'absolute',
                    left: -7,
                    top: dim.height / 2 - 7,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--clr-positive)',
                    zIndex: 20,
                    boxShadow: '0 0 10px rgba(52,200,122,0.5)',
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                />
              )}

              {node.type === 'task' && (
                <TaskNode node={node as TaskNodeData} {...nodeProps} />
              )}
              {node.type === 'vaultFile' && (
                <VaultFileNode node={node as VaultFileNodeData} {...nodeProps} />
              )}
              {node.type === 'budget' && (
                <BudgetNode node={node as BudgetNodeData} {...nodeProps} />
              )}
              {node.type === 'narrative' && (
                <NarrativeNode node={node as NarrativeNodeData} {...nodeProps} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Empty State Watermark Overlay ──────────────────── */}
      {visibleNodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: 'var(--text-muted)',
            gap: 14,
            zIndex: 2,
          }}
        >
          <GitBranch size={42} style={{ opacity: 0.35, color: 'var(--clr-accent)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              BLUEPRINT DAG // CANLI İŞ AKIŞI
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', opacity: 0.6, letterSpacing: '0.04em' }}>
              SAĞ TIKLAYARAK VEYA BUTONA BASARAK İLK GÖREV VEYA BÜTÇE DÜĞÜMÜNÜ EKLEYİN
            </span>
          </div>
          <button
            onClick={() => {
              setCreateModalPos({ x: 320, y: 200 });
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}
          >
            <Plus size={14} />
            + İlk Düğümü Oluştur
          </button>
        </div>
      )}

      {/* ── Right-Click Context Menu ────────────────────────── */}
      {contextMenu && (
        <CanvasContextMenu
          screenX={contextMenu.screenX}
          screenY={contextMenu.screenY}
          worldX={contextMenu.worldX}
          worldY={contextMenu.worldY}
          hasSelection={!!(selectedNodeId || selectedEdgeId)}
          canAddNode={canCreateNode}
          canDeleteNode={canDeleteNode}
          onAddNode={handleAddNodeAt}
          onDeleteSelected={() => {
            if (selectedNodeId) removeNode(selectedNodeId);
            else if (selectedEdgeId) removeEdge(selectedEdgeId);
          }}
          onResetView={() => {
            setScale(1.0);
            setPan({ x: 40, y: 40 });
            scheduleViewportCommit({ x: 40, y: 40 }, 1.0);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Keyboard hint ──────────────────────────────────── */}
      {draggingEdge && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 14px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          Release on a node's <span style={{ color: 'var(--clr-positive)' }}>●</span> input pin to connect — Esc to cancel
        </div>
      )}

      {/* ── Workspace Drawer ────────────────────────────────── */}
      <NodeWorkspaceDrawer
        node={activeDrawerNode}
        allNodes={nodes}
        allEdges={edges}
        onClose={() => setActiveDrawerNode(null)}
        onUpdateNode={(updated) => {
          updateNode(updated);
        }}
        onSealToLedger={(decision) => {
          TactileSoundEngine.playLedgerSealThud();
          showToast(`Decision sealed: ${decision}`, 'success');
        }}
      />

      {/* Diskless RAM Previewer */}
      <RamFilePreviewModal />

      {/* Dynamic Node Creation Modal */}
      <CreateNodeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultPosition={createModalPos}
      />
    </div>
  );
};
