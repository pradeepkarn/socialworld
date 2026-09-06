import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { GameRoom } from '../world/GameRoom';
import { ClientMessage, ServerMessage } from './MessageTypes';

interface SocketMetadata {
  playerId?: string;
  isAlive: boolean;
}

export class NeonWebSocketServer {
  private wss: WSServer;
  private room: GameRoom;
  private socketMeta: Map<WebSocket, SocketMetadata> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(port: number, room: GameRoom) {
    this.room = room;
    this.wss = new WSServer({ port, host: '0.0.0.0' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const ip = req.socket.remoteAddress || 'unknown';
      console.log(`[WebSocketServer] Client connected from ${ip}`);

      this.socketMeta.set(ws, { isAlive: true });

      // Automatically join room upon connection
      const playerState = this.room.addPlayer(ws);
      const meta = this.socketMeta.get(ws);
      if (meta) {
        meta.playerId = playerState.id;
      }

      ws.on('pong', () => {
        const m = this.socketMeta.get(ws);
        if (m) m.isAlive = true;
      });

      ws.on('message', (raw: Buffer | string) => {
        try {
          const str = raw.toString();
          const msg = JSON.parse(str) as ClientMessage;

          if (!msg || typeof msg !== 'object' || !msg.type) {
            return;
          }

          const currentMeta = this.socketMeta.get(ws);
          const currentId = currentMeta?.playerId;

          switch (msg.type) {
            case 'join': {
              // If client provides a custom name after initial connect
              if (msg.payload?.name && currentId) {
                // Update player name if needed
              }
              break;
            }

            case 'player_update': {
              if (currentId) {
                this.room.handlePlayerUpdate(currentId, msg.payload);
              }
              break;
            }

            case 'ping': {
              const pongMsg: ServerMessage = {
                type: 'pong',
                payload: {
                  timestamp: msg.payload?.timestamp || Date.now(),
                  serverTime: Date.now(),
                },
              };
              this.room.send(ws, pongMsg);
              break;
            }

            case 'handshake_request': {
              if (currentId && msg.payload?.targetId) {
                this.room.handleHandshakeRequest(currentId, msg.payload.targetId);
              }
              break;
            }

            case 'handshake_accept': {
              if (currentId && msg.payload?.requesterId) {
                this.room.handleHandshakeAccept(currentId, msg.payload.requesterId);
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.warn('[WebSocketServer] Error parsing message:', err);
        }
      });

      ws.on('close', (code, reason) => {
        const m = this.socketMeta.get(ws);
        if (m?.playerId) {
          this.room.removePlayer(m.playerId);
        }
        this.socketMeta.delete(ws);
        console.log(`[WebSocketServer] Connection closed (code: ${code}, reason: ${reason || 'none'})`);
      });

      ws.on('error', (err) => {
        console.error('[WebSocketServer] Socket error:', err.message);
      });
    });

    this.startHeartbeat();
    console.log(`[WebSocketServer] Dedicated multiplayer server listening on ws://localhost:${port}`);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const meta = this.socketMeta.get(ws);
        if (!meta) return;

        if (!meta.isAlive) {
          console.log(`[WebSocketServer] Terminating unresponsive socket: ${meta.playerId}`);
          if (meta.playerId) {
            this.room.removePlayer(meta.playerId);
          }
          this.socketMeta.delete(ws);
          return ws.terminate();
        }

        meta.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.wss.close();
  }
}
