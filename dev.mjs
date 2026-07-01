// Launches the JobBot server and web app together, with prefixed output.
// Pure Node (child_process) — no external dependencies, works on Windows,
// macOS, and Linux. Started via `npm run dev`.

import { spawn } from 'node:child_process';

const procs = [
  { name: 'server', args: ['run', 'dev', '--prefix', 'server'], color: '\x1b[34m' }, // blue
  { name: 'web', args: ['run', 'dev', '--prefix', 'web'], color: '\x1b[35m' }, // magenta
];

const reset = '\x1b[0m';

function writePrefixed(stream, tag, chunk) {
  const text = chunk.toString();
  const lines = text.split('\n');
  // Keep a trailing empty segment from a final newline as-is.
  const out = lines
    .map((line, i) => (i === lines.length - 1 && line === '' ? '' : tag + line))
    .join('\n');
  stream.write(out);
}

const children = procs.map((p) => {
  const tag = `${p.color}[${p.name}]${reset} `;
  // shell:true so "npm" resolves to npm.cmd on Windows.
  const child = spawn('npm', p.args, { shell: true });
  child.stdout.on('data', (d) => writePrefixed(process.stdout, tag, d));
  child.stderr.on('data', (d) => writePrefixed(process.stderr, tag, d));
  child.on('exit', (code) => {
    console.log(`${tag}process exited (code ${code ?? 0}) — shutting down.`);
    shutdown();
  });
  return child;
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
