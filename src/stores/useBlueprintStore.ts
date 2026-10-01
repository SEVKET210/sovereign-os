/* ============================================================
   SOVEREIGN-OS — Blueprint Node & DAG Shared Store
   Central authority for Blueprint DAG nodes, kinetic edges,
   active clearance filtering, and bi-directional Kanban sync.
   ============================================================ */

import { create } from 'zustand';
import { ZkPersistenceManager } from '../services/crypto/ZkPersistenceManager';
import {
  BlueprintSpatialPersistenceService,
  type BlueprintSpatialState,
} from '../services/crypto/BlueprintSpatialPersistenceService';
import { DependencyLockEngine } from '../services/blueprint/DependencyLockEngine';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';
import { usePermissionStore } from './usePermissionStore';
import type {
  BlueprintNode,
  BlueprintNodeType,
  KineticBezierEdgeData,
  ClearanceLevel,
} from '../types';

const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

export const NODE_DIMENSIONS: Record<BlueprintNodeType, { width: number; height: number }> = {
  task: { width: 260, height: 116 },
  vaultFile: { width: 270, height: 120 },
  budget: { width: 270, height: 116 },
  narrative: { width: 280, height: 116 },
  autonomousSummary: { width: 280, height: 120 },
};

export const getNodeDimensions = (type: BlueprintNodeType): { width: number; height: number } => {
  return NODE_DIMENSIONS[type] || { width: 260, height: 116 };
};

export const INITIAL_BLUEPRINT_NODES: BlueprintNode[] = [];

export const INITIAL_BLUEPRINT_EDGES: KineticBezierEdgeData[] = [];

interface DraggingEdgeState {
  sourceId: string;
  sourceX: number;
  sourceY: number;
  cursorX: number;
  cursorY: number;
}

interface ContextMenuState {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
}

interface BlueprintState {
  nodes: BlueprintNode[];
  edges: KineticBezierEdgeData[];
  activeClearance: ClearanceLevel;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeDrawerNode: BlueprintNode | null;
  isLoading: boolean;
  draggingEdge: DraggingEdgeState | null;
  contextMenu: ContextMenuState | null;

  // Actions
  loadNodes: () => Promise<void>;
  updateNode: (updatedNode: BlueprintNode) => Promise<void>;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  commitSpatialState: (
    viewport: { pan: { x: number; y: number }; scale: number },
    gridSnap: { enabled: boolean; size: 16 | 20 }
  ) => Promise<void>;
  hydrateSpatialState: () => Promise<BlueprintSpatialState | null>;
  updateNodeStatus: (nodeId: string, newStatus: BlueprintNode['status']) => Promise<void>;
  addNode: (node: BlueprintNode) => Promise<void>;
  addEdge: (edge: KineticBezierEdgeData) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  setActiveClearance: (level: ClearanceLevel) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setActiveDrawerNode: (node: BlueprintNode | null) => void;
  setDraggingEdge: (state: DraggingEdgeState | null) => void;
  setContextMenu: (state: ContextMenuState | null) => void;
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  nodes: INITIAL_BLUEPRINT_NODES,
  edges: INITIAL_BLUEPRINT_EDGES,
  activeClearance: 'LEVEL_4',
  selectedNodeId: null,
  selectedEdgeId: null,
  activeDrawerNode: null,
  isLoading: false,
  draggingEdge: null,
  contextMenu: null,

  loadNodes: async () => {
    const userClearance = usePermissionStore.getState().getActiveClearance();
    const current = get().activeClearance;
    const effectiveClearance =
      CLEARANCE_RANK[current] > CLEARANCE_RANK[userClearance] ? userClearance : current;
    if (effectiveClearance !== current) {
      set({ activeClearance: effectiveClearance });
    }
    const clearance = effectiveClearance;
    set({ isLoading: true });
    try {
      const loaded = await ZkPersistenceManager.loadNodes(clearance);
      const MOCK_NODE_IDS = ['n_task_1', 'n_vault_file', 'n_budget_1', 'n_narrative_1'];
      let baseNodes = loaded.filter((n) => !MOCK_NODE_IDS.includes(n.id));

      // Hydrate physical coordinates strictly from zero-knowledge spatial envelope
      try {
        const layout = await BlueprintSpatialPersistenceService.unsealSpatialLayout();
        if (layout && layout.nodeGeometries && layout.nodeGeometries.length > 0) {
          baseNodes = baseNodes.map((node) => {
            const geo = layout.nodeGeometries.find((g) => g.id === node.id);
            return geo ? { ...node, x: geo.x, y: geo.y } : node;
          });
        }
      } catch (err) {
        console.warn('[BLUEPRINT_STORE] Layout unseal warning during loadNodes:', err);
      }

      set({ nodes: baseNodes, isLoading: false });
    } catch {
      set({ nodes: [], isLoading: false });
    }
  },

  updateNodePosition: (nodeId: string, x: number, y: number) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, x, y } : n
      ),
    }));
  },

  commitSpatialState: async (viewport, gridSnap) => {
    const nodes = get().nodes;
    try {
      await BlueprintSpatialPersistenceService.sealSpatialLayout(
        nodes,
        viewport,
        gridSnap,
        getNodeDimensions
      );

      // Concurrently update individual node zero-knowledge envelopes in persistence
      for (const node of nodes) {
        ZkPersistenceManager.persistNode(node).catch(() => {});
      }
    } catch (err) {
      console.warn('[BLUEPRINT_STORE] Failed to seal spatial layout envelope:', err);
    }
  },

  hydrateSpatialState: async () => {
    try {
      const layout = await BlueprintSpatialPersistenceService.unsealSpatialLayout();
      if (layout && layout.nodeGeometries && layout.nodeGeometries.length > 0) {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            const geo = layout.nodeGeometries.find((g) => g.id === node.id);
            return geo ? { ...node, x: geo.x, y: geo.y } : node;
          }),
        }));
        return layout;
      }
    } catch (err) {
      console.warn('[BLUEPRINT_STORE] Failed to hydrate spatial layout:', err);
    }
    return null;
  },

  updateNode: async (updatedNode: BlueprintNode) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
      activeDrawerNode:
        state.activeDrawerNode?.id === updatedNode.id ? updatedNode : state.activeDrawerNode,
    }));

    // Zero-knowledge envelope encryption and persistence
    await ZkPersistenceManager.persistNode(updatedNode).catch(() => {});
  },

  updateNodeStatus: async (nodeId: string, newStatus: BlueprintNode['status']) => {
    TactileSoundEngine.playClick();

    // Mutated nodes subset tracking for batched persistence
    let mutatedNodes: BlueprintNode[] = [];
    let unlockedTitles: string[] = [];

    // Atomic functional update using Zustand set((state) => ...) to eliminate lost-update races
    set((state) => {
      const target = state.nodes.find((n) => n.id === nodeId);
      if (!target || target.status === newStatus) {
        return state;
      }

      // 1. Update the target node status
      const updatedTarget: BlueprintNode = { ...target, status: newStatus };
      let updatedNodes = state.nodes.map((n) => (n.id === nodeId ? updatedTarget : n));
      const newlyMutated: BlueprintNode[] = [updatedTarget];

      // 2. If marked completed, evaluate downstream dependency unlocking on latest committed state
      if (newStatus === 'completed') {
        const depResult = DependencyLockEngine.evaluateDependencies(
          nodeId,
          updatedNodes,
          state.edges
        );
        updatedNodes = depResult.updatedNodes;
        unlockedTitles = depResult.unlockedNodeTitles;

        // Collect newly unlocked downstream nodes
        for (const node of updatedNodes) {
          if (node.id !== nodeId) {
            const original = state.nodes.find((orig) => orig.id === node.id);
            if (original && original.status !== node.status) {
              newlyMutated.push(node);
            }
          }
        }
      }

      mutatedNodes = newlyMutated;

      return {
        ...state,
        nodes: updatedNodes,
        activeDrawerNode:
          state.activeDrawerNode?.id === nodeId
            ? { ...state.activeDrawerNode, status: newStatus }
            : state.activeDrawerNode,
      };
    });

    if (unlockedTitles.length > 0) {
      showToast(
        `Unlocked ${unlockedTitles.length} downstream nodes: ${unlockedTitles.join(', ')}`,
        'success'
      );
    }

    // Batched persistence fan-out: Only persist mutated nodes, with real error surfacing
    if (mutatedNodes.length > 0) {
      try {
        await Promise.all(mutatedNodes.map((node) => ZkPersistenceManager.persistNode(node)));
      } catch (err) {
        console.error('[BLUEPRINT_STORE] Failed to persist status update for nodes:', err);
        showToast('Warning: Failed to seal updated nodes in encrypted persistence.', 'warning');
      }
    }
  },

  addNode: async (node: BlueprintNode) => {
    const canCreate = usePermissionStore.getState().hasPermission('blueprint:create');
    if (!canCreate) {
      showToast('Yetkisiz işlem: Yeni düğüm veya görev oluşturma yetkiniz yok.', 'error');
      return;
    }
    TactileSoundEngine.playClick();
    set((state) => ({ nodes: [...state.nodes, node] }));
    await ZkPersistenceManager.persistNode(node).catch(() => {});
  },

  addEdge: (edge: KineticBezierEdgeData) => {
    const canEdit = usePermissionStore.getState().hasPermission('blueprint:edit');
    if (!canEdit) {
      showToast('Yetkisiz işlem: Düğümleri birbirine bağlama yetkiniz yok.', 'error');
      return;
    }
    const currentEdges = get().edges;
    // Dependency-Cycle Detection (P3.15):
    if (DependencyLockEngine.wouldCreateCycle(edge.sourceId, edge.targetId, currentEdges)) {
      showToast('This would create a circular dependency and permanently lock both nodes.', 'error');
      TactileSoundEngine.playSeismicWarning();
      throw new Error('This would create a circular dependency and permanently lock both nodes.');
    }

    TactileSoundEngine.playUnlockShimmer();
    set((state) => ({ edges: [...state.edges, edge], selectedEdgeId: edge.id }));
  },

  removeNode: (nodeId: string) => {
    const canDelete = usePermissionStore.getState().hasPermission('blueprint:delete');
    if (!canDelete) {
      showToast('Yetkisiz işlem: Düğüm silme yetkiniz yok.', 'error');
      return;
    }
    TactileSoundEngine.playSeismicWarning();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      // Cascade: remove all edges connected to this node
      edges: state.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      activeDrawerNode: state.activeDrawerNode?.id === nodeId ? null : state.activeDrawerNode,
    }));
    showToast('Node and connected edges removed from DAG.', 'info');
  },

  removeEdge: (edgeId: string) => {
    const canEdit = usePermissionStore.getState().hasPermission('blueprint:edit');
    if (!canEdit) {
      showToast('Yetkisiz işlem: Bağlantı kaldırma yetkiniz yok.', 'error');
      return;
    }
    TactileSoundEngine.playMechanicalTransient();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }));
  },

  setActiveClearance: (level: ClearanceLevel) => {
    const userClearance = usePermissionStore.getState().getActiveClearance();
    if (CLEARANCE_RANK[level] > CLEARANCE_RANK[userClearance]) {
      showToast(`Mevcut rolünüz (${userClearance}) bu yetki seviyesine erişemez.`, 'warning');
      return;
    }
    TactileSoundEngine.playClick();
    set({ activeClearance: level });
    get().loadNodes();
  },

  setSelectedNodeId: (id: string | null) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  setSelectedEdgeId: (id: string | null) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },

  setActiveDrawerNode: (node: BlueprintNode | null) => {
    if (node) TactileSoundEngine.playClick();
    set({ activeDrawerNode: node });
  },

  setDraggingEdge: (state) => {
    set({ draggingEdge: state });
  },

  setContextMenu: (state) => {
    set({ contextMenu: state });
  },
}));
