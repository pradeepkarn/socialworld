import {
  Scene,
  MeshBuilder,
  Vector3,
  TransformNode,
  AbstractMesh,
  SceneLoader,
  ISceneLoaderAsyncResult,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { PlayerAnimation } from './PlayerAnimation';
import { PlayerController } from './PlayerController';
import { PlayerCamera } from './PlayerCamera';
import { Environment } from '../world/Environment';
import { IInventoryItem, IPlayerState } from '@/types/game';
import { buildAndroidBoyRig, IPlayerLimbNodes } from './AndroidBoyRig';

export type AvatarType = 'cute_creature' | 'android_boy';

/**
 * =========================================================================
 * Player - The User's Avatar in the 3D Cyber City
 * =========================================================================
 * WHAT IT DOES:
 * - Represents the local player character in the game world.
 * - Primary Character Model: "Cute Creature" (rigged 3D monster with custom textures
 *   and idle, walk, run, jump animation clips loaded from /models/cute_creature.glb).
 * - Backup Character Rig: "Android Boy" (original procedural cyber suit kept fully
 *   intact in AndroidBoyRig.ts for backup and switching).
 * - Coordinates 5 core subsystems:
 *   1. Physical Collision Capsule (`rootMesh`): Invisible hull that walks and bumps into walls.
 *   2. Visual Character Rig: Cute Creature 3D Model / Android Boy backup.
 *   3. Animation System (`PlayerAnimation`): Drives GLTF animation groups or procedural limbs.
 *   4. Smooth Orbit Camera (`PlayerCamera`): Third-person camera following behind.
 *   5. Input Controller (`PlayerController`): Translates WASD keys into 3D movement.
 */
export class Player {
  public scene: Scene;
  public rootMesh: AbstractMesh;
  public camera: PlayerCamera;
  public controller: PlayerController;
  public animation: PlayerAnimation;

  // Active avatar representation
  private avatarType: AvatarType = 'cute_creature';
  private avatarRoot: TransformNode;
  private environment: Environment;

  // Cute creature meshes and loaded result
  private cuteCreatureMeshes: AbstractMesh[] = [];
  private cuteCreatureLoaded: boolean = false;

  // Android boy backup elements
  private androidBoyRoot?: TransformNode;
  private androidBoyLimbs?: IPlayerLimbNodes;
  private androidBoyMeshes: AbstractMesh[] = [];

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

    // 1. Root Collision Capsule (Invisible physics capsule)
    // The physics engine checks this pill-shaped capsule against walls and sidewalks.
    this.rootMesh = MeshBuilder.CreateCapsule(
      'player_root',
      { radius: 0.45, height: 1.9, subdivisions: 8 },
      this.scene
    );
    this.rootMesh.position = new Vector3(0, 1.0, 8); // Spawn on central avenue promenade facing north
    this.rootMesh.isVisible = false;                // Invisible (we only see the avatar model inside it)
    this.rootMesh.checkCollisions = true;           // Enables Babylon collision physics
    this.rootMesh.ellipsoid = new Vector3(0.45, 0.95, 0.45);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.95, 0);

    // 2. Avatar Container
    this.avatarRoot = new TransformNode('player_avatar_root', this.scene);
    this.avatarRoot.parent = this.rootMesh;

    // 3. Initialize Animation System
    this.animation = new PlayerAnimation();

    // 4. Initialize Camera System (smooth third-person follow camera)
    this.camera = new PlayerCamera(scene, canvas);
    this.camera.setTarget(this.rootMesh);

    // 5. Initialize Input Controller (WASD keyboard + mouse look)
    this.controller = new PlayerController(scene, this.rootMesh, this.camera, this.animation);

    // 6. Load Primary Avatar: Cute Creature
    this.loadCuteCreatureAvatar();
  }

  /**
   * =========================================================================
   * loadCuteCreatureAvatar() - Loads the Cute Creature 3D Model
   * =========================================================================
   * Imports the rigged GLB model with textures and animations (idle, walk, run, jump).
   */
  private async loadCuteCreatureAvatar(): Promise<void> {
    try {
      const result: ISceneLoaderAsyncResult = await SceneLoader.ImportMeshAsync(
        '',
        '/models/',
        'cute_creature.glb',
        this.scene
      );

      this.cuteCreatureLoaded = true;

      const rootNode = result.meshes[0];
      rootNode.name = 'player_cute_creature_root';
      rootNode.parent = this.avatarRoot;

      // Ensure creature meshes are non-colliding, cast shadows, and clamp lights
      for (const mesh of result.meshes) {
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        if (!mesh.name.startsWith('player_')) {
          mesh.name = `player_${mesh.name}`;
        }
        if (mesh.material && 'maxSimultaneousLights' in mesh.material) {
          // Restrict simultaneous lights to 4 to prevent WebGL uniform buffer limit errors
          (mesh.material as { maxSimultaneousLights?: number }).maxSimultaneousLights = 4;
        }
        this.environment.addShadowCaster(mesh);
        this.cuteCreatureMeshes.push(mesh);
      }

      // Exclude distant street lamp lights from player meshes so vertex shader doesn't exceed UBO limit
      for (const light of this.scene.lights) {
        if (light.name.startsWith('lamp_light_')) {
          for (const mesh of this.cuteCreatureMeshes) {
            light.excludedMeshes.push(mesh);
          }
        }
      }

      // Position creature so feet touch ground at bottom of physics capsule (local y = 0.0)
      rootNode.position = new Vector3(0, 0, 0);
      rootNode.rotation = new Vector3(0, 0, 0);

      // Connect animation clips (idle, walk, run, jump)
      if (result.animationGroups && result.animationGroups.length > 0) {
        this.animation.setAnimationGroups(result.animationGroups);
      }

      // If avatar is set to Android Boy, hide cute creature
      if (this.avatarType === 'android_boy') {
        this.setCuteCreatureVisible(false);
      }
    } catch (error) {
      console.warn('[Player] Failed to load cute_creature.glb, falling back to Android Boy backup:', error);
      this.switchToAndroidBoyBackup();
    }
  }

  /**
   * =========================================================================
   * Android Boy Backup System
   * =========================================================================
   * Allows activating or falling back to the original procedural Android Boy rig.
   */
  public switchToAndroidBoyBackup(): void {
    this.avatarType = 'android_boy';
    this.setCuteCreatureVisible(false);

    if (!this.androidBoyRoot) {
      const rig = buildAndroidBoyRig(this.scene, this.avatarRoot, this.environment);
      this.androidBoyRoot = rig.rootNode;
      this.androidBoyLimbs = rig.limbs;
      this.androidBoyMeshes = rig.meshes;
    }

    if (this.androidBoyRoot) {
      this.androidBoyRoot.setEnabled(true);
    }
    if (this.androidBoyLimbs) {
      this.animation.setLimbNodes(this.androidBoyLimbs);
    }
  }

  /**
   * Switches active avatar back to Cute Creature.
   */
  public switchToCuteCreature(): void {
    this.avatarType = 'cute_creature';
    if (this.androidBoyRoot) {
      this.androidBoyRoot.setEnabled(false);
    }
    this.setCuteCreatureVisible(true);
    this.animation.reset();
  }

  /**
   * Toggles avatar between Cute Creature and Android Boy.
   */
  public toggleAvatar(): AvatarType {
    if (this.avatarType === 'cute_creature') {
      this.switchToAndroidBoyBackup();
    } else {
      this.switchToCuteCreature();
    }
    return this.avatarType;
  }

  public getAvatarType(): AvatarType {
    return this.avatarType;
  }

  private setCuteCreatureVisible(visible: boolean): void {
    for (const mesh of this.cuteCreatureMeshes) {
      mesh.isVisible = visible;
      mesh.setEnabled(visible);
    }
  }

  public update(deltaTime: number): void {
    this.controller.update(deltaTime);
    this.camera.update();
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
    this.controller.dispose();
    this.camera.dispose();
    this.animation.dispose();
    this.rootMesh.dispose(false, true);
  }
}
