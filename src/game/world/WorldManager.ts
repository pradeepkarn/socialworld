import { Scene } from '@babylonjs/core';
import { AssetManager } from '../assets/AssetManager';
import { Environment } from './Environment';
import { DayNightCycle } from './DayNightCycle';
import { City } from './City';
import { TimeOfDay } from '@/types/game';

/**
 * =========================================================================
 * WorldManager - The Grand Overseer of the 3D World
 * =========================================================================
 * WHAT IT DOES:
 * - Glues all world subsystems together into one easy-to-use controller:
 *   1. Environment: Lighting, soft shadows, fog, and sky.
 *   2. DayNightCycle: Transitions between Day -> Sunset -> Night.
 *   3. City: Procedural ground, boulevards, sidewalks, plaza, and skyscrapers.
 * - Wire up events: When day turns to night, it automatically instructs
 *   City street lamps to flare up and illuminate the dark boulevards!
 */
export class WorldManager {
  public scene: Scene;
  public assetManager: AssetManager;
  public environment: Environment;
  public dayNightCycle: DayNightCycle;
  public city: City;

  constructor(scene: Scene, assetManager: AssetManager) {
    this.scene = scene;
    this.assetManager = assetManager;

    // 1. Initialize PBR Environment & Lighting
    this.environment = new Environment(scene);

    // 2. Initialize Day/Night Cycle Manager
    this.dayNightCycle = new DayNightCycle(this.environment);

    // 3. Generate City Infrastructure & Buildings
    this.city = new City(scene, assetManager, this.environment);
    this.city.generate();

    // 4. Hook Day/Night changes to City street lamps
    this.dayNightCycle.addListener((time: TimeOfDay) => {
      this.city.setNightMode(time === 'night');
    });
  }

  /**
   * Returns current time of day: 'day' | 'sunset' | 'night'.
   */
  public getTimeOfDay(): TimeOfDay {
    return this.dayNightCycle.getTime();
  }

  /**
   * Sets a specific time of day.
   */
  public setTimeOfDay(time: TimeOfDay): void {
    this.dayNightCycle.setTime(time);
  }

  /**
   * Cycles to the next time of day (e.g. Day -> Sunset -> Night -> Day).
   */
  public toggleTimeOfDay(): TimeOfDay {
    return this.dayNightCycle.toggle();
  }

  /**
   * Cleans up all world meshes and shaders on unmount.
   */
  public dispose(): void {
    this.city.dispose();
    this.dayNightCycle.dispose();
    this.environment.dispose();
  }
}
