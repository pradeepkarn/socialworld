import { Shop } from './Shop';
import { CYBERMART_PRODUCTS, NEONCAFE_PRODUCTS } from './Product';
import { IProduct, IShop, IVector3 } from '@/types/game';
import { Player } from '../player/Player';

export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: IProduct;
  remainingCredits?: number;
}

export class ShopManager {
  private shops: Map<string, Shop> = new Map();

  constructor() {
    this.registerDefaultShops();
  }

  private registerDefaultShops(): void {
    const cybermartData: IShop = {
      id: 'cybermart',
      name: 'CyberMart Tech & Gear',
      tagline: 'High-grade hardware, apparel & implants for urban runners',
      category: 'Tech & Apparel',
      position: { x: -12, y: 0, z: 20 },
      triggerRadius: 6.5,
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

  public getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  public getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  /**
   * Find any shop that the player is currently in range of.
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
   * Process a purchase transaction.
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

    if (player.credits < product.price) {
      return {
        success: false,
        message: `Insufficient credits. Need $${product.price}, have $${player.credits}`,
      };
    }

    // Deduct player funds and add to inventory
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
