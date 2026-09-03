import { Scene, Vector3, Ray, AbstractMesh } from '@babylonjs/core';
import { PlayerCamera } from './PlayerCamera';
import { PlayerAnimation } from './PlayerAnimation';
import { AnimationState } from '@/types/game';

export class PlayerController {
  private scene: Scene;
  private rootMesh: AbstractMesh;
  private camera: PlayerCamera;
  private animation: PlayerAnimation;

  // Input states
  private keys: Record<string, boolean> = {};

  // Movement physics variables
  private velocity: Vector3 = Vector3.Zero();
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  private isMoving: boolean = false;
  private isSprinting: boolean = false;

  // Speeds (meters per second)
  private readonly walkSpeed: number = 5.0;
  private readonly runSpeed: number = 9.5;
  private readonly jumpForce: number = 7.5;
  private readonly gravity: number = -18.0;

  // Controls lock (e.g. when shop UI is open)
  private isLocked: boolean = false;

  // Interaction key callback
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

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    this.keys[code] = true;

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

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
    if (locked) {
      this.keys = {};
      this.animation.setState('idle');
    }
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Main physics & movement update step called every frame.
   */
  public update(deltaTime: number): void {
    if (this.isLocked) {
      this.animation.update(deltaTime);
      return;
    }

    // 1. Gather directional inputs
    let inputForward = 0;
    let inputRight = 0;

    if (this.keys['keyw'] || this.keys['arrowup']) inputForward += 1;
    if (this.keys['keys'] || this.keys['arrowdown']) inputForward -= 1;
    if (this.keys['keyd'] || this.keys['arrowright']) inputRight += 1;
    if (this.keys['keya'] || this.keys['arrowleft']) inputRight -= 1;

    this.isSprinting = !!(this.keys['shiftleft'] || this.keys['shiftright']);
    const isJumpPressed = !!this.keys['space'];

    // 2. Compute camera-relative movement vector
    const camForward = this.camera.getForwardVector();
    const camRight = this.camera.getRightVector();

    let moveDir = camForward.scale(inputForward).add(camRight.scale(inputRight));
    const inputMagnitude = moveDir.length();

    if (inputMagnitude > 0.01) {
      moveDir = moveDir.normalize();
      this.isMoving = true;

      // Smoothly rotate character towards movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      const currentAngle = this.rootMesh.rotation.y;
      const diff = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
      this.rootMesh.rotation.y += diff * 12.0 * deltaTime;
    } else {
      this.isMoving = false;
    }

    // 3. Ground detection via raycast
    this.checkGrounded();

    // 4. Vertical velocity & Jumping
    if (this.isGrounded) {
      if (isJumpPressed) {
        this.verticalVelocity = this.jumpForce;
        this.isGrounded = false;
      } else {
        // Stick to ground slope
        this.verticalVelocity = -0.5;
      }
    } else {
      this.verticalVelocity += this.gravity * deltaTime;
      // Terminal velocity clamp
      this.verticalVelocity = Math.max(this.verticalVelocity, -25.0);
    }

    // 5. Horizontal speed
    const currentSpeed = this.isSprinting ? this.runSpeed : this.walkSpeed;
    const horizontalVelocity = moveDir.scale(this.isMoving ? currentSpeed : 0);

    // 6. Assemble total displacement vector
    const displacement = new Vector3(
      horizontalVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      horizontalVelocity.z * deltaTime
    );

    // 7. Move with Babylon collision system
    this.rootMesh.moveWithCollisions(displacement);

    // 8. Prevent falling into the abyss
    if (this.rootMesh.position.y < -5) {
      this.rootMesh.position.set(0, 2, 0);
      this.verticalVelocity = 0;
    }

    // 9. Update animation state
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

  private checkGrounded(): void {
    const rayOrigin = this.rootMesh.position.add(new Vector3(0, 0.4, 0));
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 0.65);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.checkCollisions && mesh !== this.rootMesh && !mesh.name.startsWith('player_');
    });

    this.isGrounded = !!(hit && hit.hit);
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
