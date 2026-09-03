import { Scene } from '@babylonjs/core';
import { AssetManager } from '../assets/AssetManager';
import { Environment } from './Environment';
import { DayNightCycle } from './DayNightCycle';
import { City } from './City';
import { TimeOfDay } from '@/types/game';

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

  public getTimeOfDay(): TimeOfDay {
    return this.dayNightCycle.getTime();
  }

  public setTimeOfDay(time: TimeOfDay): void {
    this.dayNightCycle.setTime(time);
  }

  public toggleTimeOfDay(): TimeOfDay {
    return this.dayNightCycle.toggle();
  }

  public dispose(): void {
    this.city.dispose();
    this.dayNightCycle.dispose();
    this.environment.dispose();
  }
}
