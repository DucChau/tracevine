import { DependencyGraph } from './graph';
import { Cycle } from './circular';
import { UnusedExport } from './unused';

export class HtmlRenderer {
  render(graph: DependencyGraph, cycles: Cycle[], unused: UnusedExport[]): string {
    const nodes = this.buildVisNodes(graph, cycles, unused);
    const edges = this.buildVisEdges(graph, cycles);
    const stats = {
      modules: graph.nodes.size,
      edges: graph.edgeCount,
      cycles: cycles.length,
      unused: unused.length,
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌿 tracevine — Dependency Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      background: #0d1117;
      color: #c9d1d9;
      overflow: hidden;
    }
    #header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 12px 24px;
      background: rgba(13, 17, 23, 0.9);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid #21262d;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    #header h1 {
      font-size: 18px;
      color: #58a6ff;
      font-weight: 600;
    }
    .stat {
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 16px;
      background: #161b22;
      border: 1px solid #21262d;
    }
    .stat-label { color: #8b949e; }
    .stat-value { color: #f0883e; font-weight: 600; }
    .stat-danger .stat-value { color: #f85149; }
    .stat-ok .stat-value { color: #3fb950; }
    #graph { width: 100vw; height: 100vh; padding-top: 52px; }
    #legend {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(22, 27, 34, 0.95);
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
    }
    .legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
  </style>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body>
  <div id="header">
    <h1>🌿 tracevine</h1>
    <span class="stat"><span class="stat-label">Modules: </span><span class="stat-value">${stats.modules}</span></span>
    <span class="stat"><span class="stat-label">Imports: </span><span class="stat-value">${stats.edges}</span></span>
    <span class="stat ${stats.cycles > 0 ? 'stat-danger' : 'stat-ok'}"><span class="stat-label">Cycles: </span><span class="stat-value">${stats.cycles}</span></span>
    <span class="stat ${stats.unused > 0 ? '' : 'stat-ok'}"><span class="stat-label">Unused: </span><span class="stat-value">${stats.unused}</span></span>
  </div>
  <div id="graph"></div>
  <div id="legend">
    <div class="legend-item"><span class="legend-dot" style="background:#58a6ff"></span> Normal module</div>
    <div class="legend-item"><span class="legend-dot" style="background:#f85149"></span> In circular dependency</div>
    <div class="legend-item"><span class="legend-dot" style="background:#f0883e"></span> Has unused exports</div>
    <div class="legend-item"><span class="legend-dot" style="background:#3fb950"></span> Entry point / clean</div>
  </div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodes)});
    const edges = new vis.DataSet(${JSON.stringify(edges)});
    const container = document.getElementById('graph');
    const data = { nodes, edges };
    const options = {
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -40,
          centralGravity: 0.005,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.4,
        },
        stabilization: { iterations: 200 },
      },
      nodes: {
        shape: 'dot',
        size: 16,
        font: { color: '#c9d1d9', size: 11, face: 'monospace' },
        borderWidth: 2,
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        color: { color: '#30363d', highlight: '#58a6ff', hover: '#58a6ff' },
        smooth: { type: 'cubicBezier', roundness: 0.4 },
        width: 1.5,
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
      },
    };
    new vis.Network(container, data, options);
  </script>
</body>
</html>`;
  }

  private buildVisNodes(
    graph: DependencyGraph,
    cycles: Cycle[],
    unused: UnusedExport[]
  ): { id: string; label: string; color: { background: string; border: string }; title: string }[] {
    const cycleNodes = new Set<string>();
    for (const cycle of cycles) {
      for (const node of cycle.path) {
        cycleNodes.add(node);
      }
    }

    const unusedFiles = new Set(unused.map((u) => u.file));

    const nodes: { id: string; label: string; color: { background: string; border: string }; title: string }[] = [];

    for (const [id, node] of graph.nodes) {
      let color = { background: '#1f6feb', border: '#58a6ff' }; // normal
      let status = 'Clean';

      if (cycleNodes.has(id)) {
        color = { background: '#da3633', border: '#f85149' };
        status = '⚠️ In circular dependency';
      } else if (unusedFiles.has(id)) {
        color = { background: '#bd561d', border: '#f0883e' };
        status = '⚠️ Has unused exports';
      } else if (node.imports.length === 0 && node.exports.length > 0) {
        color = { background: '#238636', border: '#3fb950' };
        status = '✅ Entry / Root';
      }

      const shortName = id.split('/').pop() || id;
      nodes.push({
        id,
        label: shortName,
        color,
        title: `${id}\n${status}\nImports: ${node.imports.length}\nExports: ${node.exports.length}`,
      });
    }

    return nodes;
  }

  private buildVisEdges(
    graph: DependencyGraph,
    cycles: Cycle[]
  ): { from: string; to: string; color: { color: string }; width: number; title: string }[] {
    const cycleEdges = new Set<string>();
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.path.length - 1; i++) {
        cycleEdges.add(`${cycle.path[i]}→${cycle.path[i + 1]}`);
      }
    }

    return graph.edges.map((edge) => {
      const isCycleEdge = cycleEdges.has(`${edge.from}→${edge.to}`);
      return {
        from: edge.from,
        to: edge.to,
        color: { color: isCycleEdge ? '#f85149' : '#30363d' },
        width: isCycleEdge ? 3 : 1.5,
        title: `${edge.from} → ${edge.to}\n[${edge.specifiers.join(', ')}]`,
      };
    });
  }
}
