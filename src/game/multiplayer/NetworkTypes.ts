import { AnimationState, IVector3, IQuaternion } from '@/types/game';

/**
 * =========================================================================
 * NetworkTypes - The Multiplayer Communication Protocol (Data Contracts)
 * =========================================================================
 * WHAT THIS FILE DOES:
 * - Defines the standardized "envelopes" (data packets) sent over the network
 *   (via WebSockets or WebRTC) between the game client and the multiplayer server.
 * - Ensures both the server and every player speak the exact same language.
 *
 * KEY MULTIPLAYER CONCEPTS:
 * 1. Network Serialization:
 *    When you move, your computer converts your (X, Y, Z) coordinates and
 *    animation state into a compact JSON packet and sends it across the internet.
 * 2. Quaternions for Rotation:
 *    Instead of simple pitch/yaw/roll angles (which suffer from a mathematical
 *    glitch called "gimbal lock"), we use a 4D Quaternion (x, y, z, w) to
 *    smoothly and accurately rotate other players in 3D space.
 * 3. Timestamps & Latency:
 *    Internet packets can arrive out-of-order. The `timestamp` allows the client
 *    to discard old, outdated packets and smoothly interpolate movement.
 */

/**
 * =========================================================================
 * IPlayerNetworkPacket - Player Transform & State Replication
 * =========================================================================
 * Sent at a steady rate (e.g. 20-30 times per second) from each player:
 * - id: The unique session identifier for this player.
 * - name: The player's display name shown above their avatar.
 * - position: Current (X, Y, Z) coordinates in the city.
 * - rotation: 4D Quaternion orientation.
 * - animationState: Tells other players whether to play 'idle', 'walk', 'run', or 'jump'.
 * - velocity: Speed vector, allowing remote clients to extrapolate movement if lag occurs.
 * - timestamp: Millisecond timestamp for network synchronization.
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

/**
 * =========================================================================
 * IChatMessagePacket - Multiplayer Chat Text
 * =========================================================================
 * Sent when a player types a message into the in-game chat box:
 * - senderId & senderName: Identifies who sent the message.
 * - text: The actual text message string.
 * - timestamp: When the message was delivered.
 */
export interface IChatMessagePacket {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

/**
 * =========================================================================
 * IShopTransactionPacket - Server-Validated Purchases
 * =========================================================================
 * Sent when an item is bought:
 * In competitive multiplayer, the authoritative server verifies that the player
 * genuinely has enough money before approving the purchase (preventing client-side cheating).
 */
export interface IShopTransactionPacket {
  playerId: string;
  shopId: string;
  productId: string;
  timestamp: number;
}

/**
 * =========================================================================
 * NetworkEventType - Event Dispatch Flags
 * =========================================================================
 * Categorizes the type of event incoming from the server:
 * - 'player_joined': A new runner just connected into the city.
 * - 'player_moved': A remote player sent an updated position packet.
 * - 'player_left': A player disconnected or closed their browser.
 * - 'chat_message': A new chat line was broadcasted to the room.
 * - 'world_state_sync': Full sync snapshot of all players and shops in the city.
 */
export type NetworkEventType =
  | 'player_joined'
  | 'player_moved'
  | 'player_left'
  | 'chat_message'
  | 'world_state_sync';
