import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  AbstractMesh,
} from '@babylonjs/core';
import { PlayerAnimation, IPlayerLimbNodes } from '../player/PlayerAnimation';
import { PlayerAppearance, getDeterministicAppearance } from '../player/PlayerAppearance';
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
  private readonly LERP_SPEED = 12.0;
  private readonly SNAP_DISTANCE_THRESHOLD = 15.0;

  constructor(scene: Scene, initialState: IPlayerNetworkState) {
    this.scene = scene;
    this.id = initialState.id;
    this.name = initialState.name;

    // 1. Deterministically derive appearance parameters (distinct color, scale) from player ID
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

    // 3. Build visual procedural avatar rig matching the local player style with appearance colors
    const limbs = this.buildAvatarRig(this.rootMesh);

    // 4. Initialize animation system
    this.animation = new PlayerAnimation(limbs);
    this.animation.setState(initialState.animationState || 'idle');

    // 5. Overhead non-blooming, distance-scaling nametag
    this.nametag = new WorldSpaceLabel(this.scene, {
      text: this.name,
      parent: this.rootMesh,
      offsetY: 2.35 * this.appearance.heightScale,
      accentColorHex: this.appearance.accentColorHex,
    });
  }

  /**
   * Sets new network targets received from the multiplayer server.
   */
  public setTargetState(state: IPlayerNetworkState): void {
    this.targetPosition.set(state.position.x, state.position.y, state.position.z);
    this.targetRotationY = state.rotation;

    if (state.animationState) {
      this.animation.setState(state.animationState as AnimationState);
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

    // 2. Rotation Interpolation (Shortest angular distance)
    let angleDiff = this.targetRotationY - this.currentRotationY;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    const rotT = Math.min(1.0, deltaTime * this.LERP_SPEED);
    this.currentRotationY += angleDiff * rotT;
    this.rootMesh.rotation.y = this.currentRotationY;

    // 3. Update procedural limb animations
    this.animation.update(deltaTime);

    // 4. Update nametag distance scaling
    this.nametag.update(this.scene.activeCamera || undefined);
  }

  /**
   * Builds the procedural avatar rig applying the player's unique colors and proportions.
   */
  private buildAvatarRig(parent: AbstractMesh): IPlayerLimbNodes {
    // Suit material with player's distinct body color
    const suitMat = new StandardMaterial(`mat_remote_suit_${this.id}`, this.scene);
    suitMat.diffuseColor = this.appearance.bodyColor;
    suitMat.specularColor = new Color3(0.3, 0.3, 0.3);
    suitMat.maxSimultaneousLights = 4;

    // Armor material with secondary color
    const armorMat = new StandardMaterial(`mat_remote_armor_${this.id}`, this.scene);
    armorMat.diffuseColor = this.appearance.secondaryColor;
    armorMat.specularColor = new Color3(0.5, 0.5, 0.5);
    armorMat.maxSimultaneousLights = 4;

    // Glowing visor and arc reactor with accent color
    const neonMat = new StandardMaterial(`mat_remote_neon_${this.id}`, this.scene);
    neonMat.emissiveColor = this.appearance.accentColor;
    neonMat.maxSimultaneousLights = 4;

    // --- Torso / Chest ---
    const torsoNode = new TransformNode(`remote_torso_${this.id}`, this.scene);
    torsoNode.parent = parent;
    torsoNode.position.y = 1.05;
    torsoNode.scaling.set(
      this.appearance.widthScale,
      this.appearance.heightScale,
      this.appearance.widthScale
    );

    const torsoMesh = MeshBuilder.CreateBox(`remote_t_mesh_${this.id}`, { width: 0.65, depth: 0.35, height: 0.65 }, this.scene);
    torsoMesh.parent = torsoNode;
    torsoMesh.material = suitMat;
    torsoMesh.isPickable = false;

    // Glowing arc reactor
    const arcReactor = MeshBuilder.CreateCylinder(`remote_arc_${this.id}`, { height: 0.05, diameter: 0.16 }, this.scene);
    arcReactor.rotation.x = Math.PI / 2;
    arcReactor.position = new Vector3(0, 0.05, 0.18);
    arcReactor.parent = torsoNode;
    arcReactor.material = neonMat;
    arcReactor.isPickable = false;

    // Tactical Backpack
    const backpack = MeshBuilder.CreateBox(`remote_bp_${this.id}`, { width: 0.45, depth: 0.2, height: 0.5 }, this.scene);
    backpack.position = new Vector3(0, 0.05, -0.25);
    backpack.parent = torsoNode;
    backpack.material = armorMat;
    backpack.isPickable = false;

    // --- Head & Visor ---
    const headNode = new TransformNode(`remote_head_${this.id}`, this.scene);
    headNode.parent = torsoNode;
    headNode.position.y = 0.55;
    headNode.scaling.set(
      this.appearance.headScale,
      this.appearance.headScale,
      this.appearance.headScale
    );

    const headMesh = MeshBuilder.CreateSphere(`remote_h_mesh_${this.id}`, { diameter: 0.38 }, this.scene);
    headMesh.parent = headNode;
    headMesh.material = armorMat;
    headMesh.isPickable = false;

    // Glowing Visor
    const visor = MeshBuilder.CreateBox(`remote_visor_${this.id}`, { width: 0.3, depth: 0.12, height: 0.1 }, this.scene);
    visor.position = new Vector3(0, 0.02, 0.16);
    visor.parent = headNode;
    visor.material = neonMat;
    visor.isPickable = false;

    // --- Left Arm ---
    const leftArmNode = new TransformNode(`remote_l_arm_node_${this.id}`, this.scene);
    leftArmNode.parent = torsoNode;
    leftArmNode.position = new Vector3(-0.45, 0.22, 0);

    const leftArmMesh = MeshBuilder.CreateCylinder(`remote_l_arm_${this.id}`, { height: 0.58, diameter: 0.15 }, this.scene);
    leftArmMesh.position.y = -0.26;
    leftArmMesh.parent = leftArmNode;
    leftArmMesh.material = suitMat;
    leftArmMesh.isPickable = false;

    // --- Right Arm ---
    const rightArmNode = new TransformNode(`remote_r_arm_node_${this.id}`, this.scene);
    rightArmNode.parent = torsoNode;
    rightArmNode.position = new Vector3(0.45, 0.22, 0);

    const rightArmMesh = MeshBuilder.CreateCylinder(`remote_r_arm_${this.id}`, { height: 0.58, diameter: 0.15 }, this.scene);
    rightArmMesh.position.y = -0.26;
    rightArmMesh.parent = rightArmNode;
    rightArmMesh.material = suitMat;
    rightArmMesh.isPickable = false;

    // --- Left Leg ---
    const leftLegNode = new TransformNode(`remote_l_leg_node_${this.id}`, this.scene);
    leftLegNode.parent = parent;
    leftLegNode.position = new Vector3(-0.2, 0.65, 0);
    leftLegNode.scaling.set(1, this.appearance.heightScale, 1);

    const leftLegMesh = MeshBuilder.CreateCylinder(`remote_l_leg_${this.id}`, { height: 0.65, diameter: 0.18 }, this.scene);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.parent = leftLegNode;
    leftLegMesh.material = armorMat;
    leftLegMesh.isPickable = false;

    // Boot
    const leftBoot = MeshBuilder.CreateBox(`remote_l_boot_${this.id}`, { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    leftBoot.position = new Vector3(0, -0.62, 0.05);
    leftBoot.parent = leftLegNode;
    leftBoot.material = suitMat;
    leftBoot.isPickable = false;

    // --- Right Leg ---
    const rightLegNode = new TransformNode(`remote_r_leg_node_${this.id}`, this.scene);
    rightLegNode.parent = parent;
    rightLegNode.position = new Vector3(0.2, 0.65, 0);
    rightLegNode.scaling.set(1, this.appearance.heightScale, 1);

    const rightLegMesh = MeshBuilder.CreateCylinder(`remote_r_leg_${this.id}`, { height: 0.65, diameter: 0.18 }, this.scene);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.parent = rightLegNode;
    rightLegMesh.material = armorMat;
    rightLegMesh.isPickable = false;

    // Boot
    const rightBoot = MeshBuilder.CreateBox(`remote_r_boot_${this.id}`, { width: 0.2, depth: 0.32, height: 0.14 }, this.scene);
    rightBoot.position = new Vector3(0, -0.62, 0.05);
    rightBoot.parent = rightLegNode;
    rightBoot.material = suitMat;
    rightBoot.isPickable = false;

    return {
      torso: torsoNode,
      head: headNode,
      leftArm: leftArmNode,
      rightArm: rightArmNode,
      leftLeg: leftLegNode,
      rightLeg: rightLegNode,
    };
  }

  /**
   * Disposes of all meshes, materials, and the WorldSpaceLabel nametag.
   */
  public dispose(): void {
    this.nametag.dispose();
    this.rootMesh.dispose(false, true);
  }
}
