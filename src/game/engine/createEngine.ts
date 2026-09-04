import { Engine } from '@babylonjs/core';

export interface EngineOptions {
  antialias?: boolean;
  adaptToDeviceRatio?: boolean;
  powerPreference?: 'high-performance' | 'default' | 'low-power';
}

/**
 * =========================================================================
 * createEngine() - WebGL 3D Rendering Engine Bootstrapper
 * =========================================================================
 * WHAT IT DOES:
 * - Initializes the underlying Babylon.js WebGL / WebGPU engine attached to
 *   an HTML5 `<canvas>` element.
 *
 * KEY PERFORMANCE CONCEPTS:
 * - antialias = true: Smooths jagged 3D polygon edges (MSAA).
 * - powerPreference: 'high-performance': Requests the user's dedicated discrete GPU
 *   (e.g. NVIDIA / AMD) instead of battery-saving low-power integrated graphics.
 * - Retina / High-DPI Scaling (`setHardwareScalingLevel`):
 *   Checks `window.devicePixelRatio`. Caps it at 2x so 4K Retina screens look
 *   razor-sharp without melting the GPU!
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
