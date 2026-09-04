import { Shop } from './Shop';
import { CYBERMART_PRODUCTS, NEONCAFE_PRODUCTS } from './Product';
import { IProduct, IShop, IVector3 } from '@/types/game';
import { Player } from '../player/Player';

/**
 * The response object returned after an item purchase attempt.
 */
export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: IProduct;
  remainingCredits?: number;
}

/**
 * =========================================================================
 * ShopManager
 * =========================================================================
 * WHAT IT DOES:
 * - The "Commercial Backend" of the game.
 * - Stores all registered shops in a Map.
 * - Handles player proximity checks (detecting when player walks near a shop).
 * - Executes secure shopping transactions (checking player wallet, deducting money,
 *   and granting the purchased item into the player's inventory).
 */
export class ShopManager {
  private shops: Map<string, Shop> = new Map();

  constructor() {
    this.registerDefaultShops();
  }

  /**
   * =========================================================================
   * registerDefaultShops() - Bootstrapping City Stores
   * =========================================================================
   * WHAT IT DOES:
   * - Configures the initial stores in the city:
   *   1. CyberMart: High-tech runner gear, cybernetic implants, armor.
   *   2. Neon Cafe: Energy snacks, coffee, stamina elixirs.
   * - Defines their location, trigger radius, color themes, and merchandise.
   */
  private registerDefaultShops(): void {
    const cybermartData: IShop = {
      id: 'cybermart',
      name: 'CyberMart Tech & Gear',
      tagline: 'High-grade hardware, apparel & implants for urban runners',
      category: 'Tech & Apparel',
      position: { x: -12, y: 0, z: 20 },
      triggerRadius: 6.5, // Player must be within 6.5 meters to browse
      products: CYBERMART_PRODUCTS,
      bannerColor: '#00e5ff',
    };

    const neoncafeData: IShop = {
      id: 'neoncafe',
      name: 'Neon Cafe & Lounge',
      tagline: 'Energizing elixirs, nitro brews & vital snacks',
      category: 'Refreshments & Stamina',
      position: { x: 12, y: 0, z: 20 },
      triggerRadius: 6.5,
      products: NEONCAFE_PRODUCTS,
      bannerColor: '#ff2a85',
    };

    this.shops.set(cybermartData.id, new Shop(cybermartData));
    this.shops.set(neoncafeData.id, new Shop(neoncafeData));
  }

  /**
   * Retrieves a shop instance by its unique ID.
   */
  public getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  /**
   * Returns a list of all active shops in the city.
   */
  public getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  /**
   * =========================================================================
   * findShopNearPlayer() - Player Proximity Search
   * =========================================================================
   * WHAT IT DOES:
   * - Called on every frame by InteractionManager.
   * - Checks the player's current (X, Z) position against all shops.
   * - If the player is inside a shop's trigger radius, returns that shop.
   * - Returns null if the player is just walking on an open street.
   */
  public findShopNearPlayer(playerPos: IVector3): Shop | null {
    for (const shop of this.shops.values()) {
      if (shop.isPlayerInsideTrigger(playerPos)) {
        return shop;
      }
    }
    return null;
  }

  /**
   * =========================================================================
   * purchaseItem() - Transaction Processor
   * =========================================================================
   * WHAT IT DOES:
   * - Safely executes an item purchase:
   *   1. Validates that the shop and item exist.
   *   2. Verifies the player has enough credits (`player.credits >= price`).
   *   3. Deducts money from the player (`player.deductCredits(price)`).
   *   4. Adds the item to player inventory (`player.addItem(...)`).
   *   5. Returns a success receipt with updated balance.
   */
  public purchaseItem(player: Player, shopId: string, productId: string): PurchaseResult {
    const shop = this.shops.get(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found' };
    }

    const product = shop.getProducts().find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: 'Item not found in catalog' };
    }

    // Guard: Prevent purchase if player cannot afford it
    if (player.credits < product.price) {
      return {
        success: false,
        message: `Insufficient credits. Need $${product.price}, have $${player.credits}`,
      };
    }

    // Deduct player funds and add item to inventory
    player.deductCredits(product.price);
    player.addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      icon: product.icon,
      quantity: 1,
    });

    return {
      success: true,
      message: `Purchased ${product.name} for $${product.price}!`,
      item: product,
      remainingCredits: player.credits,
    };
  }
}
