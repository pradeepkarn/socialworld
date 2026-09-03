import { Color3, StandardMaterial, Vector3 } from '@babylonjs/core';
import { Environment } from './Environment';
import { TimeOfDay } from '@/types/game';

export type DayNightListener = (time: TimeOfDay) => void;

export class DayNightCycle {
  private environment: Environment;
  private currentTime: TimeOfDay = 'day';
  private listeners: Set<DayNightListener> = new Set();

  constructor(environment: Environment) {
    this.environment = environment;
    this.applyTime(this.currentTime);
  }

  public getTime(): TimeOfDay {
    return this.currentTime;
  }

  public setTime(time: TimeOfDay): void {
    if (this.currentTime === time) return;
    this.currentTime = time;
    this.applyTime(time);
    this.listeners.forEach((cb) => cb(time));
  }

  public toggle(): TimeOfDay {
    const sequence: TimeOfDay[] = ['day', 'sunset', 'night'];
    const nextIndex = (sequence.indexOf(this.currentTime) + 1) % sequence.length;
    this.setTime(sequence[nextIndex]);
    return this.currentTime;
  }

  public addListener(cb: DayNightListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private applyTime(time: TimeOfDay): void {
    const { sunLight, ambientLight, scene, skyDome } = this.environment;
    const skyMat = skyDome.material as StandardMaterial;

    switch (time) {
      case 'day': {
        sunLight.intensity = 1.35;
        sunLight.direction = new Vector3(-0.5, -0.85, -0.4).normalize();
        sunLight.diffuse = new Color3(1.0, 0.98, 0.92);
        ambientLight.intensity = 0.65;
        ambientLight.diffuse = new Color3(0.85, 0.9, 1.0);
        ambientLight.groundColor = new Color3(0.2, 0.22, 0.26);
        scene.fogColor = new Color3(0.65, 0.75, 0.88);
        if (skyMat) skyMat.emissiveColor = new Color3(0.35, 0.55, 0.9);
        break;
      }
      case 'sunset': {
        sunLight.intensity = 0.95;
        sunLight.direction = new Vector3(-0.9, -0.25, -0.3).normalize();
        sunLight.diffuse = new Color3(1.0, 0.45, 0.2);
        ambientLight.intensity = 0.45;
        ambientLight.diffuse = new Color3(0.8, 0.45, 0.55);
        ambientLight.groundColor = new Color3(0.18, 0.12, 0.15);
        scene.fogColor = new Color3(0.75, 0.38, 0.3);
        if (skyMat) skyMat.emissiveColor = new Color3(0.7, 0.28, 0.22);
        break;
      }
      case 'night': {
        sunLight.intensity = 0.2;
        sunLight.direction = new Vector3(-0.2, -0.9, -0.2).normalize();
        sunLight.diffuse = new Color3(0.4, 0.55, 0.85); // Cool moonlight
        ambientLight.intensity = 0.25;
        ambientLight.diffuse = new Color3(0.15, 0.22, 0.4);
        ambientLight.groundColor = new Color3(0.04, 0.05, 0.08);
        scene.fogColor = new Color3(0.06, 0.08, 0.15);
        if (skyMat) skyMat.emissiveColor = new Color3(0.05, 0.08, 0.18);
        break;
      }
    }
  }

  public dispose(): void {
    this.listeners.clear();
  }
}
