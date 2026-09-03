import { AnimationState, IVector3, IQuaternion } from '@/types/game';

/**
 * Protocol packet structures for future multiplayer replication over WebSocket.
 */
export interface IPlayerNetworkPacket {
  id: string;
  name: string;
  position: IVector3;
  rotation: IQuaternion;
  animationState: AnimationState;
  velocity: IVector3;
  timestamp: number;
}

export interface IChatMessagePacket {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface IShopTransactionPacket {
  playerId: string;
  shopId: string;
  productId: string;
  timestamp: number;
}

export type NetworkEventType =
  | 'player_joined'
  | 'player_moved'
  | 'player_left'
  | 'chat_message'
  | 'world_state_sync';
