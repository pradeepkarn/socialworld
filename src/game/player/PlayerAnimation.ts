import { TransformNode, Vector3 } from '@babylonjs/core';
import { AnimationState } from '@/types/game';

/**
 * References to the limb joint TransformNodes created in Player.ts
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
 * PlayerAnimation - Procedural Mathematical Character Animation
 * =========================================================================
 * WHAT IT DOES:
 * - Animates the player character's arms, legs, and torso using pure trigonometry
 *   (`Math.sin` and `Math.cos`) instead of downloading massive 50MB animation files!
 *
 * HOW IT WORKS (The Sine Wave Trick):
 * - Walking and running are natural cyclical pendulums.
 * - When your left leg swings forward (+sin), your right leg swings backward (-sin).
 * - At the same time, your arms swing in opposite counter-phase to balance your body.
 * - As you take steps, your hips naturally bob up and down (`Math.abs(Math.cos(phase))`).
 * - This produces fluid, organic character locomotion with zero file size overhead!
 */
export class PlayerAnimation {
  private limbs: IPlayerLimbNodes;
  private currentState: AnimationState = 'idle';
  private targetState: AnimationState = 'idle';
  private animTimer: number = 0;

  // Smoothing / blend factor
  private blendWeight: number = 1.0;

  constructor(limbs: IPlayerLimbNodes) {
    this.limbs = limbs;
  }

  /**
   * Sets the desired animation state ('idle' | 'walk' | 'run' | 'jump').
   */
  public setState(state: AnimationState): void {
    if (this.targetState !== state) {
      this.targetState = state;
      this.currentState = state;
    }
  }

  /**
   * Returns current active animation state.
   */
  public getState(): AnimationState {
    return this.currentState;
  }

  /**
   * =========================================================================
   * update() - Procedural Limb Evaluator (Called Every Frame)
   * =========================================================================
   * Calculates bone angles for the active pose:
   */
  public update(deltaTime: number): void {
    this.animTimer += deltaTime;

    const { torso, leftArm, rightArm, leftLeg, rightLeg } = this.limbs;

    switch (this.currentState) {
      // 1. IDLE: Subtle rhythmic breathing and idle arm sway
      case 'idle': {
        const breathe = Math.sin(this.animTimer * 2.2) * 0.03; // Gentle chest rise & fall
        torso.position.y = 1.05 + breathe;
        torso.rotation.x = 0;

        leftArm.rotation.x = Math.sin(this.animTimer * 1.8) * 0.05;
        rightArm.rotation.x = -Math.sin(this.animTimer * 1.8) * 0.05;

        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        break;
      }

      // 2. WALK: Alternating stride with slight torso forward lean
      case 'walk': {
        const speed = 7.5; // Walking cadence (steps per second)
        const phase = this.animTimer * speed;
        const legSwing = Math.sin(phase) * 0.55;             // Moderate leg stride arc
        const armSwing = Math.sin(phase) * 0.45;             // Arm swing in counter-phase
        const hipBob = Math.abs(Math.cos(phase)) * 0.06;     // Natural vertical hip bounce

        torso.position.y = 1.05 + hipBob;
        torso.rotation.x = 0.05; // Slight forward lean

        // Counter-phase limb pendulum (opposites move together)
        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftArm.rotation.x = -armSwing;
        rightArm.rotation.x = armSwing;
        break;
      }

      // 3. RUN: High-speed energetic sprint with deep forward lean
      case 'run': {
        const speed = 13.0; // Rapid sprint cadence
        const phase = this.animTimer * speed;
        const legSwing = Math.sin(phase) * 0.9;              // Wide athletic stride
        const armSwing = Math.sin(phase) * 0.8;              // Powerful arm pump
        const hipBob = Math.abs(Math.cos(phase)) * 0.12;     // Energetic running bounce

        torso.position.y = 1.05 + hipBob;
        torso.rotation.x = 0.18; // Athletic forward sprinter lean

        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftArm.rotation.x = -armSwing;
        rightArm.rotation.x = armSwing;
        break;
      }

      // 4. JUMP: Airborne dynamic tuck pose
      case 'jump': {
        torso.position.y = 1.1;
        torso.rotation.x = 0.08;

        // Bent knees tucked for mid-air suspension
        leftLeg.rotation.x = -0.45;
        rightLeg.rotation.x = -0.3;
        // Arms thrown forward/up for balance
        leftArm.rotation.x = 0.6;
        rightArm.rotation.x = 0.6;
        break;
      }
    }
  }

  /**
   * Resets all limb rotations back to neutral T-pose / standing zero.
   */
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
