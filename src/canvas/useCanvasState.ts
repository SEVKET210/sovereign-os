import { create } from 'zustand';

export type NodeType = 'process' | 'crypto' | 'ledger' | 'condition' | 'output' | 'input';
export type PermissionLevel = 1 | 2 | 3 | 4;

export interface NodePort {
  id: string;
  label: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  type: 'exec' | 'data' | 'crypto' | 'ledger';
  connected: boolean;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: NodePort[];
  level: PermissionLevel;
  data: Record<string, unknown>;
  selected: boolean;
}

export interface CanvasEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  type: 'exec' | 'data' | 'crypto' | 'ledger';
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
  selectedNodeId: string | null;
  draggingEdge: { fromNodeId: string; fromPortId: string; toX: number; toY: number } | null;
  userPermissionLevel: PermissionLevel;

  // Actions
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: CanvasEdge) => void;
  removeEdge: (id: string) => void;
  setViewport: (vp: Partial<CanvasViewport>) => void;
  selectNode: (id: string | null) => void;
  setDraggingEdge: (de: CanvasState['draggingEdge']) => void;
  setPermissionLevel: (level: PermissionLevel) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  (set) => ({
    nodes: getDefaultNodes(),
    edges: getDefaultEdges(),
    viewport: { x: 0, y: 0, scale: 1 },
    selectedNodeId: null,
    draggingEdge: null,
    userPermissionLevel: 4,

    addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
    updateNode: (id, patch) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      })),
    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
      })),
    addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),
    removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),
    setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
    selectNode: (id) =>
      set((s) => ({
        selectedNodeId: id,
        nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })),
      })),
    setDraggingEdge: (de) => set({ draggingEdge: de }),
    setPermissionLevel: (level) => set({ userPermissionLevel: level }),
    clearCanvas: () => set({ nodes: [], edges: [], selectedNodeId: null }),
  })
);

function makePort(id: string, label: string, side: NodePort['side'], type: NodePort['type']): NodePort {
  return { id, label, side, type, connected: false };
}

function getDefaultNodes(): CanvasNode[] {
  return [
    {
      id: 'node-1',
      type: 'input',
      label: 'Treasury Input',
      x: 80, y: 120,
      width: 180, height: 100,
      level: 1,
      selected: false,
      data: {},
      ports: [makePort('n1-out', 'Data', 'right', 'data')],
    },
    {
      id: 'node-2',
      type: 'crypto',
      label: 'SHA-256 Hash',
      x: 340, y: 100,
      width: 200, height: 120,
      level: 2,
      selected: false,
      data: { algorithm: 'SHA-256' },
      ports: [
        makePort('n2-in', 'Input', 'left', 'data'),
        makePort('n2-out', 'Hash', 'right', 'crypto'),
      ],
    },
    {
      id: 'node-3',
      type: 'ledger',
      label: 'Ledger Entry',
      x: 620, y: 80,
      width: 200, height: 140,
      level: 2,
      selected: false,
      data: { account: 'treasury' },
      ports: [
        makePort('n3-in-exec', 'Exec', 'left', 'exec'),
        makePort('n3-in-hash', 'Hash', 'left', 'crypto'),
        makePort('n3-out', 'Entry', 'right', 'ledger'),
      ],
    },
    {
      id: 'node-4',
      type: 'condition',
      label: 'Verify Chain',
      x: 340, y: 300,
      width: 180, height: 120,
      level: 3,
      selected: false,
      data: {},
      ports: [
        makePort('n4-in', 'Entry', 'left', 'ledger'),
        makePort('n4-true', 'Valid', 'right', 'exec'),
        makePort('n4-false', 'Invalid', 'bottom', 'exec'),
      ],
    },
    {
      id: 'node-5',
      type: 'output',
      label: 'ZK Proof Output',
      x: 620, y: 300,
      width: 180, height: 100,
      level: 4,
      selected: false,
      data: {},
      ports: [makePort('n5-in', 'Proof', 'left', 'exec')],
    },
    {
      id: 'node-6',
      type: 'process',
      label: 'AES-GCM Encrypt',
      x: 80, y: 300,
      width: 200, height: 120,
      level: 3,
      selected: false,
      data: { mode: 'AES-GCM', keySize: 256 },
      ports: [
        makePort('n6-in', 'Plaintext', 'left', 'data'),
        makePort('n6-out', 'Ciphertext', 'right', 'data'),
      ],
    },
  ];
}

function getDefaultEdges(): CanvasEdge[] {
  return [
    { id: 'e1', fromNodeId: 'node-1', fromPortId: 'n1-out', toNodeId: 'node-2', toPortId: 'n2-in', type: 'data' },
    { id: 'e2', fromNodeId: 'node-2', fromPortId: 'n2-out', toNodeId: 'node-3', toPortId: 'n3-in-hash', type: 'crypto' },
    { id: 'e3', fromNodeId: 'node-3', fromPortId: 'n3-out', toNodeId: 'node-4', toPortId: 'n4-in', type: 'ledger' },
    { id: 'e4', fromNodeId: 'node-4', fromPortId: 'n4-true', toNodeId: 'node-5', toPortId: 'n5-in', type: 'exec' },
  ];
}
