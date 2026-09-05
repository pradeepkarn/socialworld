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
import { Environment } from '../world/Environment';
import { AnimationState } from '@/types/game';

/**
 * References to the limb joint TransformNodes created for the Android Boy cyber rig.
 * Preserved as backup.
 */
export interface IPlayerLimbNodes {
  torso: TransformNode;
  head: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
}

/**
 * =========================================================================
 * AndroidBoyRig - BACKUP: Procedural Cyber Character Model ("Android Boy")
 * =========================================================================
 * WHAT IT DOES:
 * - Constructs the original articulated 3D character using geometric primitives:
 *   - Torso box with dark armored suit material
 *   - Glowing cyan Arc Reactor on the chest
 *   - Tactical backpack on the back
 *   - Head sphere with glowing cyber visor
 *   - Left & Right Arms (parented to shoulder pivot nodes)
 *   - Left & Right Legs (parented to hip pivot nodes)
 *
 * Preserved as an active backup so the project can switch back or use both avatars.
 */
export function buildAndroidBoyRig(
  scene: Scene,
  parent: TransformNode | AbstractMesh,
  environment: Environment
): { limbs: IPlayerLimbNodes; rootNode: TransformNode; meshes: AbstractMesh[] } {
  const rootNode = new TransformNode('player_android_boy_root', scene);
  rootNode.parent = parent;

  const meshes: AbstractMesh[] = [];

  // Materials
  const suitMat = new PBRMaterial('mat_player_suit_backup', scene);
  suitMat.albedoColor = new Color3(0.12, 0.14, 0.18);
  suitMat.metallic = 0.5;
  suitMat.roughness = 0.45;

  const armorMat = new PBRMaterial('mat_player_armor_backup', scene);
  armorMat.albedoColor = new Color3(0.05, 0.06, 0.08);
  armorMat.metallic = 0.85;
  armorMat.roughness = 0.25;

  const neonMat = new StandardMaterial('mat_player_neon_backup', scene);
  neonMat.emissiveColor = new Color3(0.0, 0.85, 1.0); // Cyber Cyan

  // --- Torso / Chest ---
  const torsoNode = new TransformNode('player_torso_node', scene);
  torsoNode.parent = rootNode;
  torsoNode.position.y = 1.05;

  const torsoMesh = MeshBuilder.CreateBox('player_torso', { width: 0.65, depth: 0.35, height: 0.65 }, scene);
  torsoMesh.parent = torsoNode;
  torsoMesh.material = suitMat;
  environment.addShadowCaster(torsoMesh);
  meshes.push(torsoMesh);

  // Glowing chest arc reactor
  const arcReactor = MeshBuilder.CreateCylinder('player_arc', { height: 0.05, diameter: 0.16 }, scene);
  arcReactor.rotation.x = Math.PI / 2;
  arcReactor.position = new Vector3(0, 0.05, 0.18);
  arcReactor.parent = torsoNode;
  arcReactor.material = neonMat;
  meshes.push(arcReactor);

  // Tactical Backpack
  const backpack = MeshBuilder.CreateBox('player_backpack', { width: 0.45, depth: 0.2, height: 0.5 }, scene);
  backpack.position = new Vector3(0, 0.05, -0.25);
  backpack.parent = torsoNode;
  backpack.material = armorMat;
  meshes.push(backpack);

  // --- Head & Visor ---
  const headNode = new TransformNode('player_head_node', scene);
  headNode.parent = torsoNode;
  headNode.position.y = 0.55;

  const headMesh = MeshBuilder.CreateSphere('player_head', { diameter: 0.38 }, scene);
  headMesh.parent = headNode;
  headMesh.material = armorMat;
  meshes.push(headMesh);

  // Glowing Visor
  const visor = MeshBuilder.CreateBox('player_visor', { width: 0.3, depth: 0.12, height: 0.1 }, scene);
  visor.position = new Vector3(0, 0.02, 0.16);
  visor.parent = headNode;
  visor.material = neonMat;
  meshes.push(visor);

  // --- Left Arm ---
  const leftArmNode = new TransformNode('player_left_arm_node', scene);
  leftArmNode.parent = torsoNode;
  leftArmNode.position = new Vector3(-0.45, 0.22, 0);

  const leftArmMesh = MeshBuilder.CreateCylinder('player_l_arm', { height: 0.58, diameter: 0.15 }, scene);
  leftArmMesh.position.y = -0.26;
  leftArmMesh.parent = leftArmNode;
  leftArmMesh.material = suitMat;
  meshes.push(leftArmMesh);

  // --- Right Arm ---
  const rightArmNode = new TransformNode('player_right_arm_node', scene);
  rightArmNode.parent = torsoNode;
  rightArmNode.position = new Vector3(0.45, 0.22, 0);

  const rightArmMesh = MeshBuilder.CreateCylinder('player_r_arm', { height: 0.58, diameter: 0.15 }, scene);
  rightArmMesh.position.y = -0.26;
  rightArmMesh.parent = rightArmNode;
  rightArmMesh.material = suitMat;
  meshes.push(rightArmMesh);

  // --- Left Leg ---
  const leftLegNode = new TransformNode('player_left_leg_node', scene);
  leftLegNode.parent = rootNode;
  leftLegNode.position = new Vector3(-0.2, 0.65, 0);

  const leftLegMesh = MeshBuilder.CreateCylinder('player_l_leg', { height: 0.65, diameter: 0.18 }, scene);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.parent = leftLegNode;
  leftLegMesh.material = armorMat;
  meshes.push(leftLegMesh);

  // Boot
  const leftBoot = MeshBuilder.CreateBox('player_l_boot', { width: 0.2, depth: 0.32, height: 0.14 }, scene);
  leftBoot.position = new Vector3(0, -0.62, 0.05);
  leftBoot.parent = leftLegNode;
  leftBoot.material = suitMat;
  meshes.push(leftBoot);

  // --- Right Leg ---
  const rightLegNode = new TransformNode('player_right_leg_node', scene);
  rightLegNode.parent = rootNode;
  rightLegNode.position = new Vector3(0.2, 0.65, 0);

  const rightLegMesh = MeshBuilder.CreateCylinder('player_r_leg', { height: 0.65, diameter: 0.18 }, scene);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.parent = rightLegNode;
  rightLegMesh.material = armorMat;
  meshes.push(rightLegMesh);

  // Boot
  const rightBoot = MeshBuilder.CreateBox('player_r_boot', { width: 0.2, depth: 0.32, height: 0.14 }, scene);
  rightBoot.position = new Vector3(0, -0.62, 0.05);
  rightBoot.parent = rightLegNode;
  rightBoot.material = suitMat;
  meshes.push(rightBoot);

  // Ensure all parts do not block player collision raycasting
  for (const m of meshes) {
    m.checkCollisions = false;
    m.isPickable = false;
  }

  const limbs: IPlayerLimbNodes = {
    torso: torsoNode,
    head: headNode,
    leftArm: leftArmNode,
    rightArm: rightArmNode,
    leftLeg: leftLegNode,
    rightLeg: rightLegNode,
  };

  return { limbs, rootNode, meshes };
}

/**
 * =========================================================================
 * AndroidBoyAnimation - BACKUP: Trigonometric Procedural Rig Animation
 * =========================================================================
 * Mathematical character animation for the Android Boy cyber character.
 */
export class AndroidBoyAnimation {
  private limbs: IPlayerLimbNodes;
  private currentState: AnimationState = 'idle';
  private animTimer: number = 0;

  constructor(limbs: IPlayerLimbNodes) {
    this.limbs = limbs;
  }

  public setState(state: AnimationState): void {
    this.currentState = state;
  }

  public getState(): AnimationState {
    return this.currentState;
  }

  public update(deltaTime: number): void {
    this.animTimer += deltaTime;
    const { torso, leftArm, rightArm, leftLeg, rightLeg } = this.limbs;

    switch (this.currentState) {
      case 'idle': {
        const breathe = Math.sin(this.animTimer * 2.2) * 0.03;
        torso.position.y = 1.05 + breathe;
        torso.rotation.x = 0;
        leftArm.rotation.x = Math.sin(this.animTimer * 1.8) * 0.05;
        rightArm.rotation.x = -Math.sin(this.animTimer * 1.8) * 0.05;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        break;
      }
      case 'walk': {
        const speed = 7.5;
        const phase = this.animTimer * speed;
        const legSwing = Math.sin(phase) * 0.55;
        const armSwing = Math.sin(phase) * 0.45;
        const hipBob = Math.abs(Math.cos(phase)) * 0.06;

        torso.position.y = 1.05 + hipBob;
        torso.rotation.x = 0.05;

        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftArm.rotation.x = -armSwing;
        rightArm.rotation.x = armSwing;
        break;
      }
      case 'run': {
        const speed = 13.0;
        const phase = this.animTimer * speed;
        const legSwing = Math.sin(phase) * 0.9;
        const armSwing = Math.sin(phase) * 0.8;
        const hipBob = Math.abs(Math.cos(phase)) * 0.12;

        torso.position.y = 1.05 + hipBob;
        torso.rotation.x = 0.18;

        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftArm.rotation.x = -armSwing;
        rightArm.rotation.x = armSwing;
        break;
      }
      case 'jump': {
        torso.position.y = 1.1;
        torso.rotation.x = 0.08;
        leftLeg.rotation.x = -0.45;
        rightLeg.rotation.x = -0.3;
        leftArm.rotation.x = 0.6;
        rightArm.rotation.x = 0.6;
        break;
      }
    }
  }

  public reset(): void {
    const { torso, leftArm, rightArm, leftLeg, rightLeg } = this.limbs;
    torso.position.y = 1.05;
    torso.rotation.setAll(0);
    leftArm.rotation.setAll(0);
    rightArm.rotation.setAll(0);
    leftLeg.rotation.setAll(0);
    rightLeg.rotation.setAll(0);
  }
}
