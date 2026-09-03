import { Engine } from '@babylonjs/core';

export interface EngineOptions {
  antialias?: boolean;
  adaptToDeviceRatio?: boolean;
  powerPreference?: 'high-performance' | 'default' | 'low-power';
}

/**
 * Creates and configures an optimized Babylon.js rendering engine.
 */
export function createEngine(
  canvas: HTMLCanvasElement,
  options: EngineOptions = {}
): Engine {
  const {
    antialias = true,
    adaptToDeviceRatio = true,
    powerPreference = 'high-performance',
  } = options;

  const engine = new Engine(canvas, antialias, {
    preserveDrawingBuffer: false,
    stencil: true,
    powerPreference,
    audioEngine: false, // UI handles audio or enable later
    deterministicLockstep: false,
    lockstepMaxSteps: 4,
  }, adaptToDeviceRatio);

  // Set crisp hardware scaling level while avoiding over-taxing GPU
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  engine.setHardwareScalingLevel(1 / dpr);

  return engine;
}
