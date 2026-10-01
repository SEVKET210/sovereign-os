/* ============================================================
   SOVEREIGN-OS — Blueprint DAG Context Aggregator
   Compiles graph topology, upstream prerequisite constraints,
   and downstream deliverables into a structured LLM system context.
   ============================================================ */

import type { BlueprintNode, KineticBezierEdgeData, DagTopologyContext } from '../../types';

export class DagContextAggregator {
  /**
   * Extracts detailed contextual metadata for an individual target node.
   */
  public static getNodeContext(nodeId: string, nodes: BlueprintNode[]): BlueprintNode | null {
    return nodes.find((n) => n.id === nodeId) || null;
  }

  /**
   * Traverses incoming Bezier edges backwards to aggregate prerequisite task completions,
   * predecessor notes, and blocking constraints up to a given depth.
   */
  public static getUpstreamBranchContext(
    nodeId: string,
    nodes: BlueprintNode[],
    edges: KineticBezierEdgeData[],
    depth = 3
  ): Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    checklistSummary?: string;
  }> {
    const upstreamResults: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      checklistSummary?: string;
    }> = [];

    const visited = new Set<string>();
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: nodeId, currentDepth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.currentDepth >= depth) continue;

      // Find incoming edges where target is current.id
      const incomingEdges = edges.filter((e) => e.targetId === current.id);
      for (const edge of incomingEdges) {
        const sourceNode = nodes.find((n) => n.id === edge.sourceId);
        if (sourceNode && !visited.has(sourceNode.id)) {
          visited.add(sourceNode.id);

          let checklistSummary: string | undefined;
          if (sourceNode.type === 'task' && (sourceNode as any).checklist) {
            const list = (sourceNode as any).checklist as Array<{ text: string; completed: boolean }>;
            const done = list.filter((item) => item.completed).length;
            checklistSummary = `${done}/${list.length} subtasks resolved`;
          }

          upstreamResults.push({
            id: sourceNode.id,
            title: sourceNode.title,
            type: sourceNode.type,
            status: sourceNode.status,
            checklistSummary,
          });

          queue.push({ id: sourceNode.id, currentDepth: current.currentDepth + 1 });
        }
      }
    }

    return upstreamResults;
  }

  /**
   * Traverses outgoing edges forwards to discover downstream dependent nodes and deliverables.
   */
  public static getConnectedSubtreeSummary(
    nodeId: string,
    nodes: BlueprintNode[],
    edges: KineticBezierEdgeData[]
  ): Array<{
    id: string;
    title: string;
    type: string;
  }> {
    const downstreamResults: Array<{
      id: string;
      title: string;
      type: string;
    }> = [];

    const visited = new Set<string>();
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const outgoingEdges = edges.filter((e) => e.sourceId === currentId);

      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.targetId);
        if (targetNode && !visited.has(targetNode.id)) {
          visited.add(targetNode.id);
          downstreamResults.push({
            id: targetNode.id,
            title: targetNode.title,
            type: targetNode.type,
          });
          queue.push(targetNode.id);
        }
      }
    }

    return downstreamResults;
  }

  /**
   * Compiles the full topological brief and produces a token-optimized system prompt block.
   */
  public static compileDagContext(
    nodeId: string,
    nodes: BlueprintNode[],
    edges: KineticBezierEdgeData[]
  ): DagTopologyContext | null {
    const targetNode = this.getNodeContext(nodeId, nodes);
    if (!targetNode) return null;

    const upstream = this.getUpstreamBranchContext(nodeId, nodes, edges, 3);
    const downstream = this.getConnectedSubtreeSummary(nodeId, nodes, edges);

    let checklistCount = 0;
    let completedChecklistCount = 0;
    if (targetNode.type === 'task' && (targetNode as any).checklist) {
      const list = (targetNode as any).checklist as Array<{ text: string; completed: boolean }>;
      checklistCount = list.length;
      completedChecklistCount = list.filter((i) => i.completed).length;
    }

    // Format serialized markdown context block
    let promptBlock = `[SOVEREIGN-OS BLUEPRINT DAG TOPOLOGY CONTEXT]\n`;
    promptBlock += `TARGET NODE: "${targetNode.title}" (Type: ${targetNode.type.toUpperCase()}, Clearance: ${targetNode.clearance}, Status: ${targetNode.status.toUpperCase()})\n`;

    if (targetNode.markdownNotes) {
      promptBlock += `OPERATOR NOTES: ${targetNode.markdownNotes}\n`;
    }

    if (targetNode.type === 'task') {
      const task = targetNode as any;
      promptBlock += `TASK METADATA: Assignee: ${task.assignee || 'Unassigned'} | Priority: ${task.priority || 'MEDIUM'} | SLA: ${task.slaCountdownSeconds || 3600}s\n`;
      if (task.checklist && task.checklist.length > 0) {
        promptBlock += `CURRENT CHECKLIST (${completedChecklistCount}/${checklistCount} complete):\n`;
        for (const item of task.checklist) {
          promptBlock += `  - [${item.completed ? 'X' : ' '}] ${item.text}\n`;
        }
      }
    } else if (targetNode.type === 'budget') {
      const b = targetNode as any;
      promptBlock += `BUDGET METADATA: Allocated: $${b.allocatedAmount.toLocaleString()} | Spent: $${b.spentAmount.toLocaleString()} ${b.currency}\n`;
    } else if (targetNode.type === 'narrative') {
      const n = targetNode as any;
      promptBlock += `NARRATIVE MILESTONE: "${n.milestoneTitle}" (Chapter ${n.currentChapter}/${n.totalChapters})\n`;
    }

    if (upstream.length > 0) {
      promptBlock += `\nUPSTREAM PREREQUISITES & CONSTRAINTS (${upstream.length} nodes):\n`;
      for (const u of upstream) {
        promptBlock += `  - [<- ${u.type.toUpperCase()}] "${u.title}" (${u.status.toUpperCase()}${u.checklistSummary ? `, ${u.checklistSummary}` : ''})\n`;
      }
    } else {
      promptBlock += `\nUPSTREAM PREREQUISITES: None (Root or independent branch origin)\n`;
    }

    if (downstream.length > 0) {
      promptBlock += `\nDOWNSTREAM DELIVERABLES & IMPACTS (${downstream.length} nodes):\n`;
      for (const d of downstream) {
        promptBlock += `  - [-> ${d.type.toUpperCase()}] "${d.title}"\n`;
      }
    }

    promptBlock += `[END TOPOLOGY CONTEXT]\n`;

    return {
      targetNodeId: nodeId,
      title: targetNode.title,
      type: targetNode.type,
      clearance: targetNode.clearance,
      upstreamDependencies: upstream,
      downstreamImpacts: downstream,
      checklistCount,
      completedChecklistCount,
      notes: targetNode.markdownNotes,
      serializedSystemPrompt: promptBlock,
    };
  }
}
