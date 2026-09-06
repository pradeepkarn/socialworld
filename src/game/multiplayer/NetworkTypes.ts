import { AnimationState, IVector3 } from '@/types/game';

export type { AnimationState, IVector3 };

export type NetworkStatus = 'CONNECTING' | 'ONLINE' | 'DISCONNECTED' | 'ERROR';

export interface INetworkStats {
  status: NetworkStatus;
  playerCount: number;
  ping: number;
}

export interface IPlayerNetworkState {
  id: string;
  name: string;
  position: IVector3;
  rotation: number; // Yaw in radians
  animationState: AnimationState;
  velocity?: IVector3;
  timestamp: number;
}

// -------------------------------------------------------------------------
// Client-to-Server Packets
// -------------------------------------------------------------------------

export interface IClientJoinMessage {
  type: 'join';
  payload: {
    name?: string;
  };
}

export interface IClientPlayerUpdateMessage {
  type: 'player_update';
  payload: {
    position: IVector3;
    rotation: number;
    animationState: AnimationState;
    velocity?: IVector3;
    timestamp: number;
  };
}

export interface IClientPingMessage {
  type: 'ping';
  payload: {
    timestamp: number;
  };
}

export interface IClientHandshakeRequestMessage {
  type: 'handshake_request';
  payload: {
    targetId: string;
  };
}

export interface IClientHandshakeAcceptMessage {
  type: 'handshake_accept';
  payload: {
    requesterId: string;
  };
}

export type ClientMessage =
  | IClientJoinMessage
  | IClientPlayerUpdateMessage
  | IClientPingMessage
  | IClientHandshakeRequestMessage
  | IClientHandshakeAcceptMessage;

// -------------------------------------------------------------------------
// Server-to-Client Packets
// -------------------------------------------------------------------------

export interface IServerWelcomeMessage {
  type: 'welcome';
  payload: {
    id: string;
    name: string;
    spawnPosition: IVector3;
    players: IPlayerNetworkState[];
  };
}

export interface IServerPlayerJoinedMessage {
  type: 'player_joined';
  payload: {
    player: IPlayerNetworkState;
  };
}

export interface IServerPlayerLeftMessage {
  type: 'player_left';
  payload: {
    id: string;
  };
}

export interface IServerPlayerUpdatesMessage {
  type: 'player_updates';
  payload: {
    updates: IPlayerNetworkState[];
    timestamp: number;
  };
}

export interface IServerPongMessage {
  type: 'pong';
  payload: {
    timestamp: number;
    serverTime: number;
  };
}

export interface IServerHandshakePromptMessage {
  type: 'handshake_prompt';
  payload: {
    fromId: string;
    fromName: string;
  };
}

export interface IServerHandshakeStartMessage {
  type: 'handshake_start';
  payload: {
    player1Id: string;
    player2Id: string;
    durationMs: number;
  };
}

export interface IServerHandshakeCompleteMessage {
  type: 'handshake_complete';
  payload: {
    player1Id: string;
    player2Id: string;
    rewardCredits: number;
  };
}

export type ServerMessage =
  | IServerWelcomeMessage
  | IServerPlayerJoinedMessage
  | IServerPlayerLeftMessage
  | IServerPlayerUpdatesMessage
  | IServerPongMessage
  | IServerHandshakePromptMessage
  | IServerHandshakeStartMessage
  | IServerHandshakeCompleteMessage;
