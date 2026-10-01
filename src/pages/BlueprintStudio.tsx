import React from 'react';
import { BlueprintCanvas } from '../components/blueprint/BlueprintCanvas';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useKanbanStore } from '../stores/useKanbanStore';

export const BlueprintStudio: React.FC = () => {
  const viewMode = useKanbanStore((state) => state.viewMode);

  return (
    // overflow:hidden + height:100% ensures the canvas fills the flex-1 main area
    // without triggering scroll on the outer container
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {viewMode === 'kanban' ? <KanbanBoard /> : <BlueprintCanvas />}
    </div>
  );
};
