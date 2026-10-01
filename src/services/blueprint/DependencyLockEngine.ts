/* ============================================================
   SOVEREIGN-OS — Blueprint Dependency Lock Engine
   Evaluates prerequisite incoming Bezier edges when tasks complete.
   Dynamically unlocks downstream nodes and triggers procedural audio.
   ============================================================ */

import { TactileSoundEngine } from '../audio/TactileSoundEngine';
import type { BlueprintNode, KineticBezierEdgeData } from '../../types';

export interface DependencyEvaluationResult {
  updatedNodes: BlueprintNode[];
  newlyUnlockedCount: number;
  unlockedNodeTitles: string[];
}

export class DependencyLockEngine {
  /**
   * Evaluates downstream dependencies when a node changes state (e.g. marked 'completed').
   */
  public static evaluateDependencies(
    completedNodeId: string,
    nodes: BlueprintNode[],
    edges: KineticBezierEdgeData[]
  ): DependencyEvaluationResult {
    // 1. Clone node list to keep pure immutability
    const nodeMap = new Map<string, BlueprintNode>(nodes.map((n) => [n.id, { ...n }]));

    // 2. Locate all outgoing edges originating from the completed node
    const outgoingEdges = edges.filter((e) => e.sourceId === completedNodeId);
    const downstreamNodeIds = Array.from(new Set(outgoingEdges.map((e) => e.targetId)));

    const unlockedTitles: string[] = [];

    for (const downstreamId of downstreamNodeIds) {
      const targetNode = nodeMap.get(downstreamId);
      if (!targetNode) continue;

      // Only inspect currently locked or pending nodes
      if (targetNode.status !== 'locked' && targetNode.status !== 'pending') {
        continue;
      }

      // Find all incoming prerequisite edges for this target node
      const incomingEdges = edges.filter((e) => e.targetId === downstreamId);

      // Check if all incoming predecessor nodes are marked 'completed'
      const allPrerequisitesCompleted = incomingEdges.every((edge) => {
        const predecessor = nodeMap.get(edge.sourceId);
        return predecessor && predecessor.status === 'completed';
      });

      if (allPrerequisitesCompleted) {
        // Unlock downstream node
        targetNode.status = 'active';
        nodeMap.set(downstreamId, targetNode);
        unlockedTitles.push(targetNode.title);
      }
    }

    if (unlockedTitles.length > 0) {
      TactileSoundEngine.playUnlockShimmer();
    }

    return {
      updatedNodes: Array.from(nodeMap.values()),
      newlyUnlockedCount: unlockedTitles.length,
      unlockedNodeTitles: unlockedTitles,
    };
  }

  /**
   * Topological cycle detection using Depth-First Search (DFS) / Reachability.
   * Returns true if establishing a directed edge from sourceId to targetId
   * would introduce a direct self-loop or an indirect/transitive cycle in the DAG.
   */
  public static wouldCreateCycle(
    sourceId: string,
    targetId: string,
    edges: Array<{ sourceId: string; targetId: string }>
  ): boolean {
    // 1. Direct self-loop (A -> A)
    if (sourceId === targetId) return true;

    // 2. Build adjacency list of existing directed edges: u -> [v1, v2, ...]
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      const neighbors = adj.get(edge.sourceId) || [];
      neighbors.push(edge.targetId);
      adj.set(edge.sourceId, neighbors);
    }

    // 3. DFS search: Check if there is already a path from targetId to sourceId.
    // If targetId can reach sourceId, then adding sourceId -> targetId completes a directed cycle.
    const visited = new Set<string>();
    const stack = [targetId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceId) {
        return true; // Transitive circular dependency found!
      }
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adj.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }

    return false;
  }
}
