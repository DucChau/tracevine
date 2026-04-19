import { DependencyGraph } from './graph';
import { Cycle } from './circular';
import { UnusedExport } from './unused';

export class ConsoleReporter {
  reportSummary(graph: DependencyGraph, cycles: Cycle[], unused: UnusedExport[]): void {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edgeCount;
    const cycleCount = cycles.length;
    const unusedCount = unused.length;

    console.log('  ┌─────────────────────────────────────┐');
    console.log('  │         \x1b[36m🌿 tracevine report\x1b[0m         │');
    console.log('  ├─────────────────────────────────────┤');
    console.log(`  │  Modules scanned    │ \x1b[33m${this.pad(nodeCount)}\x1b[0m │`);
    console.log(`  │  Import edges       │ \x1b[33m${this.pad(edgeCount)}\x1b[0m │`);
    console.log(`  │  Circular deps      │ ${cycleCount > 0 ? '\x1b[31m' : '\x1b[32m'}${this.pad(cycleCount)}\x1b[0m │`);
    console.log(`  │  Unused exports     │ ${unusedCount > 0 ? '\x1b[33m' : '\x1b[32m'}${this.pad(unusedCount)}\x1b[0m │`);
    console.log('  └─────────────────────────────────────┘');
  }

  reportCycles(cycles: Cycle[]): void {
    if (cycles.length === 0) {
      console.log('\n  \x1b[32m✓ No circular dependencies found\x1b[0m');
      return;
    }

    console.log(`\n  \x1b[31m✗ ${cycles.length} circular ${cycles.length === 1 ? 'dependency' : 'dependencies'} found:\x1b[0m\n`);

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      console.log(`  \x1b[31m${i + 1}.\x1b[0m ${cycle.path.map((p) => `\x1b[33m${p}\x1b[0m`).join(' → ')}`);
    }
  }

  reportUnused(unused: UnusedExport[]): void {
    if (unused.length === 0) {
      console.log('\n  \x1b[32m✓ No unused exports found\x1b[0m');
      return;
    }

    console.log(`\n  \x1b[33m⚠ ${unused.length} unused ${unused.length === 1 ? 'export' : 'exports'} found:\x1b[0m\n`);

    // Group by file
    const grouped = new Map<string, UnusedExport[]>();
    for (const u of unused) {
      if (!grouped.has(u.file)) grouped.set(u.file, []);
      grouped.get(u.file)!.push(u);
    }

    for (const [file, exports] of grouped) {
      console.log(`  \x1b[2m${file}\x1b[0m`);
      for (const exp of exports) {
        console.log(`    \x1b[33m→\x1b[0m ${exp.exportName} \x1b[2m(line ${exp.line})\x1b[0m`);
      }
    }
  }

  private pad(num: number): string {
    return String(num).padStart(6);
  }
}
