'use client';

import React, { useEffect, useRef } from 'react';
import { Engine, Scene } from '@babylonjs/core';
import { createEngine } from '@/game/engine/createEngine';
import { createScene } from '@/game/engine/createScene';
import { AssetManager } from '@/game/assets/AssetManager';
import { WorldManager } from '@/game/world/WorldManager';
import { Player } from '@/game/player/Player';
import { ShopManager } from '@/game/shops/ShopManager';
import { InteractionManager } from '@/game/interaction/InteractionManager';
import {
  IInteractionPrompt,
  IShop,
  IInventoryItem,
  IVector3,
  TimeOfDay,
} from '@/types/game';

export interface GameCanvasHandle {
  purchaseItem: (shopId: string, productId: string) => { success: boolean; message: string };
  toggleTimeOfDay: () => TimeOfDay;
  closeShop: () => void;
}

interface GameCanvasProps {
  onPromptChange: (prompt: IInteractionPrompt) => void;
  onOpenShop: (shop: IShop | null) => void;
  onPlayerStatsUpdate: (stats: { credits: number; inventory: IInventoryItem[] }) => void;
  onMinimapUpdate: (data: { position: IVector3; rotationY: number }) => void;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  canvasRefCallback?: (handle: GameCanvasHandle | null) => void;
}

/**
 * =========================================================================
 * GameCanvas - React-Babylon 3D Game Lifecycle Host
 * =========================================================================
 * WHAT IT DOES:
 * - Mounts an HTML5 `<canvas>` in React and spins up the entire 3D universe!
 * - Manages the lifecycle of Babylon.js (creation, render loop, and cleanup).
 * - Bridges 3D game events (like opening a shop or updating minimap) into
 *   standard React state hooks.
 *
 * KEY GAME ARCHITECTURE PATTERNS:
 * - 60 FPS Render Loop: `engine.runRenderLoop()` runs every 16 milliseconds
 *   updating player movement, collision physics, and drawing pixels to screen.
 * - State Throttling (10 Hz): React cannot re-render 60 times a second without
 *   lagging. We throttle minimap coordinates to 10 Hz (every 90ms) so React
 *   stays lightning-fast while Babylon renders silky-smooth 60 FPS in 3D!
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  onPromptChange,
  onOpenShop,
  onPlayerStatsUpdate,
  onMinimapUpdate,
  onTimeOfDayChange,
  canvasRefCallback,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: Engine | null = null;
    let scene: Scene | null = null;
    let worldManager: WorldManager | null = null;
    let player: Player | null = null;
    let shopManager: ShopManager | null = null;
    let interactionManager: InteractionManager | null = null;
    let isDisposed = false;

    try {
      // Step 1: Initialize WebGL Engine
      engine = createEngine(canvas);

      // 2. Create Scene
      scene = createScene(engine);

      // 3. Asset & World Management
      const assetManager = new AssetManager(scene);
      worldManager = new WorldManager(scene, assetManager);

      // 4. Player & Rig
      player = new Player(scene, canvas, worldManager.environment);

      // 5. Shops & Interactions
      shopManager = new ShopManager();
      interactionManager = new InteractionManager(player, shopManager);

      // Initial stats dispatch
      onPlayerStatsUpdate({
        credits: player.credits,
        inventory: player.inventory,
      });

      onTimeOfDayChange(worldManager.getTimeOfDay());

      // Subscribe to interactions
      const unsubPrompt = interactionManager.onPrompt((prompt) => {
        if (!isDisposed) onPromptChange(prompt);
      });

      const unsubShop = interactionManager.onOpenShop((shop) => {
        if (!isDisposed) onOpenShop(shop);
      });

      // Expose controller handles
      if (canvasRefCallback) {
        canvasRefCallback({
          purchaseItem: (shopId: string, productId: string) => {
            if (!player || !shopManager) return { success: false, message: 'Game not ready' };
            const result = shopManager.purchaseItem(player, shopId, productId);
            if (result.success) {
              onPlayerStatsUpdate({
                credits: player.credits,
                inventory: [...player.inventory],
              });
            }
            return result;
          },
          toggleTimeOfDay: () => {
            if (!worldManager) return 'day';
            const next = worldManager.toggleTimeOfDay();
            onTimeOfDayChange(next);
            return next;
          },
          closeShop: () => {
            if (interactionManager) interactionManager.closeShop();
          },
        });
      }

      // 6. Throttled minimap dispatcher (10 Hz instead of 60 Hz to protect React rendering)
      let lastMinimapTime = 0;

      // 7. Babylon Render Loop
      engine.runRenderLoop(() => {
        if (!scene || !engine || isDisposed) return;

        const deltaTime = engine.getDeltaTime() / 1000;

        // Update player & camera
        if (player) {
          player.update(deltaTime);
        }

        // Update proximity interaction triggers
        if (interactionManager) {
          interactionManager.update();
        }

        // Render scene
        scene.render();

        // Minimap dispatch check
        const now = performance.now();
        if (now - lastMinimapTime > 90 && player) {
          lastMinimapTime = now;
          onMinimapUpdate({
            position: {
              x: player.rootMesh.position.x,
              y: player.rootMesh.position.y,
              z: player.rootMesh.position.z,
            },
            rotationY: player.rootMesh.rotation.y,
          });
        }
      });

      // Handle window resizing
      const handleResize = () => {
        if (engine && !isDisposed) {
          engine.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        isDisposed = true;
        if (canvasRefCallback) canvasRefCallback(null);
        window.removeEventListener('resize', handleResize);
        unsubPrompt();
        unsubShop();

        if (interactionManager) interactionManager.dispose();
        if (player) player.dispose();
        if (worldManager) worldManager.dispose();
        if (assetManager) assetManager.dispose();
        if (scene) scene.dispose();
        if (engine) engine.dispose();
      };
    } catch (err) {
      console.error('[GameCanvas] Initialization error:', err);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="renderCanvas"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
        touchAction: 'none',
      }}
    />
  );
};
