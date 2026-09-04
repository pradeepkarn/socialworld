import { IInteractionPrompt, IShop } from '@/types/game';
import { Player } from '../player/Player';
import { ShopManager } from '../shops/ShopManager';

export type PromptListener = (prompt: IInteractionPrompt) => void;
export type OpenShopListener = (shop: IShop | null) => void;

/**
 * =========================================================================
 * InteractionManager - The Bridge Between 3D World & 2D React UI
 * =========================================================================
 * WHAT IT DOES:
 * - Listens to the player's position in the 3D scene every frame.
 * - When the player walks close to a shop entrance, it tells React to display
 *   the floating "Press [E] to browse CyberMart" prompt overlay.
 * - When the player presses 'E', it pauses player movement and opens the
 *   full-screen 2D shopping catalog modal (`ShopUI.tsx`).
 * - When the shop modal closes, it restores player movement.
 */
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

    // Attach interaction key handler from PlayerController (fires on 'E' keydown)
    this.player.controller.onInteractPressed = this.handleInteractPressed;
  }

  /**
   * Allows React components to subscribe to changes in the interaction prompt.
   */
  public onPrompt(listener: PromptListener): () => void {
    this.promptListeners.add(listener);
    // Emit current state immediately to the new listener
    listener(this.currentPrompt);
    return () => this.promptListeners.delete(listener);
  }

  /**
   * Allows React components to listen for when a shop modal opens or closes.
   */
  public onOpenShop(listener: OpenShopListener): () => void {
    this.openShopListeners.add(listener);
    return () => this.openShopListeners.delete(listener);
  }

  /**
   * =========================================================================
   * update() - Frame-by-Frame Proximity Checker
   * =========================================================================
   * WHAT IT DOES:
   * - Called inside Babylon's 60 FPS render loop (`engine.runRenderLoop`).
   * - If player is already shopping in a menu, it skips checking.
   * - Finds if any shop is near the player's current (X, Y, Z).
   * - If yes: displays the "[E] Browse" HUD banner.
   * - If no: automatically hides the banner when walking away.
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

  /**
   * Internal helper to broadcast prompt updates to all React listeners.
   */
  private setPrompt(prompt: IInteractionPrompt): void {
    this.currentPrompt = prompt;
    this.promptListeners.forEach((fn) => fn(prompt));
  }

  /**
   * =========================================================================
   * handleInteractPressed() - 'E' Key Event Handler
   * =========================================================================
   * WHAT IT DOES:
   * - When player taps the 'E' key:
   *   - If a shop is already open -> closes it.
   *   - If standing in front of a shop -> opens that shop's catalog.
   */
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

  /**
   * =========================================================================
   * openShop() - Opening Shop Modal & Freezing Movement
   * =========================================================================
   * WHAT IT DOES:
   * - Locks player WASD/mouse movement so you don't accidentally walk into a wall
   *   while browsing items.
   * - Hides the interaction prompt.
   * - Tells React to render the ShopUI modal overlay.
   */
  public openShop(shop: IShop): void {
    this.activeOpenShop = shop;
    this.player.controller.setLocked(true); // Lock character movement while shopping
    this.setPrompt({ visible: false, message: '', actionKey: 'E' });
    this.openShopListeners.forEach((fn) => fn(shop));
  }

  /**
   * =========================================================================
   * closeShop() - Exiting Shop Modal & Restoring Movement
   * =========================================================================
   * WHAT IT DOES:
   * - Unlocks character controls so the player can walk around freely again.
   * - Dismisses the React shop modal.
   */
  public closeShop(): void {
    this.activeOpenShop = null;
    this.player.controller.setLocked(false); // Restore character movement
    this.openShopListeners.forEach((fn) => fn(null));
  }

  /**
   * Cleans up listener sets when unmounting.
   */
  public dispose(): void {
    this.promptListeners.clear();
    this.openShopListeners.clear();
  }
}
