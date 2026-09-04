import { Color3, StandardMaterial, Vector3 } from '@babylonjs/core';
import { Environment } from './Environment';
import { TimeOfDay } from '@/types/game';

export type DayNightListener = (time: TimeOfDay) => void;

/**
 * =========================================================================
 * DayNightCycle - Atmospheric Lighting & Sky Transitions
 * =========================================================================
 * WHAT IT DOES:
 * - Controls the atmospheric color palette across 3 distinct moods:
 *   1. 'day': Crisp, bright midday sun with crystal clear daylight fog.
 *   2. 'sunset': Dramatic golden hour with low-angle orange sunbeams and purple ambient haze.
 *   3. 'night': Moody cyberpunk moonlight with dark navy shadows, allowing neon signs to pop.
 *
 * KEY CONCEPTS:
 * - Reactive Listeners: Notifies the rest of the game when time changes
 *   so streetlights and window illuminations switch on automatically.
 */
export class DayNightCycle {
  private environment: Environment;
  private currentTime: TimeOfDay = 'day';
  private listeners: Set<DayNightListener> = new Set();

  constructor(environment: Environment) {
    this.environment = environment;
    this.applyTime(this.currentTime);
  }

  /**
   * Returns current time string ('day' | 'sunset' | 'night').
   */
  public getTime(): TimeOfDay {
    return this.currentTime;
  }

  /**
   * Changes the environment to a specific time of day.
   */
  public setTime(time: TimeOfDay): void {
    if (this.currentTime === time) return;
    this.currentTime = time;
    this.applyTime(time);
    this.listeners.forEach((cb) => cb(time));
  }

  /**
   * Advances sequentially: Day -> Sunset -> Night -> Day.
   */
  public toggle(): TimeOfDay {
    const sequence: TimeOfDay[] = ['day', 'sunset', 'night'];
    const nextIndex = (sequence.indexOf(this.currentTime) + 1) % sequence.length;
    this.setTime(sequence[nextIndex]);
    return this.currentTime;
  }

  /**
   * Subscribes a callback to be notified when time changes.
   */
  public addListener(cb: DayNightListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * =========================================================================
   * applyTime() - Atmospheric Color Palettes
   * =========================================================================
   * Adjusts:
   * - Sun direction and color
   * - Ambient sky / ground fill light
   * - Scene fog color and distance
   * - Emissive sky dome glow
   */
  private applyTime(time: TimeOfDay): void {
    const { sunLight, ambientLight, scene, skyDome } = this.environment;
    const skyMat = skyDome.material as StandardMaterial;

    switch (time) {
      case 'day': {
        sunLight.intensity = 1.45;
        sunLight.direction = new Vector3(-0.45, -0.85, -0.35).normalize();
        sunLight.diffuse = new Color3(1.0, 0.98, 0.92);
        ambientLight.intensity = 0.75;
        ambientLight.diffuse = new Color3(0.9, 0.95, 1.0);
        ambientLight.groundColor = new Color3(0.28, 0.45, 0.28);
        scene.fogColor = new Color3(0.72, 0.82, 0.94);
        if (skyMat) skyMat.emissiveColor = new Color3(0.35, 0.65, 0.98);
        break;
      }
      case 'sunset': {
        // Low angle sun casting long dramatic golden shadows across the boulevards
        sunLight.intensity = 1.1;
        sunLight.direction = new Vector3(-0.9, -0.25, -0.3).normalize();
        sunLight.diffuse = new Color3(1.0, 0.6, 0.25); // Radiant golden orange sunlight
        ambientLight.intensity = 0.55;
        ambientLight.diffuse = new Color3(0.9, 0.55, 0.5); // Warm coral-pink sky ambient
        ambientLight.groundColor = new Color3(0.3, 0.22, 0.18);
        scene.fogColor = new Color3(0.82, 0.5, 0.38); // Warm sunset haze
        if (skyMat) skyMat.emissiveColor = new Color3(0.85, 0.38, 0.22); // Fiery horizon
        break;
      }
      case 'night': {
        // Deep royal sapphire moonlight allowing neon storefronts and building colors to shine
        sunLight.intensity = 0.35;
        sunLight.direction = new Vector3(-0.25, -0.9, -0.2).normalize();
        sunLight.diffuse = new Color3(0.45, 0.6, 0.9); // Royal sapphire moonlight
        ambientLight.intensity = 0.35;
        ambientLight.diffuse = new Color3(0.25, 0.32, 0.55);
        ambientLight.groundColor = new Color3(0.08, 0.12, 0.14);
        scene.fogColor = new Color3(0.12, 0.15, 0.24); // Soft twilight fog
        if (skyMat) skyMat.emissiveColor = new Color3(0.1, 0.14, 0.28); // Midnight blue sky
        break;
      }
    }
  }

  public dispose(): void {
    this.listeners.clear();
  }
}
