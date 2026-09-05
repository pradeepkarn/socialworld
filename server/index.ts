import { GameRoom } from './world/GameRoom';
import { NeonWebSocketServer } from './network/WebSocketServer';

const PORT = parseInt(process.env.PORT || '3001', 10);

console.log('==============================================');
console.log('    NEONVERSE MULTIPLAYER SERVER (PHASE 2)    ');
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
