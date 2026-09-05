import {
  AnimationState,
  IPlayerNetworkState,
  IVector3,
} from '../network/MessageTypes';

const VALID_ANIMATION_STATES: Set<AnimationState> = new Set([
  'idle',
  'walk',
  'run',
  'jump',
]);

const WORLD_BOUNDS = {
  minX: -250,
  maxX: 250,
  minY: -10,
  maxY: 150,
  minZ: -250,
  maxZ: 250,
};

/**
 * Validates and sanitizes an incoming player state update.
 * Prevents NaN, infinite coordinates, and out-of-bounds positions from corrupting world state.
 */
export function sanitizePlayerUpdate(
  id: string,
  name: string,
  rawPayload: unknown
): IPlayerNetworkState | null {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return null;
  }

  const data = rawPayload as Record<string, unknown>;

  // Validate position
  const pos = data.position as Record<string, unknown> | undefined;
  if (!pos || typeof pos !== 'object') {
    return null;
  }

  const x = Number(pos.x);
  const y = Number(pos.y);
  const z = Number(pos.z);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  // Clamping within sensible world boundaries
  const clampedX = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x));
  const clampedY = Math.max(WORLD_BOUNDS.minY, Math.min(WORLD_BOUNDS.maxY, y));
  const clampedZ = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z));

  // Validate rotation
  let rotation = Number(data.rotation);
  if (!Number.isFinite(rotation)) {
    rotation = 0;
  }

  // Validate animation state
  let animationState: AnimationState = 'idle';
  if (
    typeof data.animationState === 'string' &&
    VALID_ANIMATION_STATES.has(data.animationState as AnimationState)
  ) {
    animationState = data.animationState as AnimationState;
  }

  // Optional velocity
  let velocity: IVector3 | undefined = undefined;
  if (data.velocity && typeof data.velocity === 'object') {
    const v = data.velocity as Record<string, unknown>;
    const vx = Number(v.x);
    const vy = Number(v.y);
    const vz = Number(v.z);
    if (Number.isFinite(vx) && Number.isFinite(vy) && Number.isFinite(vz)) {
      velocity = { x: vx, y: vy, z: vz };
    }
  }

  const timestamp = Number.isFinite(Number(data.timestamp))
    ? Number(data.timestamp)
    : Date.now();

  return {
    id,
    name,
    position: { x: clampedX, y: clampedY, z: clampedZ },
    rotation,
    animationState,
    velocity,
    timestamp,
  };
}
