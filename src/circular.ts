import { DependencyGraph } from './graph';

export interface Cycle {
  path: string[];
  length: number;
}

export class CircularDetector {
  private graph: DependencyGraph;
  private visited = new Set<string>();
  private recursionStack = new Set<string>();
  private cycles: Cycle[] = [];
  private currentPath: string[] = [];

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  detect(): Cycle[] {
    this.visited.clear();
    this.recursionStack.clear();
    this.cycles = [];
    this.currentPath = [];

    for (const nodeId of this.graph.nodes.keys()) {
      if (!this.visited.has(nodeId)) {
        this.dfs(nodeId);
      }
    }

    return this.deduplicateCycles(this.cycles);
  }

  private dfs(nodeId: string): void {
    this.visited.add(nodeId);
    this.recursionStack.add(nodeId);
    this.currentPath.push(nodeId);

    const node = this.graph.nodes.get(nodeId);
    if (node) {
      for (const dep of node.imports) {
        if (!this.visited.has(dep)) {
          this.dfs(dep);
        } else if (this.recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = this.currentPath.indexOf(dep);
          const cyclePath = [...this.currentPath.slice(cycleStart), dep];
          this.cycles.push({
            path: cyclePath,
            length: cyclePath.length - 1,
          });
        }
      }
    }

    this.currentPath.pop();
    this.recursionStack.delete(nodeId);
  }

  private deduplicateCycles(cycles: Cycle[]): Cycle[] {
    const seen = new Set<string>();
    const unique: Cycle[] = [];

    for (const cycle of cycles) {
      // Normalize cycle by starting with the smallest element
      const nodes = cycle.path.slice(0, -1);
      const minIdx = nodes.indexOf(
        nodes.reduce((min, n) => (n < min ? n : min), nodes[0])
      );
      const normalized = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
      const key = normalized.join(' → ');

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cycle);
      }
    }

    return unique;
  }
}
