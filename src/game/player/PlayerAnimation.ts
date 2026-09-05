import { AnimationGroup } from '@babylonjs/core';
import { AnimationState } from '@/types/game';
import { IPlayerLimbNodes, AndroidBoyAnimation } from './AndroidBoyRig';

export { type IPlayerLimbNodes } from './AndroidBoyRig';

/**
 * =========================================================================
 * PlayerAnimation - Dual Mode Animation Controller
 * =========================================================================
 * WHAT IT DOES:
 * - Controls character animation for both:
 *   1. External rigged 3D models with AnimationGroups (e.g. Cute Creature
 *      idle, walk, run, jump clips).
 *   2. Procedural trigonometry-driven limb rigs (Android Boy backup rig).
 */
export class PlayerAnimation {
  private limbs?: IPlayerLimbNodes;
  private proceduralBackup?: AndroidBoyAnimation;

  // AnimationGroups from GLTF model
  private animationGroups: Map<string, AnimationGroup> = new Map();
  private currentAnimGroup: AnimationGroup | null = null;

  private currentState: AnimationState = 'idle';
  private targetState: AnimationState = 'idle';

  constructor(limbs?: IPlayerLimbNodes) {
    if (limbs) {
      this.limbs = limbs;
      this.proceduralBackup = new AndroidBoyAnimation(limbs);
    }
  }

  /**
   * Registers Babylon.js AnimationGroups from loaded GLB (Cute Creature).
   */
  public setAnimationGroups(groups: AnimationGroup[]): void {
    this.animationGroups.clear();
    for (const group of groups) {
      const name = group.name.toLowerCase();
      // Handle names like "idle", "walk", "run", "jump" (or glTF prefixes like "Armature|idle")
      if (name.includes('idle')) {
        this.animationGroups.set('idle', group);
      } else if (name.includes('run')) {
        this.animationGroups.set('run', group);
      } else if (name.includes('walk')) {
        this.animationGroups.set('walk', group);
      } else if (name.includes('jump')) {
        this.animationGroups.set('jump', group);
      } else {
        this.animationGroups.set(name, group);
      }
    }

    // Stop all groups initially
    for (const group of groups) {
      group.stop();
    }

    // Start in current state
    this.playAnimationGroup(this.currentState);
  }

  /**
   * Updates limb nodes for procedural animation backup (Android Boy).
   */
  public setLimbNodes(limbs: IPlayerLimbNodes): void {
    this.limbs = limbs;
    this.proceduralBackup = new AndroidBoyAnimation(limbs);
  }

  /**
   * Sets the desired animation state ('idle' | 'walk' | 'run' | 'jump').
   */
  public setState(state: AnimationState): void {
    if (this.currentState !== state) {
      this.targetState = state;
      this.currentState = state;

      if (this.animationGroups.size > 0) {
        this.playAnimationGroup(state);
      }

      if (this.proceduralBackup) {
        this.proceduralBackup.setState(state);
      }
    }
  }

  /**
   * Plays the designated AnimationGroup with appropriate loop & speed settings.
   */
  private playAnimationGroup(state: AnimationState): void {
    const targetGroup = this.animationGroups.get(state) || this.animationGroups.get('idle');
    if (!targetGroup) return;

    if (this.currentAnimGroup === targetGroup && targetGroup.isPlaying) {
      return;
    }

    // Stop currently running group
    if (this.currentAnimGroup && this.currentAnimGroup !== targetGroup) {
      this.currentAnimGroup.stop();
    }

    this.currentAnimGroup = targetGroup;

    let speedRatio = 1.0;
    let loop = true;

    switch (state) {
      case 'idle':
        speedRatio = 1.0;
        loop = true;
        break;
      case 'walk':
        speedRatio = 1.15;
        loop = true;
        break;
      case 'run':
        speedRatio = 1.4;
        loop = true;
        break;
      case 'jump':
        speedRatio = 1.2;
        loop = false;
        break;
    }

    targetGroup.start(loop, speedRatio);
  }

  /**
   * Returns current active animation state.
   */
  public getState(): AnimationState {
    return this.currentState;
  }

  /**
   * Evaluates procedural limbs every frame if procedural backup is active.
   */
  public update(deltaTime: number): void {
    if (this.proceduralBackup && this.animationGroups.size === 0) {
      this.proceduralBackup.update(deltaTime);
    }
  }

  /**
   * Resets all animations.
   */
  public reset(): void {
    if (this.currentAnimGroup) {
      this.currentAnimGroup.stop();
      this.currentAnimGroup = null;
    }
    if (this.proceduralBackup) {
      this.proceduralBackup.reset();
    }
    this.setState('idle');
  }

  public dispose(): void {
    for (const group of this.animationGroups.values()) {
      group.dispose();
    }
    this.animationGroups.clear();
  }
}
