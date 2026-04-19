import { DependencyGraph, DependencyEdge } from './graph';

export interface UnusedExport {
  file: string;
  exportName: string;
  line: number;
}

export class UnusedExportFinder {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  find(): UnusedExport[] {
    const unused: UnusedExport[] = [];

    // Build a map of what's imported from each module
    const importedFrom = new Map<string, Set<string>>();

    for (const edge of this.graph.edges) {
      if (!importedFrom.has(edge.to)) {
        importedFrom.set(edge.to, new Set());
      }
      const set = importedFrom.get(edge.to)!;
      for (const spec of edge.specifiers) {
        set.add(spec);
      }
    }

    // Check each node's exports against what's actually imported
    for (const [nodeId, node] of this.graph.nodes) {
      const imported = importedFrom.get(nodeId);

      // If nothing imports from this file, all exports are unused
      // (but skip if it looks like an entry point)
      if (!imported) {
        if (this.isLikelyEntryPoint(nodeId)) continue;

        for (const exp of node.exports) {
          if (exp.type === 'reexport') continue;
          unused.push({
            file: nodeId,
            exportName: exp.name,
            line: exp.line,
          });
        }
        continue;
      }

      // If there's a wildcard import, all exports are considered used
      if (imported.has('*')) continue;
      if (imported.has('* as ' + nodeId.split('/').pop()?.replace(/\.[^.]+$/, ''))) continue;

      for (const exp of node.exports) {
        if (exp.type === 'reexport') continue;
        if (exp.type === 'default' && imported.has('default')) continue;

        // Check if any wildcard namespace import exists
        const hasNamespaceImport = [...imported].some((s) => s.startsWith('* as'));
        if (hasNamespaceImport) continue;

        if (!imported.has(exp.name) && exp.name !== 'default') {
          unused.push({
            file: nodeId,
            exportName: exp.name,
            line: exp.line,
          });
        }
      }
    }

    return unused;
  }

  private isLikelyEntryPoint(nodeId: string): boolean {
    const entryPatterns = [
      /index\.[jt]sx?$/,
      /main\.[jt]sx?$/,
      /app\.[jt]sx?$/,
      /^src\/index/,
    ];
    return entryPatterns.some((p) => p.test(nodeId));
  }
}
