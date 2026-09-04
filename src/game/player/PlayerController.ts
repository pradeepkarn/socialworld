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
 *   1. Camera-Relative Movement: Pressing 'W' runs toward where your camera looks.
 *   2. Smooth Turning: Turns the character's body smoothly toward the movement direction.
 *   3. Ground Raycasting: Casts an invisible laser down to detect if feet touch the ground.
 *   4. Realistic Gravity & Jumping: Accelerates downward in air; jumps on Space.
 *   5. Collision Sliding: Slides smoothly along building walls using `moveWithCollisions`.
 *   6. Animation Switching: Automatically toggles idle, walk, run, and jump poses.
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
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    this.keys[code] = false;
  };

  /**
   * Locks or unlocks character movement (e.g. when reading shop catalog).
   */
  public setLocked(locked: boolean): void {
    this.isLocked = locked;
    if (locked) {
      this.keys = {}; // Clear any stuck keys
      this.animation.setState('idle');
    }
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  /**
   * =========================================================================
   * update() - Physics Loop (Called Every Frame at 60 FPS)
   * =========================================================================
   * Executes the 9-step character movement pipeline:
   */
  public update(deltaTime: number): void {
    if (this.isLocked) {
      this.animation.update(deltaTime);
      return;
    }

    // Step 1: Read directional keys
    let inputForward = 0;
    let inputRight = 0;

    if (this.keys['keyw'] || this.keys['arrowup']) inputForward += 1;
    if (this.keys['keys'] || this.keys['arrowdown']) inputForward -= 1;
    if (this.keys['keyd'] || this.keys['arrowright']) inputRight += 1;
    if (this.keys['keya'] || this.keys['arrowleft']) inputRight -= 1;

    this.isSprinting = !!(this.keys['shiftleft'] || this.keys['shiftright']);
    const isJumpPressed = !!this.keys['space'];

    // Step 2: Calculate Camera-Relative Movement
    // "Forward" means wherever the camera is currently looking!
    const camForward = this.camera.getForwardVector();
    const camRight = this.camera.getRightVector();

    let moveDir = camForward.scale(inputForward).add(camRight.scale(inputRight));
    const inputMagnitude = moveDir.length();

    if (inputMagnitude > 0.01) {
      moveDir = moveDir.normalize();
      this.isMoving = true;

      // Smoothly rotate character mesh towards the movement heading
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      const currentAngle = this.rootMesh.rotation.y;
      const diff = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
      this.rootMesh.rotation.y += diff * 12.0 * deltaTime; // 12x angular speed for responsive turning
    } else {
      this.isMoving = false;
    }

    // Step 3: Ground detection via downward Raycast
    this.checkGrounded();

    // Step 4: Vertical Velocity & Jumping
    if (this.isGrounded) {
      if (isJumpPressed) {
        this.verticalVelocity = this.jumpForce; // Launch upward
        this.isGrounded = false;
      } else {
        // Small downward force to stick smoothly to slopes/curbs
        this.verticalVelocity = -0.5;
      }
    } else {
      // In mid-air: Apply gravitational acceleration (v = v + g * dt)
      this.verticalVelocity += this.gravity * deltaTime;
      // Clamp terminal fall velocity so you don't drop at infinite speed
      this.verticalVelocity = Math.max(this.verticalVelocity, -25.0);
    }

    // Step 5: Horizontal movement speed & Sidewalk Step Assist
    const currentSpeed = this.isSprinting ? this.runSpeed : this.walkSpeed;
    const horizontalVelocity = moveDir.scale(this.isMoving ? currentSpeed : 0);

    // Sidewalk Step Assist: Smoothly step up onto 0.25m curbs without stopping or requiring manual jump
    if (this.isMoving && this.isGrounded) {
      const stepRayOrigin = this.rootMesh.position.add(new Vector3(0, 0.12, 0));
      const stepRay = new Ray(stepRayOrigin, moveDir, 0.65);
      const stepHit = this.scene.pickWithRay(stepRay, (mesh) => {
        return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
      });

      if (stepHit && stepHit.hit) {
        // Confirm upper knee/waist is clear (meaning obstacle is a curb/step, not a full building wall)
        const highRayOrigin = this.rootMesh.position.add(new Vector3(0, 0.45, 0));
        const highRay = new Ray(highRayOrigin, moveDir, 0.7);
        const highHit = this.scene.pickWithRay(highRay, (mesh) => {
          return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
        });

        if (!highHit || !highHit.hit) {
          this.verticalVelocity = 1.6; // Gentle vertical lift to smoothly mount the curb
        }
      }
    }

    // Update internal velocity vector (for state synchronization)
    this.velocity = new Vector3(horizontalVelocity.x, this.verticalVelocity, horizontalVelocity.z);

    // Step 6: Assemble total 3D displacement vector (dx = v * dt)
    const displacement = new Vector3(
      horizontalVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      horizontalVelocity.z * deltaTime
    );

    // Step 7: Move with Babylon's collision detection (slides along walls)
    this.rootMesh.moveWithCollisions(displacement);

    // Step 8: Safety respawn if falling out of world (spawns safely at avenue promenade, not inside monument)
    if (this.rootMesh.position.y < -5) {
      this.rootMesh.position.set(0, 1.2, 8);
      this.verticalVelocity = 0;
    }

    // Step 9: Update character animation state
    let nextAnimState: AnimationState = 'idle';
    if (!this.isGrounded) {
      nextAnimState = 'jump';
    } else if (this.isMoving) {
      nextAnimState = this.isSprinting ? 'run' : 'walk';
    } else {
      nextAnimState = 'idle';
    }

    this.animation.setState(nextAnimState);
    this.animation.update(deltaTime);
  }

  /**
   * =========================================================================
   * checkGrounded() - Raycast Laser Ground Detector
   * =========================================================================
   * Shoots an invisible ray downwards 0.65m from the character's knees.
   * If it hits a solid mesh with collision enabled, the player is grounded.
   */
  private checkGrounded(): void {
    const rayOrigin = this.rootMesh.position.add(new Vector3(0, 0.4, 0));
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 0.65);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
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
