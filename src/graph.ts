import * as fs from 'fs';
import * as path from 'path';

export interface DependencyNode {
  id: string;           // relative path from root
  absolutePath: string;
  imports: string[];    // relative IDs of imported modules
  exports: ExportInfo[];
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 'reexport';
  line: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  specifiers: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  edgeCount: number;
}

const IMPORT_PATTERNS = [
  // import { x } from './module'
  /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g,
  // import './module' (side-effect)
  /import\s+['"]([^'"]+)['"]/g,
  // const x = require('./module')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // export { x } from './module'
  /export\s+(?:{[^}]*}|\*)\s+from\s+['"]([^'"]+)['"]/g,
];

const EXPORT_PATTERNS = [
  { pattern: /export\s+default\s+/g, type: 'default' as const },
  { pattern: /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g, type: 'named' as const },
  { pattern: /export\s+{([^}]+)}/g, type: 'named' as const },
  { pattern: /export\s+(?:{[^}]*}|\*)\s+from\s+/g, type: 'reexport' as const },
];

export class GraphBuilder {
  constructor(private rootDir: string) {}

  build(files: string[]): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // First pass: parse all files
    for (const file of files) {
      const relPath = path.relative(this.rootDir, file);
      const content = fs.readFileSync(file, 'utf-8');
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);

      nodes.set(relPath, {
        id: relPath,
        absolutePath: file,
        imports: [],
        exports,
      });
    }

    // Second pass: resolve imports to node IDs
    for (const [relPath, node] of nodes) {
      const fileDir = path.dirname(path.join(this.rootDir, relPath));
      const content = fs.readFileSync(node.absolutePath, 'utf-8');
      const rawImports = this.extractImports(content);

      for (const imp of rawImports) {
        if (!imp.modulePath.startsWith('.')) continue; // skip external modules

        const resolved = this.resolveImport(imp.modulePath, fileDir, nodes);
        if (resolved) {
          node.imports.push(resolved);
          edges.push({
            from: relPath,
            to: resolved,
            specifiers: imp.specifiers,
          });
        }
      }
    }

    return { nodes, edges, edgeCount: edges.length };
  }

  private extractImports(content: string): { modulePath: string; specifiers: string[] }[] {
    const imports: { modulePath: string; specifiers: string[] }[] = [];
    const seen = new Set<string>();

    for (const pattern of IMPORT_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        const modulePath = match[1];
        if (!seen.has(modulePath)) {
          seen.add(modulePath);
          const specifiers = this.extractSpecifiers(match[0]);
          imports.push({ modulePath, specifiers });
        }
      }
    }

    return imports;
  }

  private extractSpecifiers(importStatement: string): string[] {
    const braceMatch = importStatement.match(/{([^}]+)}/);
    if (braceMatch) {
      return braceMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    }
    const defaultMatch = importStatement.match(/import\s+(\w+)\s+from/);
    if (defaultMatch) return [defaultMatch[1]];
    const namespaceMatch = importStatement.match(/\*\s+as\s+(\w+)/);
    if (namespaceMatch) return [`* as ${namespaceMatch[1]}`];
    return ['*'];
  }

  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (/export\s+default\s+/.test(line)) {
        exports.push({ name: 'default', type: 'default', line: lineNum });
      }

      const namedMatch = line.match(/export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/);
      if (namedMatch) {
        exports.push({ name: namedMatch[1], type: 'named', line: lineNum });
      }

      const braceExport = line.match(/export\s+{([^}]+)}/);
      if (braceExport && !line.includes('from')) {
        const names = braceExport[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
        for (const name of names) {
          exports.push({ name, type: 'named', line: lineNum });
        }
      }

      if (/export\s+(?:{[^}]*}|\*)\s+from\s+/.test(line)) {
        exports.push({ name: '*', type: 'reexport', line: lineNum });
      }
    }

    return exports;
  }

  private resolveImport(modulePath: string, fromDir: string, nodes: Map<string, DependencyNode>): string | null {
    const resolved = path.resolve(fromDir, modulePath);
    const relFromRoot = path.relative(this.rootDir, resolved);

    // Try exact match
    if (nodes.has(relFromRoot)) return relFromRoot;

    // Try adding extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const withExt = relFromRoot + ext;
      if (nodes.has(withExt)) return withExt;
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(relFromRoot, `index${ext}`);
      if (nodes.has(indexFile)) return indexFile;
    }

    return null;
  }
}
