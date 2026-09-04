import { IShop, IProduct, IVector3 } from '@/types/game';

/**
 * =========================================================================
 * Shop
 * =========================================================================
 * WHAT IT DOES:
 * - Represents an individual retail store in the game world (e.g. CyberMart, Neon Cafe).
 * - Holds its catalog of products, its world position, and its trigger zone.
 *
 * KEY CONCEPTS:
 * - Proximity Trigger Detection:
 *   Calculates whether the player is standing close enough to the shop entrance
 *   to see the "Press [E] to browse" prompt on the screen.
 */
export class Shop {
  public data: IShop;

  constructor(data: IShop) {
    this.data = data;
  }

  /**
   * Returns the shop's unique ID (e.g. 'cybermart' or 'neoncafe').
   */
  public getId(): string {
    return this.data.id;
  }

  /**
   * Returns the full commercial name of the shop (e.g. 'CyberMart Tech & Gear').
   */
  public getName(): string {
    return this.data.name;
  }

  /**
   * Returns the catalog list of items available for sale in this shop.
   */
  public getProducts(): IProduct[] {
    return this.data.products;
  }

  /**
   * =========================================================================
   * isPlayerInsideTrigger() - 2D Distance Check
   * =========================================================================
   * WHAT IT DOES:
   * - Checks if the player's 3D position is within `triggerRadius` meters of
   *   the shop entrance.
   *
   * KEY 3D MATH TRICK (Distance Squared):
   * - In mathematics, distance formula is: `Math.sqrt(dx*dx + dz*dz) <= radius`
   * - However, `Math.sqrt()` is mathematically expensive to run 60 times per second.
   * - By squaring both sides (`dx*dx + dz*dz <= radius*radius`), we get the
   *   exact same result at 10x faster speed! This is an industry-standard game dev optimization.
   */
  public isPlayerInsideTrigger(playerPos: IVector3): boolean {
    const dx = playerPos.x - this.data.position.x;
    const dz = playerPos.z - this.data.position.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= this.data.triggerRadius * this.data.triggerRadius;
  }
}
