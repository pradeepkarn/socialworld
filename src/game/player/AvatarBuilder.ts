import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  AbstractMesh,
  Mesh,
} from '@babylonjs/core';
import { PlayerAppearance } from './PlayerAppearance';
import { IPlayerLimbNodes } from './PlayerAnimation';
import { Environment } from '../world/Environment';

export interface AvatarRigOptions {
  id: string;
  isLocal?: boolean;
  environment?: Environment;
}

export interface IAvatarRigResult {
  limbs: IPlayerLimbNodes;
  rootTorsoY: number;
  avatarHeight: number;
  meshes: AbstractMesh[];
  dispose: () => void;
}

/**
 * Global material cache to reuse StandardMaterials across all avatars by color key.
 * Keeps draw call state changes and GPU memory minimal.
 */
class MaterialCache {
  private static cache: Map<string, StandardMaterial> = new Map();

  public static getMaterial(
    scene: Scene,
    key: string,
    diffuseColor: Color3,
    specularPower: number = 16,
    specularColor: Color3 = new Color3(0.25, 0.25, 0.25)
  ): StandardMaterial {
    const fullKey = `${key}_${diffuseColor.toHexString()}`;
    let mat = this.cache.get(fullKey);
    if (!mat || mat.getScene() !== scene) {
      mat = new StandardMaterial(`mat_cache_${fullKey}`, scene);
      mat.diffuseColor = diffuseColor;
      mat.specularColor = specularColor;
      mat.specularPower = specularPower;
      mat.maxSimultaneousLights = 4;
      this.cache.set(fullKey, mat);
    }
    return mat;
  }

  public static getEmissiveMaterial(
    scene: Scene,
    key: string,
    emissiveColor: Color3
  ): StandardMaterial {
    const fullKey = `emissive_${key}_${emissiveColor.toHexString()}`;
    let mat = this.cache.get(fullKey);
    if (!mat || mat.getScene() !== scene) {
      mat = new StandardMaterial(`mat_cache_${fullKey}`, scene);
      mat.emissiveColor = emissiveColor;
      mat.diffuseColor = emissiveColor;
      mat.maxSimultaneousLights = 4;
      this.cache.set(fullKey, mat);
    }
    return mat;
  }
}

/**
 * =========================================================================
 * AvatarBuilder - Unified Procedural Avatar Rig Factory
 * =========================================================================
 * WHAT IT DOES:
 * - Serves as the single source of truth for constructing 3D player characters.
 * - Used identically by both local `Player` and network `RemotePlayer` instances.
 * - Procedurally generates:
 *   1. 8 distinct body types with anatomical proportions.
 *   2. Natural skin tone rendering with face type & optic variations.
 *   3. 8 distinct procedural hairstyles using lightweight primitives.
 *   4. 6 cyber armor archetypes and 6 distinct accessories.
 *   5. Calculates precise top-of-head height for nametag alignment.
 *   6. Articulates limb nodes for the procedural animation engine.
 */
export class AvatarBuilder {
  public static buildAvatarRig(
    scene: Scene,
    parent: AbstractMesh,
    app: PlayerAppearance,
    options: AvatarRigOptions
  ): IAvatarRigResult {
    const { id, isLocal = false, environment } = options;
    const meshes: AbstractMesh[] = [];

    // Helper to register meshes for shadows and cleanup
    const register = <T extends AbstractMesh>(mesh: T): T => {
      mesh.isPickable = false;
      meshes.push(mesh);
      if (isLocal && environment && mesh instanceof Mesh) {
        environment.addShadowCaster(mesh);
      }
      return mesh;
    };

    // 1. Shared Materials from MaterialCache
    const skinMat = MaterialCache.getMaterial(scene, 'skin', app.skinColor, 8, new Color3(0.15, 0.15, 0.15));
    const topMat = MaterialCache.getMaterial(scene, 'top', app.topColor, 24);
    const pantsMat = MaterialCache.getMaterial(scene, 'pants', app.pantsColor, 16);
    const shoeMat = MaterialCache.getMaterial(scene, 'shoe', app.shoeColor, 32);
    const armorMat = MaterialCache.getMaterial(scene, 'armor', app.armorColor, 40, new Color3(0.5, 0.5, 0.5));
    const hairMat = MaterialCache.getMaterial(scene, 'hair', app.hairColor, 12);
    const neonMat = MaterialCache.getEmissiveMaterial(scene, 'neon', app.accentColor);
    const darkMetalMat = MaterialCache.getMaterial(scene, 'metal', new Color3(0.1, 0.12, 0.15), 64);

    // 2. Anatomical Proportions
    const legLength = 0.65 * app.legLength;
    const torsoHeight = 0.65 * app.bodyHeight;
    const torsoWidth = 0.65 * app.bodyWidth;
    const torsoDepth = 0.35 * app.bodyDepth;
    const shoulderWidth = 0.45 * app.shoulderWidth;
    const armLength = 0.58 * app.armLength;
    const headScale = 0.38 * app.headScale;

    // Torso Y Pivot Position
    const rootTorsoY = legLength + torsoHeight * 0.5 + 0.05;

    // -------------------------------------------------------------------------
    // 3. Torso & Armor
    // -------------------------------------------------------------------------
    const torsoNode = new TransformNode(`torso_node_${id}`, scene);
    torsoNode.parent = parent;
    torsoNode.position.y = rootTorsoY;

    // Base procedural torso mesh based on geometric torsoShape archetype
    let torsoMesh: AbstractMesh;
    const shape = app.torsoShape || 'box';

    switch (shape) {
      case 'cylinder': {
        // Sleek rounded cylinder chassis with smooth 24-sided silhouette
        torsoMesh = register(
          MeshBuilder.CreateCylinder(
            `torso_${id}`,
            { height: torsoHeight, diameter: torsoWidth, tessellation: 24 },
            scene
          )
        );
        torsoMesh.scaling.z = torsoDepth / torsoWidth;
        break;
      }
      case 'sphere': {
        // Futuristic spherical / orb core torso
        torsoMesh = register(
          MeshBuilder.CreateSphere(
            `torso_${id}`,
            { diameterX: torsoWidth, diameterY: torsoHeight, diameterZ: torsoDepth, segments: 16 },
            scene
          )
        );
        // Tech belt / mechanical waist girder around the lower equator
        const waistGirder = register(
          MeshBuilder.CreateTorus(
            `torso_girder_${id}`,
            { diameter: torsoWidth * 0.94, thickness: 0.05, tessellation: 20 },
            scene
          )
        );
        waistGirder.rotation.x = Math.PI / 2;
        waistGirder.position.y = -torsoHeight * 0.28;
        waistGirder.parent = torsoNode;
        waistGirder.material = armorMat;
        break;
      }
      case 'capsule': {
        // Aerodynamic pill/capsule torso with rounded top and bottom caps
        torsoMesh = register(
          MeshBuilder.CreateCapsule(
            `torso_${id}`,
            { height: torsoHeight, radius: torsoWidth * 0.46, tessellation: 16, subdivisions: 2 },
            scene
          )
        );
        torsoMesh.scaling.z = torsoDepth / torsoWidth;
        break;
      }
      case 'wedge': {
        // Athletic inverted V-taper trapezoid (wider shoulders, tapered waist)
        torsoMesh = register(
          MeshBuilder.CreateCylinder(
            `torso_${id}`,
            {
              height: torsoHeight,
              diameterTop: torsoWidth * 1.10,
              diameterBottom: torsoWidth * 0.74,
              tessellation: 4,
            },
            scene
          )
        );
        torsoMesh.rotation.y = Math.PI / 4;
        torsoMesh.scaling.z = torsoDepth / torsoWidth;
        break;
      }
      case 'hexagonal': {
        // 6-sided faceted cybernetic carapace
        torsoMesh = register(
          MeshBuilder.CreateCylinder(
            `torso_${id}`,
            { height: torsoHeight, diameter: torsoWidth * 1.02, tessellation: 6 },
            scene
          )
        );
        torsoMesh.rotation.y = Math.PI / 6;
        torsoMesh.scaling.z = torsoDepth / torsoWidth;
        break;
      }
      case 'box':
      default: {
        // Classic crisp cyber runner rectangular torso
        torsoMesh = register(
          MeshBuilder.CreateBox(
            `torso_${id}`,
            { width: torsoWidth, depth: torsoDepth, height: torsoHeight },
            scene
          )
        );
        break;
      }
    }

    torsoMesh.parent = torsoNode;
    torsoMesh.material = topMat;

    // Glowing chest arc reactor core
    const arcReactor = register(
      MeshBuilder.CreateCylinder(`arc_${id}`, { height: 0.05, diameter: 0.15 * app.bodyWidth }, scene)
    );
    arcReactor.rotation.x = Math.PI / 2;
    arcReactor.position = new Vector3(0, 0.04, torsoDepth * 0.5 + 0.02);
    arcReactor.parent = torsoNode;
    arcReactor.material = neonMat;

    // Tactical Backpack / Power Cell
    const backpack = register(
      MeshBuilder.CreateBox(
        `backpack_${id}`,
        { width: torsoWidth * 0.72, depth: 0.18, height: torsoHeight * 0.75 },
        scene
      )
    );
    backpack.position = new Vector3(0, 0.02, -torsoDepth * 0.5 - 0.09);
    backpack.parent = torsoNode;
    backpack.material = armorMat;

    // --- Armor Archetype Variation (0..5) ---
    switch (app.armorType) {
      case 0: { // Scout Harness: X-straps
        const strap1 = register(
          MeshBuilder.CreateBox(`armor_strap1_${id}`, { width: 0.08, height: torsoHeight * 0.95, depth: 0.03 }, scene)
        );
        strap1.rotation.z = 0.35;
        strap1.position = new Vector3(0, 0, torsoDepth * 0.5 + 0.015);
        strap1.parent = torsoNode;
        strap1.material = darkMetalMat;

        const strap2 = register(
          MeshBuilder.CreateBox(`armor_strap2_${id}`, { width: 0.08, height: torsoHeight * 0.95, depth: 0.03 }, scene)
        );
        strap2.rotation.z = -0.35;
        strap2.position = new Vector3(0, 0, torsoDepth * 0.5 + 0.015);
        strap2.parent = torsoNode;
        strap2.material = darkMetalMat;
        break;
      }
      case 1: { // Heavy Ballistic: Reinforced front chest plate
        const chestPlate = register(
          MeshBuilder.CreateBox(
            `armor_plate_${id}`,
            { width: torsoWidth * 0.88, depth: 0.08, height: torsoHeight * 0.65 },
            scene
          )
        );
        chestPlate.position = new Vector3(0, 0.06, torsoDepth * 0.5 + 0.04);
        chestPlate.parent = torsoNode;
        chestPlate.material = armorMat;
        break;
      }
      case 2: { // Asymmetrical Commando: Tactical shoulder sash & badge
        const sash = register(
          MeshBuilder.CreateBox(
            `armor_sash_${id}`,
            { width: 0.14, height: torsoHeight * 1.05, depth: 0.05 },
            scene
          )
        );
        sash.rotation.z = -0.52;
        sash.position = new Vector3(0.02, 0.02, torsoDepth * 0.5 + 0.02);
        sash.parent = torsoNode;
        sash.material = armorMat;
        break;
      }
      case 3: { // Tech Hoodie Collar
        const collar = register(
          MeshBuilder.CreateTorus(
            `armor_collar_${id}`,
            { diameter: torsoWidth * 0.52, thickness: 0.08, tessellation: 16 },
            scene
          )
        );
        collar.position = new Vector3(0, torsoHeight * 0.5, 0);
        collar.parent = torsoNode;
        collar.material = topMat;
        break;
      }
      case 4: { // Exosuit Ribs
        for (let i = -1; i <= 1; i++) {
          const ribL = register(
            MeshBuilder.CreateBox(`armor_rib_l_${id}_${i}`, { width: 0.06, height: 0.05, depth: torsoDepth * 0.8 }, scene)
          );
          ribL.position = new Vector3(-torsoWidth * 0.5 - 0.02, i * 0.12, 0);
          ribL.parent = torsoNode;
          ribL.material = neonMat;

          const ribR = register(
            MeshBuilder.CreateBox(`armor_rib_r_${id}_${i}`, { width: 0.06, height: 0.05, depth: torsoDepth * 0.8 }, scene)
          );
          ribR.position = new Vector3(torsoWidth * 0.5 + 0.02, i * 0.12, 0);
          ribR.parent = torsoNode;
          ribR.material = neonMat;
        }
        break;
      }
      case 5: { // Chevron Runner Vest
        const chevron = register(
          MeshBuilder.CreateCylinder(`armor_chev_${id}`, { height: 0.04, diameter: torsoWidth * 0.5, tessellation: 3 }, scene)
        );
        chevron.rotation.x = Math.PI / 2;
        chevron.rotation.z = Math.PI;
        chevron.position = new Vector3(0, 0.08, torsoDepth * 0.5 + 0.02);
        chevron.parent = torsoNode;
        chevron.material = armorMat;
        break;
      }
    }

    // -------------------------------------------------------------------------
    // 4. Head, Face & Hairstyle
    // -------------------------------------------------------------------------
    const headNode = new TransformNode(`head_node_${id}`, scene);
    headNode.parent = torsoNode;
    headNode.position.y = torsoHeight * 0.5 + headScale * 0.55;

    // Head base geometry based on faceType
    let headMesh: AbstractMesh;
    if (app.faceType === 1 || app.faceType === 2) {
      // Chiseled or Square jawline
      headMesh = register(
        MeshBuilder.CreateBox(
          `head_${id}`,
          { width: headScale * 0.94, height: headScale, depth: headScale * 0.96 },
          scene
        )
      );
    } else {
      // Oval, Narrow, Round, or Cyber-Augmented
      headMesh = register(
        MeshBuilder.CreateSphere(
          `head_${id}`,
          { diameterX: headScale * (app.faceType === 3 ? 0.88 : 0.98), diameterY: headScale, diameterZ: headScale * 0.96, segments: 12 },
          scene
        )
      );
    }
    headMesh.parent = headNode;
    headMesh.material = skinMat;

    // Jaw / Chin contour
    const jaw = register(
      MeshBuilder.CreateBox(
        `jaw_${id}`,
        { width: headScale * 0.62 * app.jawWidth, height: 0.07, depth: headScale * 0.45 },
        scene
      )
    );
    jaw.position = new Vector3(0, -headScale * 0.42, headScale * 0.18);
    jaw.parent = headNode;
    jaw.material = skinMat;

    // Subtle Nose
    const nose = register(
      MeshBuilder.CreateBox(
        `nose_${id}`,
        { width: 0.045 * app.noseSize, height: 0.08 * app.noseSize, depth: 0.06 * app.noseSize },
        scene
      )
    );
    nose.position = new Vector3(0, -0.02, headScale * 0.5 + 0.015);
    nose.parent = headNode;
    nose.material = skinMat;

    // --- Eye / Optic Style (0..4) ---
    switch (app.eyeStyle) {
      case 0: { // Classic Cyber Visor
        const visor = register(
          MeshBuilder.CreateBox(
            `visor_${id}`,
            { width: headScale * 0.82 * app.eyeSize, depth: 0.10, height: 0.09 * app.eyeSize },
            scene
          )
        );
        visor.position = new Vector3(0, 0.04, headScale * 0.45 + 0.02);
        visor.parent = headNode;
        visor.material = neonMat;
        break;
      }
      case 1: { // Bilateral Cyber Optics (Dual eyes)
        const eyeOffset = 0.09 * app.eyeSpacing;
        const eyeL = register(
          MeshBuilder.CreateCylinder(`eye_l_${id}`, { height: 0.04, diameter: 0.07 * app.eyeSize }, scene)
        );
        eyeL.rotation.x = Math.PI / 2;
        eyeL.position = new Vector3(-eyeOffset, 0.04, headScale * 0.47);
        eyeL.parent = headNode;
        eyeL.material = neonMat;

        const eyeR = register(
          MeshBuilder.CreateCylinder(`eye_r_${id}`, { height: 0.04, diameter: 0.07 * app.eyeSize }, scene)
        );
        eyeR.rotation.x = Math.PI / 2;
        eyeR.position = new Vector3(eyeOffset, 0.04, headScale * 0.47);
        eyeR.parent = headNode;
        eyeR.material = neonMat;
        break;
      }
      case 2: { // Tactical Goggles
        const goggles = register(
          MeshBuilder.CreateTorus(
            `goggles_${id}`,
            { diameter: headScale * 0.75, thickness: 0.06, tessellation: 16 },
            scene
          )
        );
        goggles.rotation.x = Math.PI / 2;
        goggles.position = new Vector3(0, 0.05, headScale * 0.38);
        goggles.parent = headNode;
        goggles.material = darkMetalMat;

        const lens = register(
          MeshBuilder.CreateBox(`goggle_lens_${id}`, { width: headScale * 0.7, height: 0.08, depth: 0.05 }, scene)
        );
        lens.position = new Vector3(0, 0.05, headScale * 0.44);
        lens.parent = headNode;
        lens.material = neonMat;
        break;
      }
      case 3: { // Monocle HUD Lens (Right Eye)
        const monocle = register(
          MeshBuilder.CreateCylinder(`monocle_${id}`, { height: 0.04, diameter: 0.10 * app.eyeSize }, scene)
        );
        monocle.rotation.x = Math.PI / 2;
        monocle.position = new Vector3(0.08, 0.04, headScale * 0.48);
        monocle.parent = headNode;
        monocle.material = neonMat;

        const frame = register(
          MeshBuilder.CreateBox(`mono_frame_${id}`, { width: 0.12, height: 0.02, depth: 0.18 }, scene)
        );
        frame.position = new Vector3(0.12, 0.04, headScale * 0.35);
        frame.parent = headNode;
        frame.material = darkMetalMat;
        break;
      }
      case 4: { // Split Dual Visor
        for (let s = -1; s <= 1; s += 2) {
          const splitV = register(
            MeshBuilder.CreateBox(
              `split_v_${id}_${s}`,
              { width: headScale * 0.36 * app.eyeSize, depth: 0.08, height: 0.07 },
              scene
            )
          );
          splitV.rotation.y = s * 0.15;
          splitV.position = new Vector3(s * 0.11, 0.04, headScale * 0.46);
          splitV.parent = headNode;
          splitV.material = neonMat;
        }
        break;
      }
    }

    // --- Procedural Hairstyles (0..7) ---
    switch (app.hairStyle) {
      case 0: { // Buzzcut Fade: Sleek cranial cap
        const buzz = register(
          MeshBuilder.CreateSphere(
            `hair_buzz_${id}`,
            { diameterX: headScale * 1.02, diameterY: headScale * 0.98, diameterZ: headScale * 1.02, slice: 0.55 },
            scene
          )
        );
        buzz.rotation.x = Math.PI;
        buzz.position = new Vector3(0, headScale * 0.10, 0);
        buzz.parent = headNode;
        buzz.material = hairMat;
        break;
      }
      case 1: { // Flat Top
        const flat = register(
          MeshBuilder.CreateBox(
            `hair_flat_${id}`,
            { width: headScale * 0.94, depth: headScale * 0.92, height: headScale * 0.35 },
            scene
          )
        );
        flat.position = new Vector3(0, headScale * 0.52, 0);
        flat.parent = headNode;
        flat.material = hairMat;
        break;
      }
      case 2: { // Side-Swept Undercut
        const sweep = register(
          MeshBuilder.CreateBox(
            `hair_sweep_${id}`,
            { width: headScale * 0.88, depth: headScale * 0.94, height: headScale * 0.28 },
            scene
          )
        );
        sweep.rotation.z = -0.25;
        sweep.position = new Vector3(-0.04, headScale * 0.48, 0.02);
        sweep.parent = headNode;
        sweep.material = hairMat;
        break;
      }
      case 3: { // Afro / Textured Crop
        const afro = register(
          MeshBuilder.CreateSphere(
            `hair_afro_${id}`,
            { diameterX: headScale * 1.22, diameterY: headScale * 1.08, diameterZ: headScale * 1.20, segments: 12 },
            scene
          )
        );
        afro.position = new Vector3(0, headScale * 0.25, -0.02);
        afro.parent = headNode;
        afro.material = hairMat;
        break;
      }
      case 4: { // Cyber Spikes / Punk Crest
        for (let i = 0; i < 4; i++) {
          const spike = register(
            MeshBuilder.CreateCylinder(
              `hair_spike_${id}_${i}`,
              { height: headScale * 0.32, diameterTop: 0.02, diameterBottom: 0.10, tessellation: 4 },
              scene
            )
          );
          spike.rotation.x = (i - 1.5) * 0.35;
          spike.position = new Vector3(0, headScale * 0.52, (i - 1.5) * 0.09);
          spike.parent = headNode;
          spike.material = hairMat;
        }
        break;
      }
      case 5: { // Cyber Topknot / Bun
        const baseCap = register(
          MeshBuilder.CreateSphere(
            `hair_cap_${id}`,
            { diameterX: headScale * 1.03, diameterY: headScale * 0.95, diameterZ: headScale * 1.03, slice: 0.6 },
            scene
          )
        );
        baseCap.rotation.x = Math.PI;
        baseCap.position = new Vector3(0, headScale * 0.12, 0);
        baseCap.parent = headNode;
        baseCap.material = hairMat;

        const bun = register(
          MeshBuilder.CreateCylinder(`hair_bun_${id}`, { height: 0.14, diameter: headScale * 0.48 }, scene)
        );
        bun.position = new Vector3(0, headScale * 0.58, -0.05);
        bun.parent = headNode;
        bun.material = hairMat;

        const pin = register(
          MeshBuilder.CreateCylinder(`hair_pin_${id}`, { height: 0.32, diameter: 0.02 }, scene)
        );
        pin.rotation.z = Math.PI / 2;
        pin.position = new Vector3(0, headScale * 0.58, -0.05);
        pin.parent = headNode;
        pin.material = neonMat;
        break;
      }
      case 6: { // Slicked Back
        const slick = register(
          MeshBuilder.CreateBox(
            `hair_slick_${id}`,
            { width: headScale * 0.88, depth: headScale * 1.12, height: headScale * 0.22 },
            scene
          )
        );
        slick.rotation.x = -0.22;
        slick.position = new Vector3(0, headScale * 0.46, -0.08);
        slick.parent = headNode;
        slick.material = hairMat;
        break;
      }
      case 7: { // Cable Dreads
        const cap = register(
          MeshBuilder.CreateSphere(
            `hair_cap_${id}`,
            { diameterX: headScale * 1.04, diameterY: headScale * 0.95, diameterZ: headScale * 1.04, slice: 0.55 },
            scene
          )
        );
        cap.rotation.x = Math.PI;
        cap.position = new Vector3(0, headScale * 0.12, 0);
        cap.parent = headNode;
        cap.material = hairMat;

        for (let d = -2; d <= 2; d++) {
          const dread = register(
            MeshBuilder.CreateCylinder(`hair_dread_${id}_${d}`, { height: 0.45, diameter: 0.045 }, scene)
          );
          dread.rotation.x = -0.3;
          dread.rotation.z = d * 0.15;
          dread.position = new Vector3(d * 0.07, headScale * 0.15, -headScale * 0.42);
          dread.parent = headNode;
          dread.material = hairMat;
        }
        break;
      }
    }

    // --- Procedural Accessories (0..5) ---
    switch (app.accessoryType) {
      case 1: { // Cyber Monocle HUD
        const lens = register(
          MeshBuilder.CreateCylinder(`acc_monocle_${id}`, { height: 0.03, diameter: 0.12 }, scene)
        );
        lens.rotation.x = Math.PI / 2;
        lens.position = new Vector3(-0.09, 0.04, headScale * 0.48);
        lens.parent = headNode;
        lens.material = neonMat;
        break;
      }
      case 2: { // Ear Comms Headset
        const comms = register(
          MeshBuilder.CreateCylinder(`acc_comms_${id}`, { height: 0.05, diameter: 0.11 }, scene)
        );
        comms.rotation.z = Math.PI / 2;
        comms.position = new Vector3(headScale * 0.48, 0, 0);
        comms.parent = headNode;
        comms.material = darkMetalMat;

        const mic = register(
          MeshBuilder.CreateBox(`acc_mic_${id}`, { width: 0.02, height: 0.02, depth: 0.18 }, scene)
        );
        mic.position = new Vector3(headScale * 0.46, -0.06, 0.12);
        mic.parent = headNode;
        mic.material = neonMat;
        break;
      }
      case 3: { // Tactical Shoulder Pauldron (Left Shoulder)
        const pauldron = register(
          MeshBuilder.CreateBox(
            `acc_pauldron_${id}`,
            { width: 0.22, depth: 0.24, height: 0.14 },
            scene
          )
        );
        pauldron.position = new Vector3(-shoulderWidth - 0.06, 0.20, 0);
        pauldron.parent = torsoNode;
        pauldron.material = armorMat;
        break;
      }
      case 4: { // Rebreather Mask
        const rebreather = register(
          MeshBuilder.CreateBox(
            `acc_mask_${id}`,
            { width: headScale * 0.65, height: 0.14, depth: 0.14 },
            scene
          )
        );
        rebreather.position = new Vector3(0, -headScale * 0.32, headScale * 0.45);
        rebreather.parent = headNode;
        rebreather.material = darkMetalMat;

        const filterL = register(
          MeshBuilder.CreateCylinder(`acc_flt_l_${id}`, { height: 0.06, diameter: 0.08 }, scene)
        );
        filterL.rotation.z = Math.PI / 2;
        filterL.position = new Vector3(-headScale * 0.35, -headScale * 0.32, headScale * 0.42);
        filterL.parent = headNode;
        filterL.material = neonMat;

        const filterR = register(
          MeshBuilder.CreateCylinder(`acc_flt_r_${id}`, { height: 0.06, diameter: 0.08 }, scene)
        );
        filterR.rotation.z = Math.PI / 2;
        filterR.position = new Vector3(headScale * 0.35, -headScale * 0.32, headScale * 0.42);
        filterR.parent = headNode;
        filterR.material = neonMat;
        break;
      }
      case 5: { // Spine Battery Pack
        const battery = register(
          MeshBuilder.CreateCylinder(`acc_bat_${id}`, { height: torsoHeight * 0.7, diameter: 0.10 }, scene)
        );
        battery.position = new Vector3(0, 0.02, -torsoDepth * 0.5 - 0.18);
        battery.parent = torsoNode;
        battery.material = darkMetalMat;

        const statusLed = register(
          MeshBuilder.CreateBox(`acc_led_${id}`, { width: 0.03, height: torsoHeight * 0.5, depth: 0.02 }, scene)
        );
        statusLed.position = new Vector3(0, 0.02, -torsoDepth * 0.5 - 0.24);
        statusLed.parent = torsoNode;
        statusLed.material = neonMat;
        break;
      }
    }

    // -------------------------------------------------------------------------
    // 5. Left & Right Arms
    // -------------------------------------------------------------------------
    const armY = torsoHeight * 0.32;
    const armDiameter = 0.14 * app.bodyWidth;

    // Left Arm
    const leftArmNode = new TransformNode(`l_arm_node_${id}`, scene);
    leftArmNode.parent = torsoNode;
    leftArmNode.position = new Vector3(-shoulderWidth, armY, 0);

    const leftArmMesh = register(
      MeshBuilder.CreateCylinder(`l_arm_${id}`, { height: armLength, diameter: armDiameter }, scene)
    );
    leftArmMesh.position.y = -armLength * 0.5;
    leftArmMesh.parent = leftArmNode;
    leftArmMesh.material = topMat;

    // Left Hand (Natural skin tone)
    const leftHand = register(
      MeshBuilder.CreateSphere(`l_hand_${id}`, { diameter: armDiameter * 1.05 }, scene)
    );
    leftHand.position.y = -armLength * 0.98;
    leftHand.parent = leftArmNode;
    leftHand.material = skinMat;

    // Right Arm
    const rightArmNode = new TransformNode(`r_arm_node_${id}`, scene);
    rightArmNode.parent = torsoNode;
    rightArmNode.position = new Vector3(shoulderWidth, armY, 0);

    const rightArmMesh = register(
      MeshBuilder.CreateCylinder(`r_arm_${id}`, { height: armLength, diameter: armDiameter }, scene)
    );
    rightArmMesh.position.y = -armLength * 0.5;
    rightArmMesh.parent = rightArmNode;
    rightArmMesh.material = topMat;

    // Right Hand (Natural skin tone)
    const rightHand = register(
      MeshBuilder.CreateSphere(`r_hand_${id}`, { diameter: armDiameter * 1.05 }, scene)
    );
    rightHand.position.y = -armLength * 0.98;
    rightHand.parent = rightArmNode;
    rightHand.material = skinMat;

    // -------------------------------------------------------------------------
    // 6. Left & Right Legs & Boots
    // -------------------------------------------------------------------------
    const legX = 0.19 * app.bodyWidth;
    const legDiameter = 0.18 * app.bodyWidth;

    // Left Leg
    const leftLegNode = new TransformNode(`l_leg_node_${id}`, scene);
    leftLegNode.parent = parent;
    leftLegNode.position = new Vector3(-legX, legLength, 0);

    const leftLegMesh = register(
      MeshBuilder.CreateCylinder(`l_leg_${id}`, { height: legLength, diameter: legDiameter }, scene)
    );
    leftLegMesh.position.y = -legLength * 0.5;
    leftLegMesh.parent = leftLegNode;
    leftLegMesh.material = pantsMat;

    // Left Boot
    const leftBoot = register(
      MeshBuilder.CreateBox(
        `l_boot_${id}`,
        { width: legDiameter * 1.15, depth: 0.32 * app.bodyDepth, height: 0.15 },
        scene
      )
    );
    leftBoot.position = new Vector3(0, -legLength + 0.075, 0.05);
    leftBoot.parent = leftLegNode;
    leftBoot.material = shoeMat;

    // Left Boot Trim
    const leftSole = register(
      MeshBuilder.CreateBox(
        `l_sole_${id}`,
        { width: legDiameter * 1.18, depth: 0.33 * app.bodyDepth, height: 0.03 },
        scene
      )
    );
    leftSole.position = new Vector3(0, -legLength + 0.015, 0.05);
    leftSole.parent = leftLegNode;
    leftSole.material = neonMat;

    // Right Leg
    const rightLegNode = new TransformNode(`r_leg_node_${id}`, scene);
    rightLegNode.parent = parent;
    rightLegNode.position = new Vector3(legX, legLength, 0);

    const rightLegMesh = register(
      MeshBuilder.CreateCylinder(`r_leg_${id}`, { height: legLength, diameter: legDiameter }, scene)
    );
    rightLegMesh.position.y = -legLength * 0.5;
    rightLegMesh.parent = rightLegNode;
    rightLegMesh.material = pantsMat;

    // Right Boot
    const rightBoot = register(
      MeshBuilder.CreateBox(
        `r_boot_${id}`,
        { width: legDiameter * 1.15, depth: 0.32 * app.bodyDepth, height: 0.15 },
        scene
      )
    );
    rightBoot.position = new Vector3(0, -legLength + 0.075, 0.05);
    rightBoot.parent = rightLegNode;
    rightBoot.material = shoeMat;

    // Right Boot Trim
    const rightSole = register(
      MeshBuilder.CreateBox(
        `r_sole_${id}`,
        { width: legDiameter * 1.18, depth: 0.33 * app.bodyDepth, height: 0.03 },
        scene
      )
    );
    rightSole.position = new Vector3(0, -legLength + 0.015, 0.05);
    rightSole.parent = rightLegNode;
    rightSole.material = neonMat;

    // -------------------------------------------------------------------------
    // 7. Calculate Avatar Height for Nametag Placement
    // -------------------------------------------------------------------------
    // Ground to top of head: legLength + torsoHeight + headScale + hair allowance
    const avatarHeight = rootTorsoY + torsoHeight * 0.5 + headScale + 0.08;

    const limbs: IPlayerLimbNodes = {
      torso: torsoNode,
      head: headNode,
      leftArm: leftArmNode,
      rightArm: rightArmNode,
      leftLeg: leftLegNode,
      rightLeg: rightLegNode,
    };

    const dispose = () => {
      for (const m of meshes) {
        m.dispose(false, false);
      }
      torsoNode.dispose();
      leftLegNode.dispose();
      rightLegNode.dispose();
    };

    return {
      limbs,
      rootTorsoY,
      avatarHeight,
      meshes,
      dispose,
    };
  }
}
