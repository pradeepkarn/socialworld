import os from 'os';
import { GameRoom } from './world/GameRoom';
import { NeonWebSocketServer } from './network/WebSocketServer';

const PORT = parseInt(process.env.PORT || '3001', 10);

const getLanIp = (): string => {
  const interfaces = os.networkInterfaces();
  let candidate = '';
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('vethernet') || lower.includes('wsl') || lower.includes('virtual') || lower.includes('hyper-v')) {
      continue;
    }
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (lower.includes('wi-fi') || lower.includes('wireless') || iface.address.startsWith('192.168.')) {
          return iface.address;
        }
        if (!candidate) candidate = iface.address;
      }
    }
  }
  return candidate || '192.168.1.2';
};

const lanIp = getLanIp();

console.log('==============================================');
console.log('    NEONVERSE MULTIPLAYER SERVER (PHASE 2)    ');
console.log('==============================================');
console.log(`[NeonVerse WS] Listening on port ${PORT}`);
console.log(`[NeonVerse WS] Local:   ws://localhost:${PORT}`);
console.log(`[NeonVerse WS] Network: ws://${lanIp}:${PORT}`);
console.log('==============================================');

const gameRoom = new GameRoom();
const server = new NeonWebSocketServer(PORT, gameRoom);

// Graceful shutdown handling
const shutdown = () => {
  console.log('\n[NeonVerse Server] Shutting down gracefully...');
  server.close();
  gameRoom.dispose();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
