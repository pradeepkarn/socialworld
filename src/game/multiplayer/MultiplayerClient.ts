import {
  AnimationState,
  ClientMessage,
  INetworkStats,
  IPlayerNetworkState,
  IVector3,
  NetworkStatus,
  ServerMessage,
} from './NetworkTypes';

export type WelcomeHandler = (payload: {
  id: string;
  name: string;
  spawnPosition: IVector3;
  players: IPlayerNetworkState[];
}) => void;

export type PlayerJoinedHandler = (player: IPlayerNetworkState) => void;
export type PlayerLeftHandler = (id: string) => void;
export type PlayerUpdatesHandler = (updates: IPlayerNetworkState[]) => void;
export type NetworkStatsHandler = (stats: INetworkStats) => void;
export type HandshakePromptHandler = (payload: { fromId: string; fromName: string }) => void;
export type HandshakeStartHandler = (payload: { player1Id: string; player2Id: string; durationMs: number }) => void;
export type HandshakeCompleteHandler = (payload: { player1Id: string; player2Id: string; rewardCredits: number }) => void;

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private serverUrl: string = 'ws://localhost:3001';
  private status: NetworkStatus = 'DISCONNECTED';
  private assignedId: string | null = null;
  private assignedName: string | null = null;
  private playerCount: number = 1;
  private ping: number = 0;

  // Rate limiting / throttling (20 Hz = send at most every 50ms)
  private lastSendTime: number = 0;
  private readonly SEND_INTERVAL_MS = 50;

  // Ping interval
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;

  // Event handlers
  private welcomeHandlers: Set<WelcomeHandler> = new Set();
  private playerJoinedHandlers: Set<PlayerJoinedHandler> = new Set();
  private playerLeftHandlers: Set<PlayerLeftHandler> = new Set();
  private playerUpdatesHandlers: Set<PlayerUpdatesHandler> = new Set();
  private statsHandlers: Set<NetworkStatsHandler> = new Set();
  private handshakePromptHandlers: Set<HandshakePromptHandler> = new Set();
  private handshakeStartHandlers: Set<HandshakeStartHandler> = new Set();
  private handshakeCompleteHandlers: Set<HandshakeCompleteHandler> = new Set();

  constructor() {}

  /**
   * Connects to the dedicated WebSocket server.
   */
  public async connect(url?: string): Promise<boolean> {
    if (url) {
      this.serverUrl = url;
    } else if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'localhost';
      const isIpOrLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

      if (isIpOrLocal) {
        this.serverUrl = `ws://${hostname}:3001`;
      } else {
        // When accessed via machine hostname (e.g. "pradeep"), resolve true LAN IP to prevent mobile DNS failure
        try {
          const res = await fetch('/api/network-info');
          if (res.ok) {
            const data = await res.json();
            if (data?.wsUrl) {
              this.serverUrl = data.wsUrl;
            } else {
              this.serverUrl = `ws://${hostname}:3001`;
            }
          } else {
            this.serverUrl = `ws://${hostname}:3001`;
          }
        } catch {
          this.serverUrl = `ws://${hostname}:3001`;
        }
      }
    }

    this.shouldReconnect = true;
    this.setStatus('CONNECTING');

    return new Promise((resolve) => {
      try {
        console.log(`[MultiplayerClient] Connecting to WebSocket server at ${this.serverUrl}...`);
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
          console.log(`[MultiplayerClient] Connected successfully to ${this.serverUrl}`);
          this.reconnectAttempts = 0;
          this.setStatus('ONLINE');
          this.startPingLoop();
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
          console.log('[MultiplayerClient] Disconnected from server.');
          this.stopPingLoop();
          this.setStatus('DISCONNECTED');
          this.scheduleReconnect();
          resolve(false);
        };

        this.socket.onerror = (err) => {
          console.warn(`[MultiplayerClient] Socket error connecting to ${this.serverUrl}:`, err);
          this.setStatus('ERROR');
          // If connection failed on a hostname, fallback to querying /api/network-info for true IP
          if (typeof window !== 'undefined' && !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
            fetch('/api/network-info')
              .then((r) => r.json())
              .then((data) => {
                if (data?.wsUrl) this.serverUrl = data.wsUrl;
              })
              .catch(() => {});
          }
        };
      } catch (err) {
        console.error('[MultiplayerClient] Connection exception:', err);
        this.setStatus('ERROR');
        this.scheduleReconnect();
        resolve(false);
      }
    });
  }

  /**
   * Processes incoming server messages and dispatches to registered callbacks.
   */
  private handleMessage(rawData: string): void {
    try {
      const msg = JSON.parse(rawData) as ServerMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'welcome': {
          this.assignedId = msg.payload.id;
          this.assignedName = msg.payload.name;
          this.playerCount = msg.payload.players.length + 1;
          this.emitStats();

          console.log(`[MultiplayerClient] Received welcome: ID=${this.assignedId}, Name=${this.assignedName}, existing=${msg.payload.players.length}`);
          this.welcomeHandlers.forEach((handler) => handler(msg.payload));
          break;
        }

        case 'player_joined': {
          this.playerCount += 1;
          this.emitStats();
          this.playerJoinedHandlers.forEach((handler) => handler(msg.payload.player));
          break;
        }

        case 'player_left': {
          this.playerCount = Math.max(1, this.playerCount - 1);
          this.emitStats();
          this.playerLeftHandlers.forEach((handler) => handler(msg.payload.id));
          break;
        }

        case 'player_updates': {
          this.playerUpdatesHandlers.forEach((handler) => handler(msg.payload.updates));
          break;
        }

        case 'pong': {
          if (msg.payload?.timestamp) {
            this.ping = Math.max(0, Date.now() - msg.payload.timestamp);
            this.emitStats();
          }
          break;
        }

        case 'handshake_prompt': {
          this.handshakePromptHandlers.forEach((handler) => handler(msg.payload));
          break;
        }

        case 'handshake_start': {
          this.handshakeStartHandlers.forEach((handler) => handler(msg.payload));
          break;
        }

        case 'handshake_complete': {
          this.handshakeCompleteHandlers.forEach((handler) => handler(msg.payload));
          break;
        }
      }
    } catch (err) {
      console.warn('[MultiplayerClient] Error parsing message:', err);
    }
  }

  /**
   * Transmits local player movement and animation state to the server (throttled to 20 Hz).
   */
  public sendPlayerUpdate(
    position: IVector3,
    rotation: number,
    animationState: AnimationState,
    velocity?: IVector3
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (now - this.lastSendTime < this.SEND_INTERVAL_MS) {
      return; // Skip this frame to stay within 20 Hz limit
    }
    this.lastSendTime = now;

    const msg: ClientMessage = {
      type: 'player_update',
      payload: {
        position: {
          x: Number(position.x.toFixed(3)),
          y: Number(position.y.toFixed(3)),
          z: Number(position.z.toFixed(3)),
        },
        rotation: Number(rotation.toFixed(3)),
        animationState,
        velocity: velocity
          ? {
              x: Number(velocity.x.toFixed(2)),
              y: Number(velocity.y.toFixed(2)),
              z: Number(velocity.z.toFixed(2)),
            }
          : undefined,
        timestamp: Date.now(),
      },
    };

    try {
      this.socket.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[MultiplayerClient] Send error:', err);
    }
  }

  /**
   * Starts periodic ping to measure real-time latency.
   */
  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pingMsg: ClientMessage = {
          type: 'ping',
          payload: { timestamp: Date.now() },
        };
        try {
          this.socket.send(JSON.stringify(pingMsg));
        } catch {}
      }
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(10000, 2000 * Math.pow(1.5, this.reconnectAttempts - 1));
    console.log(`[MultiplayerClient] Scheduling reconnect in ${(delay / 1000).toFixed(1)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(status: NetworkStatus): void {
    this.status = status;
    this.emitStats();
  }

  private emitStats(): void {
    const stats: INetworkStats = {
      status: this.status,
      playerCount: this.playerCount,
      ping: this.ping,
    };
    this.statsHandlers.forEach((h) => h(stats));
  }

  public getStats(): INetworkStats {
    return {
      status: this.status,
      playerCount: this.playerCount,
      ping: this.ping,
    };
  }

  public getAssignedId(): string | null {
    return this.assignedId;
  }

  public getAssignedName(): string | null {
    return this.assignedName;
  }

  public onWelcome(handler: WelcomeHandler): () => void {
    this.welcomeHandlers.add(handler);
    return () => this.welcomeHandlers.delete(handler);
  }

  public onPlayerJoined(handler: PlayerJoinedHandler): () => void {
    this.playerJoinedHandlers.add(handler);
    return () => this.playerJoinedHandlers.delete(handler);
  }

  public onPlayerLeft(handler: PlayerLeftHandler): () => void {
    this.playerLeftHandlers.add(handler);
    return () => this.playerLeftHandlers.delete(handler);
  }

  public onPlayerUpdates(handler: PlayerUpdatesHandler): () => void {
    this.playerUpdatesHandlers.add(handler);
    return () => this.playerUpdatesHandlers.delete(handler);
  }

  public onStatsChange(handler: NetworkStatsHandler): () => void {
    this.statsHandlers.add(handler);
    return () => this.statsHandlers.delete(handler);
  }

  public onHandshakePrompt(handler: HandshakePromptHandler): () => void {
    this.handshakePromptHandlers.add(handler);
    return () => this.handshakePromptHandlers.delete(handler);
  }

  public onHandshakeStart(handler: HandshakeStartHandler): () => void {
    this.handshakeStartHandlers.add(handler);
    return () => this.handshakeStartHandlers.delete(handler);
  }

  public onHandshakeComplete(handler: HandshakeCompleteHandler): () => void {
    this.handshakeCompleteHandlers.add(handler);
    return () => this.handshakeCompleteHandlers.delete(handler);
  }

  public sendHandshakeRequest(targetId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = {
      type: 'handshake_request',
      payload: { targetId },
    };
    try {
      this.socket.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[MultiplayerClient] sendHandshakeRequest error:', err);
    }
  }

  public sendHandshakeAccept(requesterId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = {
      type: 'handshake_accept',
      payload: { requesterId },
    };
    try {
      this.socket.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[MultiplayerClient] sendHandshakeAccept error:', err);
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.stopPingLoop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('DISCONNECTED');
    this.welcomeHandlers.clear();
    this.playerJoinedHandlers.clear();
    this.playerLeftHandlers.clear();
    this.playerUpdatesHandlers.clear();
    this.statsHandlers.clear();
    this.handshakePromptHandlers.clear();
    this.handshakeStartHandlers.clear();
    this.handshakeCompleteHandlers.clear();
  }
}
