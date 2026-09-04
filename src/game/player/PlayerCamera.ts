import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Ray,
  AbstractMesh,
} from '@babylonjs/core';

/**
 * =========================================================================
 * PlayerCamera - Third-Person Orbital Camera with Anti-Clip Occlusion
 * =========================================================================
 * WHAT IT DOES:
 * - Manages the third-person camera following behind the player avatar.
 * - Mouse drag rotates the camera around the player (orbit).
 * - Mouse scroll wheel zooms in and out.
 *
 * KEY GAME DEV TECHNIQUES:
 * 1. ArcRotateCamera: Uses spherical coordinates:
 *    - alpha: Horizontal orbit angle (yaw).
 *    - beta: Vertical pitch angle (elevation).
 *    - radius: Distance from the player (default: 6.5m).
 * 2. Ground Pitch Clamp (`upperBetaLimit`):
 *    Prevents the camera from tilting beneath the street so the player
 *    never sees underneath the floor.
 * 3. Smooth Camera Trailing (`Vector3.Lerp`):
 *    Smoothly lags and glides behind the player to eliminate jarring motion sickness.
 * 4. Anti-Wall Clipping (Occlusion Raycast):
 *    Shoots a ray from character to camera. If a building wall gets in between,
 *    it automatically zooms the camera in closer so you never see inside walls!
 */
export class PlayerCamera {
  public camera: ArcRotateCamera;
  private scene: Scene;
  private targetMesh: AbstractMesh | null = null;
  private targetOffset: Vector3 = new Vector3(0, 1.6, 0); // Focus at eye/chest level (1.6m high)
  private desiredRadius: number = 6.5;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // Create 3rd-person ArcRotateCamera
    this.camera = new ArcRotateCamera(
      'player_camera',
      -Math.PI / 2,     // Initial alpha (facing forward along Z)
      Math.PI / 2.8,    // Initial beta (slight downward tilt over shoulder)
      this.desiredRadius,
      new Vector3(0, 1.6, 0),
      this.scene
    );

    // Camera limits & smooth damping
    this.camera.lowerRadiusLimit = 2.0;               // Closest zoom (2m)
    this.camera.upperRadiusLimit = 15.0;              // Furthest zoom (15m)
    this.camera.lowerBetaLimit = 0.15;                // Prevent looking straight down from top
    this.camera.upperBetaLimit = Math.PI / 2 - 0.08;  // PREVENT CLIPPING: Stops before touching floor
    this.camera.angularSensibilityX = 1400;           // Mouse horizontal sensitivity
    this.camera.angularSensibilityY = 1400;           // Mouse vertical sensitivity
    this.camera.wheelPrecision = 25;                  // Scroll wheel zoom speed
    this.camera.inertia = 0.8;                        // Silky smooth rotational deceleration

    // Attach mouse controls to the HTML canvas
    this.camera.attachControl(canvas, true);

    // Physical collision radius for the camera lens
    this.camera.checkCollisions = true;
    this.camera.collisionRadius = new Vector3(0.4, 0.4, 0.4);
  }

  /**
   * Sets which 3D mesh the camera should follow (the player capsule).
   */
  public setTarget(mesh: AbstractMesh): void {
    this.targetMesh = mesh;
  }

  /**
   * =========================================================================
   * update() - Smooth Tracking & Wall Collision Raycast
   * =========================================================================
   * Called every frame to glide the camera and avoid clipping inside walls.
   */
  public update(): void {
    if (!this.targetMesh) return;

    // Desired eye-level focal point
    const targetPos = this.targetMesh.position.add(this.targetOffset);

    // 1. Smooth Camera Target Lerp (Linear Interpolation)
    // 0.15 factor gives smooth trailing momentum without laggy sluggishness
    this.camera.target = Vector3.Lerp(this.camera.target, targetPos, 0.15);

    // 2. Wall Occlusion Raycast
    // Shoot an invisible ray from the player toward the camera position
    const rayDir = this.camera.position.subtract(this.camera.target).normalize();
    const ray = new Ray(this.camera.target, rayDir, this.desiredRadius);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.checkCollisions && mesh !== this.targetMesh && !mesh.name.startsWith('player_');
    });

    // If a wall is blocking line of sight, pull camera forward in front of the wall!
    if (hit && hit.hit && hit.distance > 1.2) {
      this.camera.radius = Math.max(2.0, hit.distance - 0.5);
    }
  }

  /**
   * =========================================================================
   * getForwardVector() - Horizontal Forward Direction
   * =========================================================================
   * Extracts the horizontal heading direction of the camera (flattened on XZ).
   * Used by PlayerController so pressing 'W' runs toward where the camera looks.
   */
  public getForwardVector(): Vector3 {
    const forward = this.camera.getForwardRay().direction;
    forward.y = 0; // Strip vertical pitch
    return forward.normalize();
  }

  /**
   * =========================================================================
   * getRightVector() - Horizontal Right Direction
   * =========================================================================
   * Computes the 90-degree rightward vector perpendicular to forward.
   * Used by PlayerController so pressing 'D' strafes right.
   */
  public getRightVector(): Vector3 {
    const forward = this.getForwardVector();
    return new Vector3(forward.z, 0, -forward.x).normalize();
  }

  /**
   * Detaches mouse controls and cleans up camera memory.
   */
  public dispose(): void {
    this.camera.detachControl();
    this.camera.dispose();
  }
}
