import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Ray,
  AbstractMesh,
} from '@babylonjs/core';

export class PlayerCamera {
  public camera: ArcRotateCamera;
  private scene: Scene;
  private targetMesh: AbstractMesh | null = null;
  private targetOffset: Vector3 = new Vector3(0, 1.6, 0);
  private desiredRadius: number = 6.5;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // Create 3rd-person ArcRotateCamera
    this.camera = new ArcRotateCamera(
      'player_camera',
      -Math.PI / 2,
      Math.PI / 2.8,
      this.desiredRadius,
      new Vector3(0, 1.6, 0),
      this.scene
    );

    // Camera limits & damping
    this.camera.lowerRadiusLimit = 2.0;
    this.camera.upperRadiusLimit = 15.0;
    this.camera.lowerBetaLimit = 0.15;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.08; // Prevent going underneath ground
    this.camera.angularSensibilityX = 1400;
    this.camera.angularSensibilityY = 1400;
    this.camera.wheelPrecision = 25;
    this.camera.inertia = 0.8;

    // Attach mouse controls
    this.camera.attachControl(canvas, true);

    // Collision detection so camera does not clip through buildings
    this.camera.checkCollisions = true;
    this.camera.collisionRadius = new Vector3(0.4, 0.4, 0.4);
  }

  public setTarget(mesh: AbstractMesh): void {
    this.targetMesh = mesh;
  }

  /**
   * Smoothly updates camera target position and prevents geometry clipping.
   */
  public update(): void {
    if (!this.targetMesh) return;

    const targetPos = this.targetMesh.position.add(this.targetOffset);

    // Smooth camera target following
    this.camera.target = Vector3.Lerp(this.camera.target, targetPos, 0.15);

    // Occlusion raycast from target to camera eye
    const rayDir = this.camera.position.subtract(this.camera.target).normalize();
    const ray = new Ray(this.camera.target, rayDir, this.desiredRadius);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.checkCollisions && mesh !== this.targetMesh && !mesh.name.startsWith('player_');
    });

    if (hit && hit.hit && hit.distance > 1.2) {
      this.camera.radius = Math.max(2.0, hit.distance - 0.5);
    }
  }

  public getForwardVector(): Vector3 {
    // Return camera forward projection on horizontal XZ plane
    const forward = this.camera.getForwardRay().direction;
    forward.y = 0;
    return forward.normalize();
  }

  public getRightVector(): Vector3 {
    const forward = this.getForwardVector();
    return new Vector3(forward.z, 0, -forward.x).normalize();
  }

  public dispose(): void {
    this.camera.detachControl();
    this.camera.dispose();
  }
}
