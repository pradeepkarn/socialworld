import { IInteractionPrompt, IShop } from '@/types/game';
import { Player } from '../player/Player';
import { ShopManager } from '../shops/ShopManager';

export type PromptListener = (prompt: IInteractionPrompt) => void;
export type OpenShopListener = (shop: IShop | null) => void;

export class InteractionManager {
  private player: Player;
  private shopManager: ShopManager;

  private currentPrompt: IInteractionPrompt = {
    visible: false,
    message: '',
    actionKey: 'E',
  };

  private promptListeners: Set<PromptListener> = new Set();
  private openShopListeners: Set<OpenShopListener> = new Set();
  private activeOpenShop: IShop | null = null;

  constructor(player: Player, shopManager: ShopManager) {
    this.player = player;
    this.shopManager = shopManager;

    // Attach interaction key handler from PlayerController
    this.player.controller.onInteractPressed = this.handleInteractPressed;
  }

  public onPrompt(listener: PromptListener): () => void {
    this.promptListeners.add(listener);
    // Emit current state immediately
    listener(this.currentPrompt);
    return () => this.promptListeners.delete(listener);
  }

  public onOpenShop(listener: OpenShopListener): () => void {
    this.openShopListeners.add(listener);
    return () => this.openShopListeners.delete(listener);
  }

  /**
   * Called every frame in the Babylon render loop.
   */
  public update(): void {
    // If shop modal is already open, do not show walking prompts
    if (this.activeOpenShop) return;

    const playerPos = {
      x: this.player.rootMesh.position.x,
      y: this.player.rootMesh.position.y,
      z: this.player.rootMesh.position.z,
    };

    const nearbyShop = this.shopManager.findShopNearPlayer(playerPos);

    if (nearbyShop) {
      if (!this.currentPrompt.visible || this.currentPrompt.shopId !== nearbyShop.getId()) {
        this.setPrompt({
          visible: true,
          message: `Press [E] to browse ${nearbyShop.getName()}`,
          targetName: nearbyShop.getName(),
          actionKey: 'E',
          shopId: nearbyShop.getId(),
        });
      }
    } else {
      if (this.currentPrompt.visible) {
        this.setPrompt({
          visible: false,
          message: '',
          actionKey: 'E',
        });
      }
    }
  }

  private setPrompt(prompt: IInteractionPrompt): void {
    this.currentPrompt = prompt;
    this.promptListeners.forEach((fn) => fn(prompt));
  }

  private handleInteractPressed = (): void => {
    // If shop is already open, pressing E closes it
    if (this.activeOpenShop) {
      this.closeShop();
      return;
    }

    // If near a shop, open it
    if (this.currentPrompt.visible && this.currentPrompt.shopId) {
      const shop = this.shopManager.getShop(this.currentPrompt.shopId);
      if (shop) {
        this.openShop(shop.data);
      }
    }
  };

  public openShop(shop: IShop): void {
    this.activeOpenShop = shop;
    this.player.controller.setLocked(true); // Lock character movement while shopping
    this.setPrompt({ visible: false, message: '', actionKey: 'E' });
    this.openShopListeners.forEach((fn) => fn(shop));
  }

  public closeShop(): void {
    this.activeOpenShop = null;
    this.player.controller.setLocked(false); // Restore character movement
    this.openShopListeners.forEach((fn) => fn(null));
  }

  public dispose(): void {
    this.promptListeners.clear();
    this.openShopListeners.clear();
  }
}
