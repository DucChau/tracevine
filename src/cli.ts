export interface CliArgs {
  entry: string;
  output: string | null;
  extensions: string[];
  ignore: string[];
  strict: boolean;
  help: boolean;
}

const HELP_TEXT = `
\x1b[36m🌿 tracevine\x1b[0m — TypeScript/JS dependency graph tracer

USAGE:
  tracevine <directory> [options]

OPTIONS:
  -o, --output <file>       Output HTML visualization (e.g., graph.html)
  -e, --extensions <exts>   File extensions to scan (default: .ts,.tsx,.js,.jsx)
  -i, --ignore <patterns>   Glob patterns to ignore (default: node_modules,dist,.git)
  --strict                  Exit with code 1 if circular dependencies found
  -h, --help                Show this help message

EXAMPLES:
  tracevine ./src
  tracevine ./src -o graph.html
  tracevine ./src --strict --extensions .ts,.tsx
  tracevine ./src -i node_modules,dist,__tests__
`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    entry: '.',
    output: null,
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    ignore: ['node_modules', 'dist', '.git'],
    strict: false,
    help: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
      console.log(HELP_TEXT);
      process.exit(0);
    } else if (arg === '-o' || arg === '--output') {
      args.output = argv[++i];
    } else if (arg === '-e' || arg === '--extensions') {
      args.extensions = argv[++i].split(',').map((e) => (e.startsWith('.') ? e : `.${e}`));
    } else if (arg === '-i' || arg === '--ignore') {
      args.ignore = argv[++i].split(',');
    } else if (arg === '--strict') {
      args.strict = true;
    } else if (!arg.startsWith('-')) {
      args.entry = arg;
    }

    i++;
  }

  return args;
}
