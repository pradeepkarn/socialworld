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
import { MultiplayerClient } from '@/game/multiplayer/MultiplayerClient';
import { RemotePlayerManager } from '@/game/multiplayer/RemotePlayerManager';
import { getDeterministicAppearance } from '@/game/player/PlayerAppearance';
import { INetworkStats } from '@/game/multiplayer/NetworkTypes';
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
  setTimeOfDay: (time: TimeOfDay) => void;
  closeShop: () => void;
  setMobileJoystick: (forward: number, right: number, isSprinting: boolean) => void;
  rotateCamera: (deltaYaw: number, deltaPitch: number) => void;
  zoomCamera: (delta: number) => void;
  setCameraDistance: (dist: number) => void;
  getCameraDistance: () => number;
  setCameraSensitivity: (multiplier: number) => void;
  triggerJump: () => void;
  triggerInteract: () => void;
  triggerHandshake: () => void;
}

interface GameCanvasProps {
  onPromptChange: (prompt: IInteractionPrompt) => void;
  onOpenShop: (shop: IShop | null) => void;
  onPlayerStatsUpdate: (stats: { credits: number; inventory: IInventoryItem[] }) => void;
  onMinimapUpdate: (data: { position: IVector3; rotationY: number }) => void;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  onNetworkStatsUpdate?: (stats: INetworkStats) => void;
  onSocialNotification?: (message: string) => void;
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
  onNetworkStatsUpdate,
  onSocialNotification,
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
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__scene = scene;
      }

      // 3. Asset & World Management
      const assetManager = new AssetManager(scene);
      worldManager = new WorldManager(scene, assetManager);

      // 4. Player & Rig
      player = new Player(scene, canvas, worldManager.environment);

      // 4b. Multiplayer Foundation (Phase 2)
      const remotePlayerManager = new RemotePlayerManager(scene);
      const networkClient = new MultiplayerClient();

      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__player = player;
        (window as unknown as Record<string, unknown>).__remotePlayerManager = remotePlayerManager;
        (window as unknown as Record<string, unknown>).__networkClient = networkClient;
      }

      // Handshake & Combined Prompts Coordination
      let pendingHandshakePrompt: { fromId: string; fromName: string } | null = null;
      let pendingPromptTimeout: NodeJS.Timeout | null = null;
      let shopPrompt: IInteractionPrompt = { visible: false, message: '', actionKey: 'E' };
      let handshakePrompt: IInteractionPrompt | null = null;
      let lastDispatchedKey: string = '';

      const dispatchCombinedPrompt = () => {
        if (isDisposed) return;
        const active = handshakePrompt || (shopPrompt.visible ? shopPrompt : null) || { visible: false, message: '', actionKey: 'E' };
        const key = `${active.visible}_${active.actionKey}_${active.message}`;
        if (key !== lastDispatchedKey) {
          lastDispatchedKey = key;
          onPromptChange(active);
        }
      };

      networkClient.onWelcome((payload) => {
        if (player) {
          player.id = payload.id;
          player.name = payload.name;
          player.applyAppearance(getDeterministicAppearance(payload.id));
          player.updateName(payload.name);
          player.rootMesh.position.set(payload.spawnPosition.x, payload.spawnPosition.y, payload.spawnPosition.z);
        }
        for (const remoteState of payload.players) {
          remotePlayerManager.spawnPlayer(remoteState);
        }
      });

      networkClient.onPlayerJoined((remoteState) => {
        remotePlayerManager.spawnPlayer(remoteState);
      });

      networkClient.onPlayerLeft((id) => {
        remotePlayerManager.removePlayer(id);
      });

      networkClient.onPlayerUpdates((updates) => {
        remotePlayerManager.handleBatchUpdates(updates);
      });

      networkClient.onStatsChange((stats) => {
        if (!isDisposed && onNetworkStatsUpdate) {
          onNetworkStatsUpdate(stats);
        }
      });

      networkClient.onHandshakePrompt((payload) => {
        pendingHandshakePrompt = payload;
        if (pendingPromptTimeout) clearTimeout(pendingPromptTimeout);
        pendingPromptTimeout = setTimeout(() => {
          if (pendingHandshakePrompt?.fromId === payload.fromId) {
            pendingHandshakePrompt = null;
            handshakePrompt = null;
            dispatchCombinedPrompt();
          }
        }, 8000);
      });

      networkClient.onHandshakeStart((payload) => {
        if (pendingHandshakePrompt?.fromId === payload.player1Id || pendingHandshakePrompt?.fromId === payload.player2Id) {
          pendingHandshakePrompt = null;
          if (pendingPromptTimeout) clearTimeout(pendingPromptTimeout);
        }
        handshakePrompt = null;
        dispatchCombinedPrompt();

        const isLocalP1 = player && player.id === payload.player1Id;
        const isLocalP2 = player && player.id === payload.player2Id;

        if (isLocalP1 || isLocalP2) {
          const partnerId = isLocalP1 ? payload.player2Id : payload.player1Id;
          const partner = remotePlayerManager.getPlayers().get(partnerId);
          if (player && partner) {
            // Both local player and remote partner continuously face each other
            player.playHandshake(partner.rootMesh, payload.durationMs);
            player.nametag.setText(`🤝 ${player.name}`, '#22c55e', true);

            partner.setHandshakePartner(player.rootMesh, payload.durationMs);
            partner.nametag.setText(`🤝 ${partner.name}`, '#22c55e', false);

            setTimeout(() => {
              if (player) {
                player.nametag.setText(player.name, player.appearance.accentColorHex, true);
              }
              if (partner) {
                partner.nametag.setText(partner.name, partner.appearance.accentColorHex, false);
              }
            }, payload.durationMs);
          }
        } else {
          // Both are remote players observed by this client
          const p1 = remotePlayerManager.getPlayers().get(payload.player1Id);
          const p2 = remotePlayerManager.getPlayers().get(payload.player2Id);
          if (p1 && p2) {
            p1.setHandshakePartner(p2.rootMesh, payload.durationMs);
            p2.setHandshakePartner(p1.rootMesh, payload.durationMs);
            p1.nametag.setText(`🤝 ${p1.name}`, '#22c55e', false);
            p2.nametag.setText(`🤝 ${p2.name}`, '#22c55e', false);

            setTimeout(() => {
              p1.nametag.setText(p1.name, p1.appearance.accentColorHex, false);
              p2.nametag.setText(p2.name, p2.appearance.accentColorHex, false);
            }, payload.durationMs);
          }
        }
      });

      networkClient.onHandshakeComplete((payload) => {
        const isLocalP1 = player && player.id === payload.player1Id;
        const isLocalP2 = player && player.id === payload.player2Id;
        if (isLocalP1 || isLocalP2) {
          if (player) {
            player.addCredits(payload.rewardCredits);
            onPlayerStatsUpdate({
              credits: player.credits,
              inventory: [...player.inventory],
            });
            const partnerId = isLocalP1 ? payload.player2Id : payload.player1Id;
            const partner = remotePlayerManager.getPlayers().get(partnerId);
            const partnerName = partner ? partner.name : 'Player';
            if (onSocialNotification) {
              onSocialNotification(`🤝 Handshake with ${partnerName}! +${payload.rewardCredits} Credits`);
            }
          }
        }
      });

      player.controller.onHandshakePressed = () => {
        if (pendingHandshakePrompt) {
          const reqId = pendingHandshakePrompt.fromId;
          pendingHandshakePrompt = null;
          if (pendingPromptTimeout) clearTimeout(pendingPromptTimeout);
          handshakePrompt = null;
          dispatchCombinedPrompt();
          networkClient.sendHandshakeAccept(reqId);
        } else if (player) {
          const nearest = remotePlayerManager.findNearestPlayer(player.rootMesh.position, 2.5);
          if (nearest) {
            networkClient.sendHandshakeRequest(nearest.id);
            handshakePrompt = {
              visible: true,
              message: `🤝 Sent handshake request to ${nearest.name}...`,
              actionKey: 'WAIT',
              targetName: nearest.name,
            };
            dispatchCombinedPrompt();
            setTimeout(() => {
              if (handshakePrompt?.actionKey === 'WAIT') {
                handshakePrompt = null;
                dispatchCombinedPrompt();
              }
            }, 3000);
          }
        }
      };

      networkClient.connect();

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
        shopPrompt = prompt;
        dispatchCombinedPrompt();
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
          setTimeOfDay: (time: TimeOfDay) => {
            if (!worldManager) return;
            worldManager.setTimeOfDay(time);
            onTimeOfDayChange(time);
          },
          closeShop: () => {
            if (interactionManager) interactionManager.closeShop();
          },
          setMobileJoystick: (forward: number, right: number, isSprinting: boolean) => {
            if (player) {
              player.controller.setVirtualJoystick(forward, right, isSprinting);
            }
          },
          rotateCamera: (deltaYaw: number, deltaPitch: number) => {
            if (player) {
              player.camera.rotate(deltaYaw, deltaPitch);
            }
          },
          zoomCamera: (delta: number) => {
            if (player) {
              player.camera.zoom(delta);
            }
          },
          setCameraDistance: (dist: number) => {
            if (player) {
              player.camera.setDistance(dist);
            }
          },
          getCameraDistance: () => {
            return player ? player.camera.getRadius() : 9.0;
          },
          setCameraSensitivity: (multiplier: number) => {
            if (player) {
              player.camera.setSensitivityMultiplier(multiplier);
            }
          },
          triggerJump: () => {
            if (player) {
              player.controller.triggerJump();
            }
          },
          triggerInteract: () => {
            if (player) {
              player.controller.triggerInteract();
            }
          },
          triggerHandshake: () => {
            if (player) {
              player.controller.triggerHandshake();
            }
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

          // Phase 2: Send throttled movement state to server (20 Hz)
          const vel = player.controller.getVelocity();
          networkClient.sendPlayerUpdate(
            player.rootMesh.position,
            player.rootMesh.rotation.y,
            player.animation.getState(),
            vel ? { x: vel.x, y: vel.y, z: vel.z } : undefined
          );
        }

        // Phase 2: Smoothly interpolate all remote players
        remotePlayerManager.update(deltaTime);

        // Update proximity interaction triggers
        if (interactionManager) {
          interactionManager.update();
        }

        // Check proximity for handshake with remote players
        if (player && player.animation.getState() !== 'handshake') {
          if (pendingHandshakePrompt) {
            handshakePrompt = {
              visible: true,
              message: `🤝 ${pendingHandshakePrompt.fromName} wants to handshake! Press [H] to Accept`,
              actionKey: 'H',
              targetName: pendingHandshakePrompt.fromName,
            };
          } else {
            const nearest = remotePlayerManager.findNearestPlayer(player.rootMesh.position, 2.5);
            if (nearest && nearest.animation.getState() !== 'handshake') {
              if (!handshakePrompt || handshakePrompt.actionKey !== 'WAIT') {
                handshakePrompt = {
                  visible: true,
                  message: `🤝 Press [H] to Handshake with ${nearest.name}`,
                  actionKey: 'H',
                  targetName: nearest.name,
                };
              }
            } else if (handshakePrompt && handshakePrompt.actionKey !== 'WAIT') {
              handshakePrompt = null;
            }
          }
          dispatchCombinedPrompt();
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

      // Handle window resizing and mobile address-bar adjustments for horizontal & vertical
      const handleResize = () => {
        if (engine && !isDisposed) {
          engine.resize();
        }
      };

      const handleOrientationOrResize = () => {
        handleResize();
        // Mobile browsers defer viewport dimension updates during orientation rotation
        setTimeout(handleResize, 100);
        setTimeout(handleResize, 300);
      };

      window.addEventListener('resize', handleOrientationOrResize);
      window.addEventListener('orientationchange', handleOrientationOrResize);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.addEventListener('change', handleOrientationOrResize);
      }
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleOrientationOrResize);
      }

      // Cleanup
      return () => {
        isDisposed = true;
        if (canvasRefCallback) canvasRefCallback(null);
        window.removeEventListener('resize', handleOrientationOrResize);
        window.removeEventListener('orientationchange', handleOrientationOrResize);
        if (typeof screen !== 'undefined' && screen.orientation) {
          screen.orientation.removeEventListener('change', handleOrientationOrResize);
        }
        if (typeof window !== 'undefined' && window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleOrientationOrResize);
        }
        unsubPrompt();
        unsubShop();

        if (pendingPromptTimeout) {
          clearTimeout(pendingPromptTimeout);
          pendingPromptTimeout = null;
        }

        networkClient.disconnect();
        remotePlayerManager.dispose();

        if (typeof window !== 'undefined') {
          delete (window as unknown as Record<string, unknown>).__scene;
          delete (window as unknown as Record<string, unknown>).__player;
          delete (window as unknown as Record<string, unknown>).__remotePlayerManager;
          delete (window as unknown as Record<string, unknown>).__networkClient;
        }

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
