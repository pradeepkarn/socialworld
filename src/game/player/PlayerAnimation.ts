import { TransformNode, Vector3 } from '@babylonjs/core';
import { AnimationState } from '@/types/game';

export interface IPlayerLimbNodes {
  torso: TransformNode;
  head: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
}

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

  public setState(state: AnimationState): void {
    if (this.targetState !== state) {
      this.targetState = state;
      this.currentState = state;
    }
  }

  public getState(): AnimationState {
    return this.currentState;
  }

  /**
   * Evaluates limb rotation and position every frame based on animation state.
   */
  public update(deltaTime: number): void {
    this.animTimer += deltaTime;

    const { torso, leftArm, rightArm, leftLeg, rightLeg } = this.limbs;

    switch (this.currentState) {
      case 'idle': {
        // Subtle rhythmic breathing
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
        torso.rotation.x = 0.05; // Slight forward lean

        // Alternating legs and arms (counter-phase)
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
        torso.rotation.x = 0.18; // Athletic forward lean

        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftArm.rotation.x = -armSwing;
        rightArm.rotation.x = armSwing;
        break;
      }

      case 'jump': {
        // Airborne jump pose: knees tucked, arms out for balance
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
