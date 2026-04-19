import * as fs from 'fs';
import * as path from 'path';

export class Scanner {
  constructor(
    private rootDir: string,
    private extensions: string[],
    private ignorePatterns: string[]
  ) {}

  scan(): string[] {
    const files: string[] = [];
    this.walkDir(this.rootDir, files);
    return files;
  }

  private walkDir(dir: string, files: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (this.shouldIgnore(entry.name)) continue;

      if (entry.isDirectory()) {
        this.walkDir(fullPath, files);
      } else if (entry.isFile() && this.hasValidExtension(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private shouldIgnore(name: string): boolean {
    return this.ignorePatterns.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  private hasValidExtension(name: string): boolean {
    return this.extensions.some((ext) => name.endsWith(ext));
  }
}
