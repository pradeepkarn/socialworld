import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  AbstractMesh,
} from '@babylonjs/core';
import { PlayerAnimation, IPlayerLimbNodes } from './PlayerAnimation';
import { PlayerController } from './PlayerController';
import { PlayerCamera } from './PlayerCamera';
import { Environment } from '../world/Environment';
import { PlayerAppearance, getDeterministicAppearance } from './PlayerAppearance';
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
 *   2. Visual Character Rig (`buildAvatarRig`): Cyber suit, glowing visor, and limbs.
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

  private suitMat!: PBRMaterial;
  private armorMat!: PBRMaterial;
  private neonMat!: StandardMaterial;
  private torsoNode!: TransformNode;
  private headNode!: TransformNode;
  private leftLegNode!: TransformNode;
  private rightLegNode!: TransformNode;

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
    this.appearance = getDeterministicAppearance(this.id);

    // 1. Root Collision Capsule (Invisible physics capsule)
    // The physics engine checks this pill-shaped capsule against walls and sidewalks.
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

    // 2. Build Humanoid Cyber Rig & Limbs (visual body parented to rootMesh)
    const limbs = this.buildAvatarRig(this.rootMesh, environment);

    // 2b. Overhead readable nametag
    this.nametag = new WorldSpaceLabel(this.scene, {
      text: this.name,
      parent: this.rootMesh,
      offsetY: 2.35 * this.appearance.heightScale,
      accentColorHex: this.appearance.accentColorHex,
    });
    this.applyAppearance(this.appearance);

    // 3. Initialize Animation System (drives limb rotations)
    this.animation = new PlayerAnimation(limbs);

    // 4. Initialize Camera System (smooth third-person follow camera)
    this.camera = new PlayerCamera(scene, canvas);
    this.camera.setTarget(this.rootMesh);

    // 5. Initialize Input Controller (WASD keyboard + mouse look)
    this.controller = new PlayerController(scene, this.rootMesh, this.camera, this.animation);
  }

  /**
   * =========================================================================
   * buildAvatarRig() - Procedural Cyber Character Model
   * =========================================================================
   * WHAT IT DOES:
   * - Constructs an articulated 3D character using geometric primitives:
   *   - Torso box with dark armored suit material
   *   - Glowing cyan Arc Reactor on the chest
   *   - Tactical backpack on the back
   *   - Head sphere with glowing cyber visor
   *   - Left & Right Arms (parented to shoulder pivot nodes)
   *   - Left & Right Legs (parented to hip pivot nodes)
   *
   * KEY CONCEPT: Pivot TransformNodes (`TransformNode`):
   * - If you rotate a cylinder arm directly, it rotates around its center (elbow).
   * - By placing a `TransformNode` at the shoulder/hip joint and parenting the arm/leg
   *   to it, swinging the limb pivots naturally from the shoulder/hip socket!
   */
  private buildAvatarRig(parent: AbstractMesh, environment: Environment): IPlayerLimbNodes {
    // Materials
    this.suitMat = new PBRMaterial('mat_player_suit', this.scene);
    this.suitMat.albedoColor = this.appearance.bodyColor;
    this.suitMat.metallic = 0.45;
    this.suitMat.roughness = 0.5;

    this.armorMat = new PBRMaterial('mat_player_armor', this.scene);
    this.armorMat.albedoColor = this.appearance.secondaryColor;
    this.armorMat.metallic = 0.85;
    this.armorMat.roughness = 0.25;

    this.neonMat = new StandardMaterial('mat_player_neon', this.scene);
    this.neonMat.emissiveColor = this.appearance.accentColor;

    // --- Torso / Chest ---
    const torsoNode = new TransformNode('player_torso_node', this.scene);
    torsoNode.parent = parent;
    torsoNode.position.y = 1.05;
    this.torsoNode = torsoNode;

    const torsoMesh = MeshBuilder.CreateBox('player_torso', { width: 0.65, depth: 0.35, height: 0.65 }, this.scene);
    torsoMesh.parent = torsoNode;
    torsoMesh.material = this.suitMat;
    environment.addShadowCaster(torsoMesh);

    // Glowing chest arc reactor
    const arcReactor = MeshBuilder.CreateCylinder('player_arc', { height: 0.05, diameter: 0.16 }, this.scene);
    arcReactor.rotation.x = Math.PI / 2;
    arcReactor.position = new Vector3(0, 0.05, 0.18);
    arcReactor.parent = torsoNode;
    arcReactor.material = this.neonMat;

    // Tactical Backpack
    const backpack = MeshBuilder.CreateBox('player_backpack', { width: 0.45, depth: 0.2, height: 0.5 }, this.scene);
    backpack.position = new Vector3(0, 0.05, -0.25);
    backpack.parent = torsoNode;
    backpack.material = this.armorMat;

    // --- Head & Visor ---
    const headNode = new TransformNode('player_head_node', this.scene);
    headNode.parent = torsoNode;
    headNode.position.y = 0.55;
    this.headNode = headNode;

    const headMesh = MeshBuilder.CreateSphere('player_head', { diameter: 0.38 }, this.scene);
    headMesh.parent = headNode;
    headMesh.material = this.armorMat;

    // Glowing Visor
    const visor = MeshBuilder.CreateBox('player_visor', { width: 0.3, depth: 0.12, height: 0.1 }, this.scene);
    visor.position = new Vector3(0, 0.02, 0.16);
    visor.parent = headNode;
    visor.material = this.neonMat;

    // --- Left Arm ---
    const leftArmNode = new TransformNode('player_left_arm_node', this.scene);
    leftArmNode.parent = torsoNode;
    leftArmNode.position = new Vector3(-0.45, 0.22, 0);

    const leftArmMesh = MeshBuilder.CreateCylinder('player_l_arm', { height: 0.58, diameter: 0.15 }, this.scene);
    leftArmMesh.position.y = -0.26;
    leftArmMesh.parent = leftArmNode;
    leftArmMesh.material = this.suitMat;

    // --- Right Arm ---
    const rightArmNode = new TransformNode('player_right_arm_node', this.scene);
    rightArmNode.parent = torsoNode;
    rightArmNode.position = new Vector3(0.45, 0.22, 0);

    const rightArmMesh = MeshBuilder.CreateCylinder('player_r_arm', { height: 0.58, diameter: 0.15 }, this.scene);
    rightArmMesh.position.y = -0.26;
    rightArmMesh.parent = rightArmNode;
    rightArmMesh.material = this.suitMat;

    // --- Left Leg ---
    const leftLegNode = new TransformNode('player_left_leg_node', this.scene);
    leftLegNode.parent = parent;
    leftLegNode.position = new Vector3(-0.2, 0.65, 0);
    this.leftLegNode = leftLegNode;

    const leftLegMesh = MeshBuilder.CreateCylinder('player_l_leg', { height: 0.65, diameter: 0.18 }, this.scene);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.parent = leftLegNode;
    leftLegMesh.material = this.armorMat;

    // Boot
    const leftBoot = MeshBuilder.CreateBox('player_l_boot', { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    leftBoot.position = new Vector3(0, -0.62, 0.05);
    leftBoot.parent = leftLegNode;
    leftBoot.material = this.suitMat;

    // --- Right Leg ---
    const rightLegNode = new TransformNode('player_right_leg_node', this.scene);
    rightLegNode.parent = parent;
    rightLegNode.position = new Vector3(0.2, 0.65, 0);
    this.rightLegNode = rightLegNode;

    const rightLegMesh = MeshBuilder.CreateCylinder('player_r_leg', { height: 0.65, diameter: 0.18 }, this.scene);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.parent = rightLegNode;
    rightLegMesh.material = this.armorMat;

    // Boot
    const rightBoot = MeshBuilder.CreateBox('player_r_boot', { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    rightBoot.position = new Vector3(0, -0.62, 0.05);
    rightBoot.parent = rightLegNode;
    rightBoot.material = this.suitMat;

    return {
      torso: torsoNode,
      head: headNode,
      leftArm: leftArmNode,
      rightArm: rightArmNode,
      leftLeg: leftLegNode,
      rightLeg: rightLegNode,
    };
  }

  public update(deltaTime: number): void {
    this.controller.update(deltaTime);
    this.camera.update();
    this.nametag.update(this.camera.camera);
  }

  /**
   * Applies deterministic appearance parameters (distinct body colors and subtle scale proportions).
   */
  public applyAppearance(appearance: PlayerAppearance): void {
    this.appearance = appearance;
    if (this.suitMat) this.suitMat.albedoColor = appearance.bodyColor;
    if (this.armorMat) this.armorMat.albedoColor = appearance.secondaryColor;
    if (this.neonMat) this.neonMat.emissiveColor = appearance.accentColor;

    if (this.torsoNode) {
      this.torsoNode.scaling.set(appearance.widthScale, appearance.heightScale, appearance.widthScale);
    }
    if (this.headNode) {
      this.headNode.scaling.set(appearance.headScale, appearance.headScale, appearance.headScale);
    }
    if (this.leftLegNode) {
      this.leftLegNode.scaling.set(1, appearance.heightScale, 1);
    }
    if (this.rightLegNode) {
      this.rightLegNode.scaling.set(1, appearance.heightScale, 1);
    }
    if (this.nametag) {
      this.nametag.mesh.position.y = 2.35 * appearance.heightScale;
      this.nametag.setText(this.name, appearance.accentColorHex);
    }
  }

  /**
   * Updates player's display name on the overhead nametag.
   */
  public updateName(name: string): void {
    this.name = name;
    if (this.nametag) {
      this.nametag.setText(name, this.appearance.accentColorHex);
    }
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
    if (this.nametag) {
      this.nametag.dispose();
    }
    this.controller.dispose();
    this.camera.dispose();
    this.rootMesh.dispose(false, true);
  }
}
