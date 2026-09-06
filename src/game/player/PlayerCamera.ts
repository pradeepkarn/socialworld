import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Ray,
  AbstractMesh,
} from '@babylonjs/core';
import { ICameraConfig, defaultCameraConfig } from '../camera/CameraConfig';

/**
 * =========================================================================
 * PlayerCamera - Industry-Grade Third-Person Action Game Camera
 * =========================================================================
 * WHAT IT DOES:
 * - Smoothly follows behind the player avatar with frame-rate independent damping.
 * - Free 360° horizontal mouse orbit independent of character orientation.
 * - Vertical pitch clamped between configurable limits (never flips upside down).
 * - Desktop pointer-lock integration with seamless fallback to drag-orbit.
 * - Jump/fall physics stability via dual-axis target damping (cushions vertical spikes).
 * - Wall occlusion raycasting with smooth collision pull-in and spring recovery.
 * - Pre-allocated reusable math vectors (0 GC allocations per frame in update loop).
 */
export class PlayerCamera {
  public camera: ArcRotateCamera;
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private config: ICameraConfig;

  private targetMesh: AbstractMesh | null = null;
  private smoothedTarget: Vector3 = new Vector3(0, 1.65, 0);
  private desiredRadius: number;
  private targetInitialized: boolean = false;

  // Pointer Lock & Mouse Look state
  private isPointerLocked: boolean = false;
  private pointerLockEnabled: boolean = false;
  private wheelListener?: (e: WheelEvent) => void;

  // Pre-allocated reusable vectors for zero-allocation performance
  private _ray: Ray;
  private _forwardVec: Vector3 = new Vector3(0, 0, 1);
  private _rightVec: Vector3 = new Vector3(1, 0, 0);

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    customConfig?: Partial<ICameraConfig>
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.config = { ...defaultCameraConfig, ...customConfig };
    this.desiredRadius = this.config.defaultDistance;

    // 1. Create 3rd-person ArcRotateCamera with comfortable framing
    this.camera = new ArcRotateCamera(
      'player_camera',
      -Math.PI / 2,            // Initial alpha (facing forward along Z)
      this.config.initialBeta, // Initial beta (~66° downward over-shoulder tilt)
      this.desiredRadius,
      new Vector3(0, this.config.heightOffset, 0),
      this.scene
    );

    // 2. Configure Limits and Dynamics
    this.camera.lowerRadiusLimit = this.config.minDistance;
    this.camera.upperRadiusLimit = this.config.maxDistance;
    this.camera.lowerBetaLimit = this.config.lowerBetaLimit;
    this.camera.upperBetaLimit = this.config.upperBetaLimit;
    this.camera.angularSensibilityX = this.config.angularSensibilityX;
    this.camera.angularSensibilityY = this.config.angularSensibilityY;
    this.camera.inertia = this.config.inertia;
    this.camera.panningSensibility = 0; // Lock panning so camera always orbits centered on the player

    // 3. Attach standard controls (supports drag when not locked)
    this.camera.attachControl(canvas, true);

    // Remove Babylon's default mouse wheel input so our smooth zoom interpolator controls distance
    this.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');

    // Allow both left-click and right-click to drag orbit
    const pointersInput = (this.camera.inputs?.attached as any)?.pointers;
    if (pointersInput) {
      pointersInput.buttons = [0, 1, 2];
    }

    // Attach custom mouse wheel zoom listener for desktop
    const onCanvasWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 80);
      this.zoom(delta * this.config.wheelSensitivity);
    };
    this.canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    this.wheelListener = onCanvasWheel;

    // Use custom raycast collision avoidance (Babylon's built-in checkCollisions on ArcRotateCamera causes radius popping)
    this.camera.checkCollisions = false;

    // Preallocate ray for occlusion testing
    this._ray = new Ray(Vector3.Zero(), Vector3.Forward(), this.desiredRadius);

    // 4. Setup Pointer Lock Event Listeners (only if explicitly enabled in config)
    this.pointerLockEnabled = this.config.enablePointerLock;
    if (this.config.enablePointerLock) {
      this.setupPointerLockListeners();
    }
  }

  /**
   * Configures desktop pointer lock for first-class mouse look.
   */
  private setupPointerLockListeners(): void {
    const onCanvasClick = (): void => {
      if (!this.pointerLockEnabled) return;
      if (document.pointerLockElement !== this.canvas) {
        try {
          this.canvas.requestPointerLock();
        } catch {
          // Pointer lock rejected or not supported
        }
      }
    };

    const onPointerLockChange = (): void => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    };

    const onMouseMove = (e: MouseEvent): void => {
      if (!this.isPointerLocked) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      // Rotate camera yaw (alpha) and pitch (beta)
      this.camera.alpha += movementX * this.config.mouseSensitivityX;
      this.camera.beta += movementY * this.config.mouseSensitivityY;

      // Clamp vertical pitch strictly within safe angles (never flips upside down)
      this.camera.beta = Math.max(
        this.config.lowerBetaLimit,
        Math.min(this.config.upperBetaLimit, this.camera.beta)
      );
    };

    this.canvas.addEventListener('click', onCanvasClick);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);

    this.cleanupListeners = () => {
      this.canvas.removeEventListener('click', onCanvasClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }

  private cleanupListeners?: () => void;

  /**
   * Releases pointer lock (e.g. when opening shop modals or settings menu).
   */
  public releasePointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  /**
   * Enables or disables pointer lock requests.
   */
  public setPointerLockEnabled(enabled: boolean): void {
    this.pointerLockEnabled = enabled;
    if (!enabled) {
      this.releasePointerLock();
    }
  }

  /**
   * Sets which 3D mesh the camera should follow (the player capsule).
   */
  public setTarget(mesh: AbstractMesh): void {
    this.targetMesh = mesh;
    this.targetInitialized = false;
  }

  /**
   * Snaps the smoothed follow target immediately to the target mesh.
   * Useful on teleportation or respawns to avoid camera flying across the city.
   */
  public snapTarget(): void {
    if (!this.targetMesh) return;
    this.smoothedTarget.set(
      this.targetMesh.position.x,
      this.targetMesh.position.y + this.config.heightOffset,
      this.targetMesh.position.z
    );
    this.camera.target.copyFrom(this.smoothedTarget);
    this.targetInitialized = true;
  }

  /**
   * Sets the user's desired camera distance, clamped to config limits.
   */
  public setDesiredRadius(radius: number): void {
    this.desiredRadius = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, radius)
    );
    this.camera.radius = this.desiredRadius;
  }

  public getDesiredRadius(): number {
    return this.desiredRadius;
  }

  /**
   * Adjusts the desired camera radius smoothly (used by desktop mouse wheel & mobile pinch-to-zoom).
   */
  public zoom(delta: number): void {
    this.desiredRadius = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, this.desiredRadius + delta)
    );
  }

  /**
   * Returns current actual camera radius.
   */
  public getRadius(): number {
    return this.camera.radius;
  }

  /**
   * =========================================================================
   * update() - Frame-Rate-Independent Follow & Wall Collision Raycast
   * =========================================================================
   * Called every frame with deltaTime to glide the camera smoothly and avoid clipping inside walls.
   */
  public update(deltaTime: number = 0.016): void {
    if (!this.targetMesh) return;

    // Clamp deltaTime to avoid extreme warping on tab switch or pause
    const dt = Math.min(deltaTime, 0.1);

    // Target focal point at player chest/eyes
    const desiredX = this.targetMesh.position.x;
    const desiredY = this.targetMesh.position.y + this.config.heightOffset;
    const desiredZ = this.targetMesh.position.z;

    // Instant snap on first frame to prevent camera flying in from world origin
    if (!this.targetInitialized) {
      this.smoothedTarget.set(desiredX, desiredY, desiredZ);
      this.camera.target.copyFrom(this.smoothedTarget);
      this.targetInitialized = true;
      return;
    }

    // 1. Frame-rate independent dual-axis follow damping
    // Horizontal (XZ) follows firmly with movement; Vertical (Y) cushions jumps and stairs
    const hFactor = 1.0 - Math.exp(-this.config.horizontalFollowSpeed * dt);
    const vFactor = 1.0 - Math.exp(-this.config.verticalFollowSpeed * dt);

    this.smoothedTarget.x += (desiredX - this.smoothedTarget.x) * hFactor;
    this.smoothedTarget.y += (desiredY - this.smoothedTarget.y) * vFactor;
    this.smoothedTarget.z += (desiredZ - this.smoothedTarget.z) * hFactor;

    this.camera.target.copyFrom(this.smoothedTarget);

    // Enforce pitch clamping every frame to guarantee limits under momentum or drag
    if (this.camera.beta < this.config.lowerBetaLimit) {
      this.camera.beta = this.config.lowerBetaLimit;
    } else if (this.camera.beta > this.config.upperBetaLimit) {
      this.camera.beta = this.config.upperBetaLimit;
    }

    // 2. Wall Occlusion Collision Raycast
    // Shoot ray from smoothed player focal point towards camera position
    // Analytically calculate exact unit direction from target to camera
    const sinB = Math.sin(this.camera.beta);
    const cosB = Math.cos(this.camera.beta);
    const dirX = Math.cos(this.camera.alpha) * sinB;
    const dirY = cosB;
    const dirZ = Math.sin(this.camera.alpha) * sinB;

    this._ray.origin.copyFrom(this.smoothedTarget);
    this._ray.direction.set(dirX, dirY, dirZ);
    this._ray.length = this.desiredRadius;

    const hit = this.scene.pickWithRay(this._ray, (mesh) => {
      return (
        mesh.checkCollisions &&
        mesh !== this.targetMesh &&
        !mesh.name.startsWith('player_') &&
        !mesh.name.startsWith('ws_label') &&
        !mesh.name.startsWith('torso_') &&
        !mesh.name.startsWith('l_') &&
        !mesh.name.startsWith('r_') &&
        !mesh.name.startsWith('head_') &&
        !mesh.name.startsWith('ground') &&
        !mesh.name.startsWith('road') &&
        !mesh.name.startsWith('sw_') &&
        !mesh.name.startsWith('nsRoad') &&
        !mesh.name.startsWith('ewRoad') &&
        !mesh.name.startsWith('plaza')
      );
    });
    // 2. Wall Occlusion Collision Raycast & Smooth Zoom Interpolation
    let effectiveTargetDistance = this.desiredRadius;

    if (hit && hit.hit && hit.distance < this.desiredRadius) {
      effectiveTargetDistance = Math.max(this.config.minDistance, hit.distance - this.config.collisionRadius);
    }

    if (effectiveTargetDistance < this.camera.radius) {
      // Pulling in (obstacle collision or zooming in): snappy response
      const factor = 1.0 - Math.exp(-this.config.collisionZoomSpeed * dt);
      this.camera.radius += (effectiveTargetDistance - this.camera.radius) * factor;
    } else if (effectiveTargetDistance > this.camera.radius + 0.001) {
      // Extending out (cleared obstacle or zooming out): smooth spring recovery
      const factor = 1.0 - Math.exp(-this.config.zoomSmoothness * dt);
      this.camera.radius += (effectiveTargetDistance - this.camera.radius) * factor;
    }
  }


  /**
   * =========================================================================
   * getForwardVector() - Horizontal Forward Direction
   * =========================================================================
   * Extracts horizontal heading of camera (flattened on XZ plane, Y=0, unit length).
   * Used by PlayerController so pressing 'W' runs toward where camera looks.
   * Analytical zero-allocation implementation directly derived from camera yaw (alpha).
   */
  public getForwardVector(): Vector3 {
    const cosA = Math.cos(this.camera.alpha);
    const sinA = Math.sin(this.camera.alpha);
    this._forwardVec.set(-cosA, 0, -sinA);
    return this._forwardVec;
  }

  /**
   * =========================================================================
   * getRightVector() - Horizontal Right Direction
   * =========================================================================
   * Computes the 90-degree rightward vector perpendicular to forward.
   * Used by PlayerController so pressing 'D' strafes right.
   * Zero-allocation implementation.
   */
  public getRightVector(): Vector3 {
    const f = this.getForwardVector();
    this._rightVec.set(f.z, 0, -f.x);
    return this._rightVec;
  }

  /**
   * Sets and clamps the vertical pitch angle directly.
   */
  public setPitch(beta: number): void {
    this.camera.beta = Math.max(
      this.config.lowerBetaLimit,
      Math.min(this.config.upperBetaLimit, beta)
    );
  }

  /**
   * Sets sensitivity multiplier (e.g. 0.7x, 1.0x, 1.4x, 1.8x) for touch/mouse look.
   */
  public setSensitivityMultiplier(mult: number): void {
    this.config.sensitivityMultiplier = Math.max(0.2, Math.min(3.0, mult));
  }

  public getSensitivityMultiplier(): number {
    return this.config.sensitivityMultiplier || 1.0;
  }

  /**
   * Directly adjusts desired camera distance (e.g. from distance slider).
   */
  public setDistance(distance: number): void {
    this.setDesiredRadius(distance);
  }

  /**
   * Rotates camera yaw and pitch with limits and sensitivity multiplier enforced.
   */
  public rotate(deltaYaw: number, deltaPitch: number): void {
    const mult = this.config.sensitivityMultiplier || 1.0;
    this.camera.alpha += deltaYaw * mult;
    this.setPitch(this.camera.beta + deltaPitch * mult);
  }

  /**
   * Returns camera configuration.
   */
  public getConfig(): ICameraConfig {
    return this.config;
  }

  /**
   * Updates camera configuration dynamically.
   */
  public updateConfig(newConfig: Partial<ICameraConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.camera.lowerBetaLimit = this.config.lowerBetaLimit;
    this.camera.upperBetaLimit = this.config.upperBetaLimit;
    this.camera.lowerRadiusLimit = this.config.minDistance;
    this.camera.upperRadiusLimit = this.config.maxDistance;
  }

  /**
   * Detaches mouse controls and cleans up camera memory.
   */
  public dispose(): void {
    this.releasePointerLock();
    if (this.cleanupListeners) {
      this.cleanupListeners();
    }
    if (this.wheelListener) {
      this.canvas.removeEventListener('wheel', this.wheelListener);
    }
    this.camera.detachControl();
    this.camera.dispose();
  }

}
