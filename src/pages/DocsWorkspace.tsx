import React from 'react';
import { DocsSidebar } from '../components/docs/DocsSidebar';
import { DocEditorCanvas } from '../components/docs/DocEditorCanvas';
import { DocUtilityDrawer } from '../components/docs/DocUtilityDrawer';

export const DocsWorkspace: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        background: 'var(--bg-primary)',
      }}
    >
      {/* ── Left Pane: Hierarchical Document Tree & Clearance Culling ── */}
      <DocsSidebar />

      {/* ── Center Pane: High-Density Document Composition Canvas ── */}
      <DocEditorCanvas />

      {/* ── Right Pane: Collapsible Blueprint DAG Binding & Sealing Drawer ── */}
      <DocUtilityDrawer />
    </div>
  );
};
