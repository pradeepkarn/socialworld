import type { WebSocket } from 'ws';
import {
  IPlayerNetworkState,
  ServerMessage,
  IVector3,
} from '../network/MessageTypes';
import { sanitizePlayerUpdate } from './PlayerState';

export class GameRoom {
  private players: Map<string, IPlayerNetworkState> = new Map();
  private sockets: Map<string, WebSocket> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE_MS = 50; // 20 Hz broadcast rate

  constructor() {
    this.startTickLoop();
  }

  /**
   * Adds a new player connection into the shared room.
   */
  public addPlayer(ws: WebSocket, preferredName?: string): IPlayerNetworkState {
    const id = `p_${Math.random().toString(36).substring(2, 8)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const name = preferredName && preferredName.trim().length > 0
      ? preferredName.trim().substring(0, 16)
      : `Runner_${randomSuffix}`;

    // Base spawn on central promenade (0, 1.0, 8) with slight random offset to prevent overlap
    const offsetX = (Math.random() - 0.5) * 3;
    const offsetZ = (Math.random() - 0.5) * 3;
    const spawnPosition: IVector3 = {
      x: Number((0 + offsetX).toFixed(2)),
      y: 1.0,
      z: Number((8 + offsetZ).toFixed(2)),
    };

    const newPlayerState: IPlayerNetworkState = {
      id,
      name,
      position: spawnPosition,
      rotation: 0,
      animationState: 'idle',
      timestamp: Date.now(),
    };

    // 1. Send welcome message containing the new player's ID and current players
    const existingPlayers = Array.from(this.players.values());
    const welcomeMsg: ServerMessage = {
      type: 'welcome',
      payload: {
        id,
        name,
        spawnPosition,
        players: existingPlayers,
      },
    };
    this.send(ws, welcomeMsg);

    // 2. Broadcast to other players that someone joined
    const joinedMsg: ServerMessage = {
      type: 'player_joined',
      payload: {
        player: newPlayerState,
      },
    };
    this.broadcast(joinedMsg, id);

    // 3. Register player in room
    this.players.set(id, newPlayerState);
    this.sockets.set(id, ws);

    console.log(`[GameRoom] Player joined: ${name} (${id}). Total players: ${this.players.size}`);
    return newPlayerState;
  }

  /**
   * Removes a disconnected player and notifies remaining clients.
   */
  public removePlayer(id: string): void {
    const player = this.players.get(id);
    if (!player) return;

    this.players.delete(id);
    this.sockets.delete(id);

    console.log(`[GameRoom] Player left: ${player.name} (${id}). Remaining players: ${this.players.size}`);

    const leftMsg: ServerMessage = {
      type: 'player_left',
      payload: {
        id,
      },
    };
    this.broadcast(leftMsg);
  }

  /**
   * Processes and validates an incoming player movement/animation update.
   */
  public handlePlayerUpdate(id: string, rawPayload: unknown): void {
    const existing = this.players.get(id);
    if (!existing) return;

    const validated = sanitizePlayerUpdate(id, existing.name, rawPayload);
    if (validated) {
      this.players.set(id, validated);
    }
  }

  /**
   * Handles Player A requesting a handshake with Player B.
   */
  public handleHandshakeRequest(fromId: string, targetId: string): void {
    const fromPlayer = this.players.get(fromId);
    const targetPlayer = this.players.get(targetId);
    const targetWs = this.sockets.get(targetId);

    if (!fromPlayer || !targetPlayer || !targetWs) {
      return;
    }

    // Proximity check on server (within 4.5 meters)
    const dx = fromPlayer.position.x - targetPlayer.position.x;
    const dy = fromPlayer.position.y - targetPlayer.position.y;
    const dz = fromPlayer.position.z - targetPlayer.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 4.5) {
      console.log(`[GameRoom] Handshake rejected: distance too far (${dist.toFixed(2)}m)`);
      return;
    }

    console.log(`[GameRoom] Handshake request: ${fromPlayer.name} -> ${targetPlayer.name}`);
    const promptMsg: ServerMessage = {
      type: 'handshake_prompt',
      payload: {
        fromId: fromPlayer.id,
        fromName: fromPlayer.name,
      },
    };
    this.send(targetWs, promptMsg);
  }

  /**
   * Handles Player B accepting the handshake from Player A.
   */
  public handleHandshakeAccept(acceptorId: string, requesterId: string): void {
    const acceptor = this.players.get(acceptorId);
    const requester = this.players.get(requesterId);

    if (!acceptor || !requester) {
      return;
    }

    // Verify distance
    const dx = acceptor.position.x - requester.position.x;
    const dy = acceptor.position.y - requester.position.y;
    const dz = acceptor.position.z - requester.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 5.0) {
      console.log(`[GameRoom] Handshake accept rejected: distance too far (${dist.toFixed(2)}m)`);
      return;
    }

    console.log(`[GameRoom] Handshake accepted: ${acceptor.name} <-> ${requester.name}`);

    // Update their animation states in the room
    acceptor.animationState = 'handshake';
    requester.animationState = 'handshake';

    // Broadcast handshake_start to both players and all observers in room
    const startMsg: ServerMessage = {
      type: 'handshake_start',
      payload: {
        player1Id: requester.id,
        player2Id: acceptor.id,
        durationMs: 2000,
      },
    };
    this.broadcast(startMsg);

    // Schedule completion and social reward (+10 Credits)
    setTimeout(() => {
      if (this.players.has(requester.id)) {
        this.players.get(requester.id)!.animationState = 'idle';
      }
      if (this.players.has(acceptor.id)) {
        this.players.get(acceptor.id)!.animationState = 'idle';
      }

      const completeMsg: ServerMessage = {
        type: 'handshake_complete',
        payload: {
          player1Id: requester.id,
          player2Id: acceptor.id,
          rewardCredits: 10,
        },
      };
      this.broadcast(completeMsg);
    }, 2000);
  }

  /**
   * Starts the 20 Hz authoritative broadcast loop.
   */
  private startTickLoop(): void {
    this.broadcastInterval = setInterval(() => {
      if (this.players.size === 0) return;

      const allStates = Array.from(this.players.values());
      const now = Date.now();

      // Broadcast state snapshot to every client
      for (const [playerId, ws] of this.sockets.entries()) {
        if (ws.readyState !== 1 /* WebSocket.OPEN */) {
          this.removePlayer(playerId);
          continue;
        }

        // Send updates of other players
        const otherPlayers = allStates.filter((p) => p.id !== playerId);
        const updatesMsg: ServerMessage = {
          type: 'player_updates',
          payload: {
            updates: otherPlayers,
            timestamp: now,
          },
        };
        this.send(ws, updatesMsg);
      }
    }, this.TICK_RATE_MS);
  }

  /**
   * Safe transmission of typed message to a single socket.
   */
  public send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error('[GameRoom] Send error:', err);
      }
    }
  }

  /**
   * Broadcasts message to all clients, optionally excluding one sender ID.
   */
  public broadcast(msg: ServerMessage, excludeId?: string): void {
    const serialized = JSON.stringify(msg);
    for (const [id, ws] of this.sockets.entries()) {
      if (excludeId && id === excludeId) continue;
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        try {
          ws.send(serialized);
        } catch (err) {
          console.error(`[GameRoom] Broadcast error to ${id}:`, err);
        }
      }
    }
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public dispose(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    this.players.clear();
    this.sockets.clear();
  }
}
