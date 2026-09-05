/**
 * =========================================================================
 * MessageTypes - Server & Client Network Protocol Contracts
 * =========================================================================
 */

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump';

export interface IVector3 {
  x: number;
  y: number;
  z: number;
}

export interface IPlayerNetworkState {
  id: string;
  name: string;
  position: IVector3;
  rotation: number; // Yaw angle in radians
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

export type ClientMessage =
  | IClientJoinMessage
  | IClientPlayerUpdateMessage
  | IClientPingMessage;

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

export type ServerMessage =
  | IServerWelcomeMessage
  | IServerPlayerJoinedMessage
  | IServerPlayerLeftMessage
  | IServerPlayerUpdatesMessage
  | IServerPongMessage;
