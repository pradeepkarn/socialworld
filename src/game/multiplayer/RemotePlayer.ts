import {
  Scene,
  MeshBuilder,
  Vector3,
  AbstractMesh,
} from '@babylonjs/core';
import { PlayerAnimation } from '../player/PlayerAnimation';
import { PlayerAppearance, getDeterministicAppearance } from '../player/PlayerAppearance';
import { AvatarBuilder, IAvatarRigResult } from '../player/AvatarBuilder';
import { WorldSpaceLabel } from '../world/WorldSpaceLabel';
import { IPlayerNetworkState, AnimationState } from './NetworkTypes';

export class RemotePlayer {
  public readonly id: string;
  public readonly name: string;
  public readonly rootMesh: AbstractMesh;
  public readonly animation: PlayerAnimation;
  public readonly appearance: PlayerAppearance;
  public readonly nametag: WorldSpaceLabel;

  private scene: Scene;
  private targetPosition: Vector3;
  private currentRotationY: number = 0;
  private targetRotationY: number = 0;
  private avatarRig: IAvatarRigResult;
  private readonly LERP_SPEED = 12.0;
  private readonly SNAP_DISTANCE_THRESHOLD = 15.0;

  constructor(scene: Scene, initialState: IPlayerNetworkState) {
    this.scene = scene;
    this.id = initialState.id;
    this.name = initialState.name;

    // 1. Deterministically derive appearance parameters from player ID (identical to local player)
    this.appearance = getDeterministicAppearance(this.id);

    // 2. Root container node for the remote player
    this.rootMesh = MeshBuilder.CreateCapsule(
      `remote_player_${this.id}`,
      { radius: 0.45, height: 1.9, subdivisions: 6 },
      this.scene
    );
    this.rootMesh.isVisible = false; // Invisible physics/origin capsule
    this.rootMesh.isPickable = false;

    // Initial transform
    this.rootMesh.position = new Vector3(
      initialState.position.x,
      initialState.position.y,
      initialState.position.z
    );
    this.targetPosition = this.rootMesh.position.clone();
    this.currentRotationY = initialState.rotation;
    this.targetRotationY = initialState.rotation;
    this.rootMesh.rotation.y = this.currentRotationY;

    // 3. Build visual procedural avatar rig matching the local player via unified AvatarBuilder
    this.avatarRig = AvatarBuilder.buildAvatarRig(this.scene, this.rootMesh, this.appearance, {
      id: this.id,
      isLocal: false,
    });

    // 4. Initialize animation system with avatar-proportional torso base Y
    this.animation = new PlayerAnimation(this.avatarRig.limbs, this.avatarRig.rootTorsoY);
    this.animation.setState(initialState.animationState || 'idle');

    // 5. Overhead non-blooming, distance-scaling nametag (positioned cleanly above head)
    this.nametag = new WorldSpaceLabel(this.scene, {
      text: this.name,
      parent: this.rootMesh,
      offsetY: this.avatarRig.avatarHeight + 0.35,
      accentColorHex: this.appearance.accentColorHex,
      isSelf: false,
    });
  }

  private handshakePartnerTarget: AbstractMesh | Vector3 | null = null;
  private handshakeEndTimer: NodeJS.Timeout | null = null;

  /**
   * Sets new network targets received from the multiplayer server.
   */
  public setTargetState(state: IPlayerNetworkState): void {
    this.targetPosition.set(state.position.x, state.position.y, state.position.z);

    // If currently locked in a face-to-face handshake, prevent incoming network updates from turning avatar away
    if (!this.handshakePartnerTarget && this.animation.getState() !== 'handshake') {
      this.targetRotationY = state.rotation;
    }

    if (state.animationState) {
      this.animation.setState(state.animationState as AnimationState);
    }
  }

  /**
   * Locks remote avatar to continuously face handshake partner for the given duration.
   */
  public setHandshakePartner(partnerTarget: AbstractMesh | Vector3 | null, durationMs?: number): void {
    this.handshakePartnerTarget = partnerTarget;
    if (this.handshakeEndTimer) {
      clearTimeout(this.handshakeEndTimer);
      this.handshakeEndTimer = null;
    }

    if (partnerTarget) {
      const pos = partnerTarget instanceof Vector3 ? partnerTarget : partnerTarget.position;
      this.faceTarget(pos);
      this.animation.setState('handshake');

      if (durationMs) {
        this.handshakeEndTimer = setTimeout(() => {
          this.handshakePartnerTarget = null;
          this.handshakeEndTimer = null;
          this.animation.setState('idle');
        }, durationMs);
      }
    } else {
      this.animation.setState('idle');
    }
  }

  /**
   * Smoothly interpolates the remote player's position and rotation towards target values.
   * Runs in the 60 FPS Babylon render loop.
   */
  public update(deltaTime: number): void {
    // 1. Position Interpolation (LERP)
    const dist = Vector3.Distance(this.rootMesh.position, this.targetPosition);
    if (dist > this.SNAP_DISTANCE_THRESHOLD) {
      // Instant snap if distance is too large (e.g. teleport or initial spawn)
      this.rootMesh.position.copyFrom(this.targetPosition);
    } else {
      const t = Math.min(1.0, deltaTime * this.LERP_SPEED);
      Vector3.LerpToRef(this.rootMesh.position, this.targetPosition, t, this.rootMesh.position);
    }

    // 2. Rotation Interpolation / Continuous Handshake Face-to-Face lock
    if (this.handshakePartnerTarget && this.animation.getState() === 'handshake') {
      const pos = this.handshakePartnerTarget instanceof Vector3
        ? this.handshakePartnerTarget
        : this.handshakePartnerTarget.position;
      this.faceTarget(pos);
    } else {
      let angleDiff = this.targetRotationY - this.currentRotationY;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      const rotT = Math.min(1.0, deltaTime * this.LERP_SPEED);
      this.currentRotationY += angleDiff * rotT;
      this.rootMesh.rotation.y = this.currentRotationY;
    }

    // 3. Update procedural limb animations
    this.animation.update(deltaTime);

    // 4. Update nametag distance scaling
    this.nametag.update(this.scene.activeCamera || undefined);
  }

  /**
   * Faces a specific world position immediately.
   */
  public faceTarget(targetPos: Vector3): void {
    const dx = targetPos.x - this.rootMesh.position.x;
    const dz = targetPos.z - this.rootMesh.position.z;
    if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
      const yaw = Math.atan2(dx, dz);
      this.targetRotationY = yaw;
      this.currentRotationY = yaw;
      this.rootMesh.rotation.y = yaw;
    }
  }

  /**
   * Disposes of all meshes, materials, and the WorldSpaceLabel nametag.
   */
  public dispose(): void {
    if (this.handshakeEndTimer) {
      clearTimeout(this.handshakeEndTimer);
      this.handshakeEndTimer = null;
    }
    if (this.avatarRig) {
      this.avatarRig.dispose();
    }
    this.nametag.dispose();
    this.rootMesh.dispose(false, true);
  }
}
