import { Scene, Vector3, Ray, AbstractMesh } from '@babylonjs/core';
import { PlayerCamera } from './PlayerCamera';
import { PlayerAnimation } from './PlayerAnimation';
import { AnimationState } from '@/types/game';

/**
 * =========================================================================
 * PlayerController - Movement Physics & Keyboard Controls
 * =========================================================================
 * WHAT IT DOES:
 * - Listens to keyboard keys (WASD, Arrows, Shift, Space, E).
 * - Implements industry-standard 3rd-person character mechanics:
 *   1. Camera-Relative Movement: Pressing 'W' runs toward where camera looks horizontally.
 *   2. Normalized Diagonal Speed: W+D runs at the same speed as W alone.
 *   3. Independent Camera Orbit: Camera orbits freely 360° when stationary without turning body.
 *   4. Smooth Body Turning: Frame-rate-independent exponential slerp toward move heading.
 *   5. Ground Raycasting: Reusable downward ray detector.
 *   6. Realistic Gravity & Jumping: Responsive jump on Space, downward stick on ground.
 *   7. Collision Sliding: Slides smoothly along building walls using `moveWithCollisions`.
 *   8. Zero GC Allocations: Pre-allocated scratch vectors and rays in update loop.
 */
export class PlayerController {
  private scene: Scene;
  private rootMesh: AbstractMesh;
  private camera: PlayerCamera;
  private animation: PlayerAnimation;

  // Input states (which keys are currently held down)
  private keys: Record<string, boolean> = {};

  // Movement physics variables
  private velocity: Vector3 = Vector3.Zero();
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  private isMoving: boolean = false;
  private isSprinting: boolean = false;

  // Speeds (meters per second)
  private readonly walkSpeed: number = 5.0;     // 5 m/s (~18 km/h jogging)
  private readonly runSpeed: number = 9.5;      // 9.5 m/s (~34 km/h sprinting)
  private readonly jumpForce: number = 7.5;     // Upward impulse on Space
  private readonly gravity: number = -18.0;     // Snappy, responsive video game gravity

  // Controls lock (e.g. when shopping modal is open)
  private isLocked: boolean = false;

  // Interaction key callback (fires when 'E' is pressed)
  public onInteractPressed?: () => void;

  // Handshake key callback (fires when 'H' is pressed)
  public onHandshakePressed?: () => void;

  // Preallocated scratch vectors and rays to eliminate per-frame garbage collection
  private _moveDir: Vector3 = Vector3.Zero();
  private _displacement: Vector3 = Vector3.Zero();
  private _groundRay: Ray;
  private _stepRay: Ray;
  private _highRay: Ray;

  constructor(
    scene: Scene,
    rootMesh: AbstractMesh,
    camera: PlayerCamera,
    animation: PlayerAnimation
  ) {
    this.scene = scene;
    this.rootMesh = rootMesh;
    this.camera = camera;
    this.animation = animation;

    // Initialize reusable rays
    this._groundRay = new Ray(Vector3.Zero(), new Vector3(0, -1, 0), 0.65);
    this._stepRay = new Ray(Vector3.Zero(), Vector3.Forward(), 0.65);
    this._highRay = new Ray(Vector3.Zero(), Vector3.Forward(), 0.70);

    this.setupInputListeners();
  }

  /**
   * Binds global browser keyboard events.
   */
  private setupInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    this.keys[code] = true;

    // 'E' key for interacting with shops
    if (code === 'keye' && !this.isLocked) {
      if (this.onInteractPressed) {
        this.onInteractPressed();
      }
    }

    // 'H' key for handshaking with nearby players
    if (code === 'keyh' && !this.isLocked) {
      if (this.onHandshakePressed) {
        this.onHandshakePressed();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    this.keys[code] = false;
  };

  /**
   * Locks or unlocks character movement (e.g. when reading shop catalog or handshaking).
   * Releases pointer lock so player can use cursor in UI modals.
   */
  // Virtual joystick & mobile touch input states
  private joystickForward: number = 0;
  private joystickRight: number = 0;
  private joystickSprinting: boolean = false;
  private jumpRequested: boolean = false;

  public setLocked(locked: boolean, keepAnimState: boolean = false): void {
    this.isLocked = locked;
    if (locked) {
      this.keys = {}; // Clear any held keys
      this.joystickForward = 0;
      this.joystickRight = 0;
      this.joystickSprinting = false;
      this.jumpRequested = false;
      if (!keepAnimState && this.animation.getState() !== 'handshake') {
        this.animation.setState('idle');
      }
      this.camera.releasePointerLock();
      this.camera.setPointerLockEnabled(false);
    } else {
      this.camera.setPointerLockEnabled(true);
    }
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  public setKey(code: string, pressed: boolean): void {
    this.keys[code.toLowerCase()] = pressed;
  }

  /**
   * Sets virtual joystick directional vector [-1, 1] from mobile touch interface.
   * Feeds directly into character movement physics without duplicating movement code.
   */
  public setVirtualJoystick(forward: number, right: number, isSprinting: boolean = false): void {
    this.joystickForward = Math.max(-1, Math.min(1, forward));
    this.joystickRight = Math.max(-1, Math.min(1, right));
    this.joystickSprinting = isSprinting;
  }

  /**
   * Triggers a jump impulse from mobile touch button or external trigger.
   */
  public triggerJump(): void {
    if (!this.isLocked) {
      this.jumpRequested = true;
    }
  }

  /**
   * Triggers an interaction event (shop / dialogue) identical to pressing 'E'.
   */
  public triggerInteract(): void {
    if (!this.isLocked && this.onInteractPressed) {
      this.onInteractPressed();
    }
  }

  /**
   * Triggers a handshake request/accept identical to pressing 'H'.
   */
  public triggerHandshake(): void {
    if (!this.isLocked && this.onHandshakePressed) {
      this.onHandshakePressed();
    }
  }

  /**
   * =========================================================================
   * update() - Physics Loop (Called Every Frame at 60 FPS)
   * =========================================================================
   */
  public update(deltaTime: number): void {
    if (this.isLocked) {
      this.animation.update(deltaTime);
      return;
    }

    const dt = Math.min(deltaTime, 0.1);

    // Step 1: Read directional inputs (Keyboard WASD + Virtual Joystick merged)
    let inputForward = this.joystickForward;
    let inputRight = this.joystickRight;

    if (this.keys['keyw'] || this.keys['arrowup']) inputForward += 1;
    if (this.keys['keys'] || this.keys['arrowdown']) inputForward -= 1;
    if (this.keys['keyd'] || this.keys['arrowright']) inputRight += 1;
    if (this.keys['keya'] || this.keys['arrowleft']) inputRight -= 1;

    // Clamp combined inputs to unit range
    inputForward = Math.max(-1, Math.min(1, inputForward));
    inputRight = Math.max(-1, Math.min(1, inputRight));

    this.isSprinting = !!(this.keys['shiftleft'] || this.keys['shiftright']) || this.joystickSprinting;
    const isJumpPressed = !!this.keys['space'] || this.jumpRequested;
    this.jumpRequested = false;

    // Step 2: Normalize input vector so diagonal movement is not faster than cardinal
    const inputLen = Math.hypot(inputForward, inputRight);
    let normForward = 0;
    let normRight = 0;
    if (inputLen > 0.001) {
      normForward = inputForward / inputLen;
      normRight = inputRight / inputLen;
    }

    // Step 3: Calculate Camera-Relative Movement
    // "Forward" means wherever camera looks horizontally (XZ plane)
    const camForward = this.camera.getForwardVector();
    const camRight = this.camera.getRightVector();

    this._moveDir.x = camForward.x * normForward + camRight.x * normRight;
    this._moveDir.y = 0;
    this._moveDir.z = camForward.z * normForward + camRight.z * normRight;

    const moveMag = Math.hypot(this._moveDir.x, this._moveDir.z);

    if (moveMag > 0.01) {
      this.isMoving = true;

      // Smoothly rotate character mesh towards movement heading
      // Uses frame-rate-independent exponential slerp
      const targetAngle = Math.atan2(this._moveDir.x, this._moveDir.z);
      const currentAngle = this.rootMesh.rotation.y;
      const diff = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
      const turnFactor = 1.0 - Math.exp(-14.0 * dt);
      this.rootMesh.rotation.y += diff * turnFactor;
    } else {
      // Stationary: Camera can orbit 360° freely without spinning player body!
      this.isMoving = false;
      this._moveDir.set(0, 0, 0);
    }

    // Step 4: Ground detection via downward Raycast
    this.checkGrounded();

    // Step 5: Vertical Velocity & Jumping
    if (this.isGrounded) {
      if (isJumpPressed) {
        this.verticalVelocity = this.jumpForce; // Launch upward
        this.isGrounded = false;
      } else {
        // Subtle downward force to stick smoothly to curbs and downward slopes
        this.verticalVelocity = -0.5;
      }
    } else {
      // In mid-air: Apply gravitational acceleration
      this.verticalVelocity += this.gravity * dt;
      // Clamp terminal fall velocity
      this.verticalVelocity = Math.max(this.verticalVelocity, -25.0);
    }

    // Step 6: Horizontal movement speed & Sidewalk Step Assist
    const currentSpeed = this.isSprinting ? this.runSpeed : this.walkSpeed;
    const horizontalSpeed = this.isMoving ? currentSpeed : 0;
    const vx = this._moveDir.x * horizontalSpeed;
    const vz = this._moveDir.z * horizontalSpeed;

    // Sidewalk Step Assist: Mount 0.25m curbs smoothly without stopping
    if (this.isMoving && this.isGrounded) {
      const pos = this.rootMesh.position;
      this._stepRay.origin.set(pos.x, pos.y + 0.12, pos.z);
      this._stepRay.direction.copyFrom(this._moveDir);

      const stepHit = this.scene.pickWithRay(this._stepRay, (mesh) => {
        return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
      });

      if (stepHit && stepHit.hit) {
        // Check if upper chest is clear (curb, not a full building wall)
        this._highRay.origin.set(pos.x, pos.y + 0.45, pos.z);
        this._highRay.direction.copyFrom(this._moveDir);

        const highHit = this.scene.pickWithRay(this._highRay, (mesh) => {
          return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
        });

        if (!highHit || !highHit.hit) {
          this.verticalVelocity = 1.6; // Gentle step-up lift
        }
      }
    }

    // Update internal velocity vector for multiplayer network synchronization
    this.velocity.set(vx, this.verticalVelocity, vz);

    // Step 7: Assemble total 3D displacement vector (dx = v * dt)
    this._displacement.set(vx * dt, this.verticalVelocity * dt, vz * dt);

    // Step 8: Move with Babylon's collision detection (slides smoothly along walls)
    this.rootMesh.moveWithCollisions(this._displacement);

    // Step 9: Safety respawn if falling out of world
    if (this.rootMesh.position.y < -5) {
      this.rootMesh.position.set(0, 1.2, 8);
      this.verticalVelocity = 0;
    }

    // Step 10: Update character animation state
    if (this.animation.getState() === 'handshake') {
      this.animation.update(dt);
      return;
    }

    let nextAnimState: AnimationState = 'idle';
    if (!this.isGrounded) {
      nextAnimState = 'jump';
    } else if (this.isMoving) {
      nextAnimState = this.isSprinting ? 'run' : 'walk';
    } else {
      nextAnimState = 'idle';
    }

    this.animation.setState(nextAnimState);
    this.animation.update(dt);
  }

  /**
   * =========================================================================
   * checkGrounded() - Raycast Ground Detector
   * =========================================================================
   * Shoots reusable downward ray from 0.4m above player feet.
   */
  private checkGrounded(): void {
    // If moving upwards with positive velocity, character cannot be grounded
    if (this.verticalVelocity > 0.1) {
      this.isGrounded = false;
      return;
    }

    const pos = this.rootMesh.position;
    this._groundRay.origin.set(pos.x, pos.y + 0.4, pos.z);

    const hit = this.scene.pickWithRay(this._groundRay, (mesh) => {
      return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
    });

    this.isGrounded = !!(hit && hit.hit);
  }

  public getVelocity(): Vector3 {
    return this.velocity;
  }

  public getIsGrounded(): boolean {
    return this.isGrounded;
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public getIsSprinting(): boolean {
    return this.isSprinting;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
