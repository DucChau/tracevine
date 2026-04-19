#!/usr/bin/env node
import { parseArgs } from './cli';
import { Scanner } from './scanner';
import { GraphBuilder } from './graph';
import { CircularDetector } from './circular';
import { UnusedExportFinder } from './unused';
import { HtmlRenderer } from './renderer';
import { ConsoleReporter } from './reporter';
import * as path from 'path';
import * as fs from 'fs';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const entryDir = path.resolve(args.entry);
  if (!fs.existsSync(entryDir)) {
    console.error(`\x1b[31m✗ Directory not found: ${entryDir}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[36m🌿 tracevine\x1b[0m — scanning ${entryDir}`);
  console.log();

  // Phase 1: Scan files
  const scanner = new Scanner(entryDir, args.extensions, args.ignore);
  const sourceFiles = scanner.scan();
  console.log(`  Found \x1b[33m${sourceFiles.length}\x1b[0m source files`);

  // Phase 2: Build dependency graph
  const graphBuilder = new GraphBuilder(entryDir);
  const graph = graphBuilder.build(sourceFiles);
  console.log(`  Resolved \x1b[33m${graph.edgeCount}\x1b[0m import edges`);
  console.log();

  // Phase 3: Detect circular dependencies
  const circularDetector = new CircularDetector(graph);
  const cycles = circularDetector.detect();

  // Phase 4: Find unused exports
  const unusedFinder = new UnusedExportFinder(graph);
  const unusedExports = unusedFinder.find();

  // Phase 5: Report
  const reporter = new ConsoleReporter();
  reporter.reportSummary(graph, cycles, unusedExports);
  reporter.reportCycles(cycles);
  reporter.reportUnused(unusedExports);

  // Phase 6: Generate HTML visualization
  if (args.output) {
    const renderer = new HtmlRenderer();
    const html = renderer.render(graph, cycles, unusedExports);
    const outPath = path.resolve(args.output);
    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`\n  \x1b[32m✓\x1b[0m Interactive visualization → \x1b[4m${outPath}\x1b[0m`);
  }

  // Exit with error code if cycles found and strict mode
  if (args.strict && cycles.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\x1b[31m✗ ${err.message}\x1b[0m`);
  process.exit(1);
});
