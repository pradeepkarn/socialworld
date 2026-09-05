import { Scene } from '@babylonjs/core';
import { RemotePlayer } from './RemotePlayer';
import { IPlayerNetworkState } from './NetworkTypes';

export class RemotePlayerManager {
  private scene: Scene;
  private remotePlayers: Map<string, RemotePlayer> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a new remote player avatar in the 3D scene.
   */
  public spawnPlayer(state: IPlayerNetworkState): RemotePlayer {
    if (this.remotePlayers.has(state.id)) {
      const existing = this.remotePlayers.get(state.id)!;
      existing.setTargetState(state);
      return existing;
    }

    const player = new RemotePlayer(this.scene, state);
    this.remotePlayers.set(state.id, player);
    console.log(`[RemotePlayerManager] Spawned remote avatar for: ${state.name} (${state.id})`);
    return player;
  }

  /**
   * Updates an existing remote player's target position and state, or spawns if missing.
   */
  public updatePlayerState(state: IPlayerNetworkState): void {
    const existing = this.remotePlayers.get(state.id);
    if (existing) {
      existing.setTargetState(state);
    } else {
      this.spawnPlayer(state);
    }
  }

  /**
   * Synchronizes a batch of player states received from a tick broadcast.
   */
  public handleBatchUpdates(updates: IPlayerNetworkState[]): void {
    for (const update of updates) {
      this.updatePlayerState(update);
    }
  }

  /**
   * Removes a player when they disconnect and frees all associated 3D resources.
   */
  public removePlayer(id: string): void {
    const player = this.remotePlayers.get(id);
    if (player) {
      player.dispose();
      this.remotePlayers.delete(id);
      console.log(`[RemotePlayerManager] Disposed remote avatar for (${id})`);
    }
  }

  /**
   * Interpolates all remote avatars towards their targets. Called every render frame (60 FPS).
   */
  public update(deltaTime: number): void {
    for (const player of this.remotePlayers.values()) {
      player.update(deltaTime);
    }
  }

  /**
   * Returns the map of all active remote players.
   */
  public getPlayers(): Map<string, RemotePlayer> {
    return this.remotePlayers;
  }

  /**
   * Returns the number of active remote players currently rendered in the world.
   */
  public getCount(): number {
    return this.remotePlayers.size;
  }

  /**
   * Cleans up all remote players.
   */
  public dispose(): void {
    for (const player of this.remotePlayers.values()) {
      player.dispose();
    }
    this.remotePlayers.clear();
  }
}
