/* ============================================================
   SOVEREIGN-OS — Kanban View State Store (useKanbanStore)
   Controls Kanban view mode, swimlane configuration, and search filters.
   ============================================================ */

import { create } from 'zustand';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import type { KanbanViewMode, KanbanColumnId, KanbanColumnConfig } from '../types';

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'pending',
    label: 'Backlog & Origin',
    color: 'var(--text-muted)',
    badge: 'STAGE 01',
    description: 'Queued initiatives awaiting active clearance or prerequisite unblocking',
  },
  {
    id: 'active',
    label: 'In Progress / Active',
    color: 'var(--clr-accent)',
    badge: 'STAGE 02',
    description: 'Active branch execution with live telemetry',
  },
  {
    id: 'review',
    label: 'Under Audit & Review',
    color: 'var(--clr-caution)',
    badge: 'STAGE 03',
    description: 'Dual-signatory verification and clearance audit',
  },
  {
    id: 'completed',
    label: 'Completed & Sealed',
    color: 'var(--clr-positive)',
    badge: 'STAGE 04',
    description: 'Attested tasks bound to cryptographic ledger',
  },
  {
    id: 'locked',
    label: 'Blocked / Dependent',
    color: 'var(--clr-danger)',
    badge: 'STAGE 05',
    description: 'Gated by unsatisfied upstream prerequisite nodes',
  },
];

interface KanbanState {
  viewMode: KanbanViewMode;
  searchFilter: string;
  columnOrder: KanbanColumnId[];
  isQuickAddOpen: boolean;

  // Actions
  setViewMode: (mode: KanbanViewMode) => void;
  setSearchFilter: (query: string) => void;
  setQuickAddOpen: (isOpen: boolean) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  viewMode: 'canvas',
  searchFilter: '',
  columnOrder: ['pending', 'active', 'review', 'completed', 'locked'],
  isQuickAddOpen: false,

  setViewMode: (mode: KanbanViewMode) => {
    TactileSoundEngine.playClick();
    set({ viewMode: mode });
  },

  setSearchFilter: (query: string) => {
    set({ searchFilter: query });
  },

  setQuickAddOpen: (isOpen: boolean) => {
    TactileSoundEngine.playClick();
    set({ isQuickAddOpen: isOpen });
  },
}));
