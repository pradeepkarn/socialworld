import { spawn } from 'child_process';

console.log('====================================================');
console.log('  🚀 Starting NeoVerse Game & Multiplayer Servers   ');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npx.cmd' : 'npx';

// 1. Spawn WebSocket server
const wsProcess = spawn(npmCmd, ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
});

// 2. Spawn Next.js Dev server
const nextProcess = spawn(npmCmd, ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\nStopping servers...');
  try { wsProcess.kill('SIGINT'); } catch {}
  try { nextProcess.kill('SIGINT'); } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
