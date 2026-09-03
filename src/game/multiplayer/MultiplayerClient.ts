import { IPlayerNetworkPacket, IChatMessagePacket } from './NetworkTypes';

export type RemotePlayerJoinedHandler = (packet: IPlayerNetworkPacket) => void;
export type RemotePlayerMovedHandler = (packet: IPlayerNetworkPacket) => void;
export type RemotePlayerLeftHandler = (playerId: string) => void;
export type ChatMessageHandler = (message: IChatMessagePacket) => void;

/**
 * Modular client interface ready for WebSocket / WebRTC multiplayer synchronization.
 */
export class MultiplayerClient {
  private isConnected: boolean = false;
  private serverUrl: string | null = null;

  private onPlayerJoinedHandlers: Set<RemotePlayerJoinedHandler> = new Set();
  private onPlayerMovedHandlers: Set<RemotePlayerMovedHandler> = new Set();
  private onPlayerLeftHandlers: Set<RemotePlayerLeftHandler> = new Set();
  private onChatMessageHandlers: Set<ChatMessageHandler> = new Set();

  constructor() {}

  /**
   * Connects to the authoritative multiplayer game server via WebSocket.
   */
  public async connect(serverUrl: string): Promise<boolean> {
    this.serverUrl = serverUrl;
    console.log(`[MultiplayerClient] Configured server endpoint: ${serverUrl}`);
    // Ready for WebSocket instantiation: this.socket = new WebSocket(serverUrl);
    this.isConnected = false;
    return false;
  }

  /**
   * Dispatches local player position, rotation, and animation state to server.
   */
  public broadcastPlayerState(packet: IPlayerNetworkPacket): void {
    if (!this.isConnected) return;
    // Ready for: this.socket.send(JSON.stringify({ type: 'player_state', ...packet }));
  }

  /**
   * Dispatches a chat message to other players in the city.
   */
  public sendChatMessage(text: string): void {
    if (!this.isConnected) return;
    // Ready for: this.socket.send(JSON.stringify({ type: 'chat', text }));
  }

  public onPlayerJoined(handler: RemotePlayerJoinedHandler): () => void {
    this.onPlayerJoinedHandlers.add(handler);
    return () => this.onPlayerJoinedHandlers.delete(handler);
  }

  public onPlayerMoved(handler: RemotePlayerMovedHandler): () => void {
    this.onPlayerMovedHandlers.add(handler);
    return () => this.onPlayerMovedHandlers.delete(handler);
  }

  public onPlayerLeft(handler: RemotePlayerLeftHandler): () => void {
    this.onPlayerLeftHandlers.add(handler);
    return () => this.onPlayerLeftHandlers.delete(handler);
  }

  public onChatMessage(handler: ChatMessageHandler): () => void {
    this.onChatMessageHandlers.add(handler);
    return () => this.onChatMessageHandlers.delete(handler);
  }

  public disconnect(): void {
    this.isConnected = false;
    this.onPlayerJoinedHandlers.clear();
    this.onPlayerMovedHandlers.clear();
    this.onPlayerLeftHandlers.clear();
    this.onChatMessageHandlers.clear();
  }
}
