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
import { IInventoryItem, IPlayerState } from '@/types/game';

export class Player {
  public scene: Scene;
  public rootMesh: AbstractMesh;
  public camera: PlayerCamera;
  public controller: PlayerController;
  public animation: PlayerAnimation;

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

    // 1. Root Collision Ellipsoid
    this.rootMesh = MeshBuilder.CreateCapsule(
      'player_root',
      { radius: 0.45, height: 1.9, subdivisions: 8 },
      this.scene
    );
    this.rootMesh.position = new Vector3(0, 1.0, 8); // Spawn on central avenue promenade facing north
    this.rootMesh.isVisible = false;
    this.rootMesh.checkCollisions = true;
    this.rootMesh.ellipsoid = new Vector3(0.45, 0.95, 0.45);
    this.rootMesh.ellipsoidOffset = new Vector3(0, 0.95, 0);

    // 2. Build Humanoid Cyber Rig & Limbs
    const limbs = this.buildAvatarRig(this.rootMesh, environment);

    // 3. Initialize Animation System
    this.animation = new PlayerAnimation(limbs);

    // 4. Initialize Camera System
    this.camera = new PlayerCamera(scene, canvas);
    this.camera.setTarget(this.rootMesh);

    // 5. Initialize Input Controller
    this.controller = new PlayerController(scene, this.rootMesh, this.camera, this.animation);
  }

  /**
   * Constructs the stylized humanoid mesh rig with articulated joints.
   */
  private buildAvatarRig(parent: AbstractMesh, environment: Environment): IPlayerLimbNodes {
    // Materials
    const suitMat = new PBRMaterial('mat_player_suit', this.scene);
    suitMat.albedoColor = new Color3(0.12, 0.14, 0.18);
    suitMat.metallic = 0.5;
    suitMat.roughness = 0.45;

    const armorMat = new PBRMaterial('mat_player_armor', this.scene);
    armorMat.albedoColor = new Color3(0.05, 0.06, 0.08);
    armorMat.metallic = 0.85;
    armorMat.roughness = 0.25;

    const neonMat = new StandardMaterial('mat_player_neon', this.scene);
    neonMat.emissiveColor = new Color3(0.0, 0.85, 1.0); // Cyber Cyan

    // --- Torso / Chest ---
    const torsoNode = new TransformNode('player_torso_node', this.scene);
    torsoNode.parent = parent;
    torsoNode.position.y = 1.05;

    const torsoMesh = MeshBuilder.CreateBox('player_torso', { width: 0.65, depth: 0.35, height: 0.65 }, this.scene);
    torsoMesh.parent = torsoNode;
    torsoMesh.material = suitMat;
    environment.addShadowCaster(torsoMesh);

    // Glowing chest arc reactor
    const arcReactor = MeshBuilder.CreateCylinder('player_arc', { height: 0.05, diameter: 0.16 }, this.scene);
    arcReactor.rotation.x = Math.PI / 2;
    arcReactor.position = new Vector3(0, 0.05, 0.18);
    arcReactor.parent = torsoNode;
    arcReactor.material = neonMat;

    // Tactical Backpack
    const backpack = MeshBuilder.CreateBox('player_backpack', { width: 0.45, depth: 0.2, height: 0.5 }, this.scene);
    backpack.position = new Vector3(0, 0.05, -0.25);
    backpack.parent = torsoNode;
    backpack.material = armorMat;

    // --- Head & Visor ---
    const headNode = new TransformNode('player_head_node', this.scene);
    headNode.parent = torsoNode;
    headNode.position.y = 0.55;

    const headMesh = MeshBuilder.CreateSphere('player_head', { diameter: 0.38 }, this.scene);
    headMesh.parent = headNode;
    headMesh.material = armorMat;

    // Glowing Visor
    const visor = MeshBuilder.CreateBox('player_visor', { width: 0.3, depth: 0.12, height: 0.1 }, this.scene);
    visor.position = new Vector3(0, 0.02, 0.16);
    visor.parent = headNode;
    visor.material = neonMat;

    // --- Left Arm ---
    const leftArmNode = new TransformNode('player_left_arm_node', this.scene);
    leftArmNode.parent = torsoNode;
    leftArmNode.position = new Vector3(-0.45, 0.22, 0);

    const leftArmMesh = MeshBuilder.CreateCylinder('player_l_arm', { height: 0.58, diameter: 0.15 }, this.scene);
    leftArmMesh.position.y = -0.26;
    leftArmMesh.parent = leftArmNode;
    leftArmMesh.material = suitMat;

    // --- Right Arm ---
    const rightArmNode = new TransformNode('player_right_arm_node', this.scene);
    rightArmNode.parent = torsoNode;
    rightArmNode.position = new Vector3(0.45, 0.22, 0);

    const rightArmMesh = MeshBuilder.CreateCylinder('player_r_arm', { height: 0.58, diameter: 0.15 }, this.scene);
    rightArmMesh.position.y = -0.26;
    rightArmMesh.parent = rightArmNode;
    rightArmMesh.material = suitMat;

    // --- Left Leg ---
    const leftLegNode = new TransformNode('player_left_leg_node', this.scene);
    leftLegNode.parent = parent;
    leftLegNode.position = new Vector3(-0.2, 0.65, 0);

    const leftLegMesh = MeshBuilder.CreateCylinder('player_l_leg', { height: 0.65, diameter: 0.18 }, this.scene);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.parent = leftLegNode;
    leftLegMesh.material = armorMat;

    // Boot
    const leftBoot = MeshBuilder.CreateBox('player_l_boot', { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    leftBoot.position = new Vector3(0, -0.62, 0.05);
    leftBoot.parent = leftLegNode;
    leftBoot.material = suitMat;

    // --- Right Leg ---
    const rightLegNode = new TransformNode('player_right_leg_node', this.scene);
    rightLegNode.parent = parent;
    rightLegNode.position = new Vector3(0.2, 0.65, 0);

    const rightLegMesh = MeshBuilder.CreateCylinder('player_r_leg', { height: 0.65, diameter: 0.18 }, this.scene);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.parent = rightLegNode;
    rightLegMesh.material = armorMat;

    // Boot
    const rightBoot = MeshBuilder.CreateBox('player_r_boot', { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    rightBoot.position = new Vector3(0, -0.62, 0.05);
    rightBoot.parent = rightLegNode;
    rightBoot.material = suitMat;

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
  }

  public getState(): IPlayerState {
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
      velocity: { x: 0, y: 0, z: 0 },
      isGrounded: true,
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
    this.rootMesh.dispose(false, true);
  }
}
