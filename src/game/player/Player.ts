import {
  Scene,
  MeshBuilder,
  Vector3,
  AbstractMesh,
} from '@babylonjs/core';
import { PlayerAnimation } from './PlayerAnimation';
import { PlayerController } from './PlayerController';
import { PlayerCamera } from './PlayerCamera';
import { Environment } from '../world/Environment';
import { PlayerAppearance, getDeterministicAppearance } from './PlayerAppearance';
import { AvatarBuilder, IAvatarRigResult } from './AvatarBuilder';
import { WorldSpaceLabel } from '../world/WorldSpaceLabel';
import { IInventoryItem, IPlayerState } from '@/types/game';

/**
 * =========================================================================
 * Player - The User's Avatar in the 3D Cyber City
 * =========================================================================
 * WHAT IT DOES:
 * - Represents the local player character in the game world.
 * - Coordinates 5 core subsystems:
 *   1. Physical Collision Capsule (`rootMesh`): Invisible hull that walks and bumps into walls.
 *   2. Visual Character Rig (`AvatarBuilder`): Procedural body proportions, face, hair, clothing & armor.
 *   3. Procedural Animation (`PlayerAnimation`): Swings arms & legs while running.
 *   4. Smooth Orbit Camera (`PlayerCamera`): Third-person camera following behind.
 *   5. Input Controller (`PlayerController`): Translates WASD keys into 3D movement.
 * - Manages RPG state: Wallet balance (`credits`) and item inventory.
 */
export class Player {
  public scene: Scene;
  public rootMesh: AbstractMesh;
  public camera: PlayerCamera;
  public controller: PlayerController;
  public animation: PlayerAnimation;
  public appearance: PlayerAppearance;
  public nametag: WorldSpaceLabel;

  private environment?: Environment;
  private avatarRig: IAvatarRigResult;

  // Player gameplay state
  public id: string = 'player_local';
  public name: string = 'Runner_07';
  public credits: number = 250;
  public inventory: IInventoryItem[] = [
    {
      id: 'item_starter_card',
      name: 'Citizen ID Card',
      description: 'Official NeoVerse civic identification pass.',
      price: 0,
      category: 'tech',
      icon: 'CreditCard',
      quantity: 1,
      equipped: true,
    },
  ];

  constructor(scene: Scene, canvas: HTMLCanvasElement, environment: Environment) {
    this.scene = scene;
    this.environment = environment;
    this.appearance = getDeterministicAppearance(this.id);

    // 1. Root Collision Capsule (Invisible physics capsule)
    this.rootMesh = MeshBuilder.CreateCapsule(
      'player_root',
      { radius: 0.45, height: 1.9, subdivisions: 8 },
      this.scene
    );
    this.rootMesh.position = new Vector3(0, 1.0, 8); // Spawn on central avenue promenade facing north
    this.rootMesh.isVisible = false;                // Invisible (we only see the avatar rig inside it)
    this.rootMesh.checkCollisions = true;           // Enables Babylon collision physics
    this.rootMesh.ellipsoid = new Vector3(0.45, 0.95, 0.45);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.95, 0);

    // 2. Build Humanoid Cyber Rig via Unified AvatarBuilder
    this.avatarRig = AvatarBuilder.buildAvatarRig(this.scene, this.rootMesh, this.appearance, {
      id: this.id,
      isLocal: true,
      environment: this.environment,
    });

    // 2b. Overhead readable nametag (positioned perfectly above head)
    this.nametag = new WorldSpaceLabel(this.scene, {
      text: this.name,
      parent: this.rootMesh,
      offsetY: this.avatarRig.avatarHeight + 0.35,
      accentColorHex: this.appearance.accentColorHex,
      isSelf: true,
    });

    // 3. Initialize Animation System (drives limb rotations)
    this.animation = new PlayerAnimation(this.avatarRig.limbs, this.avatarRig.rootTorsoY);

    // 4. Initialize Camera System (smooth third-person follow camera)
    this.camera = new PlayerCamera(scene, canvas);
    this.camera.setTarget(this.rootMesh);

    // 5. Initialize Input Controller (WASD keyboard + mouse look)
    this.controller = new PlayerController(scene, this.rootMesh, this.camera, this.animation);
  }

  private handshakePartnerTarget: AbstractMesh | Vector3 | null = null;
  private handshakeEndTimer: NodeJS.Timeout | null = null;

  public update(deltaTime: number): void {
    // Keep avatar directly facing handshake partner for the entire duration
    if (this.animation.getState() === 'handshake' && this.handshakePartnerTarget) {
      const pos = this.handshakePartnerTarget instanceof Vector3
        ? this.handshakePartnerTarget
        : this.handshakePartnerTarget.position;
      this.faceTarget(pos);
    }

    this.controller.update(deltaTime);
    this.camera.update(deltaTime);
    this.nametag.update(this.camera.camera);
  }

  /**
   * Applies deterministic appearance parameters (distinct body colors and proportions).
   */
  public applyAppearance(appearance: PlayerAppearance): void {
    this.appearance = appearance;

    if (this.avatarRig) {
      this.avatarRig.dispose();
    }

    this.avatarRig = AvatarBuilder.buildAvatarRig(this.scene, this.rootMesh, this.appearance, {
      id: this.id,
      isLocal: true,
      environment: this.environment,
    });

    if (this.animation) {
      this.animation.setLimbs(this.avatarRig.limbs, this.avatarRig.rootTorsoY);
    }

    if (this.nametag) {
      this.nametag.mesh.position.y = this.avatarRig.avatarHeight + 0.35;
      this.nametag.setText(this.name, appearance.accentColorHex, true);
    }
  }

  /**
   * Updates player's display name on the overhead nametag.
   */
  public updateName(name: string): void {
    this.name = name;
    if (this.nametag) {
      this.nametag.setText(name, this.appearance.accentColorHex, true);
    }
  }

  /**
   * Smoothly orients the player avatar to face a target position.
   */
  public faceTarget(targetPos: Vector3): void {
    const dx = targetPos.x - this.rootMesh.position.x;
    const dz = targetPos.z - this.rootMesh.position.z;
    if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
      const yaw = Math.atan2(dx, dz);
      this.rootMesh.rotation.y = yaw;
    }
  }

  /**
   * Plays handshake action: locks movement, faces partner, sets state to handshake for durationMs.
   */
  public playHandshake(partnerTarget: AbstractMesh | Vector3, durationMs: number = 2000): void {
    this.handshakePartnerTarget = partnerTarget;
    const pos = partnerTarget instanceof Vector3 ? partnerTarget : partnerTarget.position;
    this.faceTarget(pos);
    this.animation.setState('handshake');
    this.controller.setLocked(true, true);

    if (this.handshakeEndTimer) {
      clearTimeout(this.handshakeEndTimer);
    }

    this.handshakeEndTimer = setTimeout(() => {
      this.handshakePartnerTarget = null;
      this.handshakeEndTimer = null;
      this.animation.setState('idle');
      this.controller.setLocked(false);
    }, durationMs);
  }

  public getState(): IPlayerState {
    const vel = this.controller.getVelocity();
    return {
      id: this.id,
      name: this.name,
      position: {
        x: this.rootMesh.position.x,
        y: this.rootMesh.position.y,
        z: this.rootMesh.position.z,
      },
      rotation: {
        x: this.rootMesh.rotation.x,
        y: this.rootMesh.rotation.y,
        z: this.rootMesh.rotation.z,
        w: 1,
      },
      animationState: this.animation.getState(),
      velocity: {
        x: vel ? vel.x : 0,
        y: vel ? vel.y : 0,
        z: vel ? vel.z : 0,
      },
      isGrounded: this.controller.getIsGrounded(),
      credits: this.credits,
      inventory: this.inventory,
    };
  }

  public addCredits(amount: number): void {
    this.credits += amount;
  }

  public deductCredits(amount: number): boolean {
    if (this.credits >= amount) {
      this.credits -= amount;
      return true;
    }
    return false;
  }

  public addItem(item: IInventoryItem): void {
    const existing = this.inventory.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      this.inventory.push({ ...item });
    }
  }

  public dispose(): void {
    if (this.handshakeEndTimer) {
      clearTimeout(this.handshakeEndTimer);
      this.handshakeEndTimer = null;
    }
    if (this.avatarRig) {
      this.avatarRig.dispose();
    }
    if (this.nametag) {
      this.nametag.dispose();
    }
    this.controller.dispose();
    this.camera.dispose();
    this.rootMesh.dispose(false, true);
  }
}
