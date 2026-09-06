/**
 * =========================================================================
 * CameraConfig - Centralized Configuration for Third-Person Player Camera
 * =========================================================================
 * Provides tuning parameters for camera distance, heights, angle limits,
 * frame-rate-independent smoothing, and wall collision avoidance.
 */

export interface ICameraConfig {
  // Distance & Framing (9.0m default distance, ~28% avatar screen height)
  defaultDistance: number;
  minDistance: number;
  maxDistance: number;
  heightOffset: number;
  initialBeta: number;

  // Angle Limits (Vertical Pitch Clamping)
  lowerBetaLimit: number;
  upperBetaLimit: number;

  // Look Sensitivity & Damping
  mouseSensitivityX: number;
  mouseSensitivityY: number;
  touchSensitivityX: number;
  touchSensitivityY: number;
  sensitivityMultiplier: number;
  angularSensibilityX: number;
  angularSensibilityY: number;
  inertia: number;

  // Zoom & Pinch Controls
  wheelSensitivity: number;
  pinchSensitivity: number;
  zoomSmoothness: number;

  // Frame-Rate-Independent Follow Smoothing
  horizontalFollowSpeed: number;
  verticalFollowSpeed: number;

  // Wall Occlusion Collision Avoidance
  collisionRadius: number;
  collisionZoomSpeed: number;
  collisionRecoverySpeed: number;

  // Pointer Lock Support
  enablePointerLock: boolean;
}

export const defaultCameraConfig: ICameraConfig = {
  // Distance & Framing: 9.0m default distance (~28% viewport height), 1.95m height at player chest/eyes
  defaultDistance: 9.0,
  minDistance: 4.0,
  maxDistance: 14.0,
  heightOffset: 1.95,
  initialBeta: Math.PI / 2.7, // ~66° downward over-shoulder angle

  // Angle Limits: ~16° from zenith down to 86° (stops cleanly above street pavement)
  lowerBetaLimit: 0.28,
  upperBetaLimit: Math.PI / 2 - 0.06,

  // Look Sensitivity
  mouseSensitivityX: 0.0024,
  mouseSensitivityY: 0.0020,
  touchSensitivityX: 0.0050,
  touchSensitivityY: 0.0040,
  sensitivityMultiplier: 1.0,
  angularSensibilityX: 1300,
  angularSensibilityY: 1300,
  inertia: 0.78,

  // Zoom & Pinch Dynamics: smooth delta-time interpolation
  wheelSensitivity: 0.015,
  pinchSensitivity: 0.025,
  zoomSmoothness: 8.0,

  // Frame-Rate-Independent Follow Damping:
  horizontalFollowSpeed: 11.0,
  verticalFollowSpeed: 5.5,

  // Collision Avoidance: fast pull-in when obstacle detected, smooth recovery when clear
  collisionRadius: 0.35,
  collisionZoomSpeed: 20.0,
  collisionRecoverySpeed: 8.0,

  // Desktop Pointer Lock (false = standard click-and-drag with visible cursor)
  enablePointerLock: false,
};
