'use client';

import React, { useState, useRef, useCallback } from 'react';
import { GameCanvas, GameCanvasHandle } from './GameCanvas';
import { InteractionPrompt } from './InteractionPrompt';
import { ShopUI } from './ShopUI';
import { Minimap } from './Minimap';
import { ControlsHelp } from './ControlsHelp';
import {
  IInteractionPrompt,
  IShop,
  IInventoryItem,
  IVector3,
  TimeOfDay,
} from '@/types/game';
import { Sun, Sunset, Moon, Wallet, Sparkles, Navigation } from 'lucide-react';

/**
 * =========================================================================
 * GameUI - Master User Interface Orchestrator
 * =========================================================================
 * WHAT THIS FILE DOES:
 * - Serves as the top-level React component and master HUD container for the entire game.
 * - Bridges the declarative React UI ecosystem with the imperative, high-performance
 *   Babylon.js 3D WebGL engine running inside `GameCanvas`.
 * - Manages all reactive HUD states:
 *   - Player currency / wallet balance (`credits`).
 *   - Purchased inventory items (`inventory`).
 *   - Real-time player coordinates and compass orientation (`playerPos`, `playerRotY`).
 *   - Current lighting atmosphere (`timeOfDay`: 'day' | 'sunset' | 'night').
 *   - Proximity action prompt visibility (`prompt`).
 *   - Currently active shopping window modal (`activeShop`).
 *
 * KEY ARCHITECTURAL & GAME DEV PATTERNS:
 * 1. The React-to-Engine Bridge (Imperative Handle via Ref):
 *    - Babylon.js runs an endless 60 FPS animation loop. React, on the other hand,
 *      renders on state changes.
 *    - To communicate from React into the 3D scene (e.g., toggling the sun or purchasing an item),
 *      `GameCanvas` exposes an imperative handle (`GameCanvasHandle`) accessed via `canvasHandleRef`.
 *    - This gives React direct, safe access to scene methods without causing full canvas re-mounts.
 * 2. `useCallback` for High-Frequency Render Loop Updates:
 *    - Player coordinates update every frame as the avatar runs around the city.
 *    - Wrapping handlers like `handleMinimapUpdate` in `useCallback` ensures function references
 *      remain stable and do not cause unnecessary component re-renders.
 * 3. Layered Z-Index UI Architecture:
 *    - Layer 1 (z-index 1): Babylon.js 3D WebGL Canvas (`canvasWrapper`).
 *    - Layer 2 (z-index 20): Top status bar & bottom HUD (Minimap, Controls Help).
 *    - Layer 3 (z-index 40): Floating Proximity Interaction Prompt.
 *    - Layer 4 (z-index 50): Modal overlays (`ShopUI` store window).
 * 4. Transparent Pointer Events:
 *    - The UI container spans 100vw x 100vh with `pointerEvents: 'none'`.
 *    - Mouse clicks fall straight through empty screen areas into the 3D canvas so the player
 *      can orbit the camera and look around freely.
 *    - Interactive buttons (like the Day/Night toggle or Shop buy buttons) explicitly set
 *      `pointerEvents: 'auto'` so they remain fully clickable.
 */
export const GameUI: React.FC = () => {
  // -----------------------------------------------------------------------
  // Reactive Game State
  // -----------------------------------------------------------------------

  // Controls the "[E] Browse Shop" floating proximity pill
  const [prompt, setPrompt] = useState<IInteractionPrompt>({
    visible: false,
    message: '',
    actionKey: 'E',
  });

  // Currently open shop object (or null if the player is just exploring the city)
  const [activeShop, setActiveShop] = useState<IShop | null>(null);

  // Player currency wallet (starting balance: 250 credits)
  const [credits, setCredits] = useState<number>(250);

  // Purchased items collected by the player
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);

  // Active lighting preset: 'day' (bright sun), 'sunset' (golden neon), or 'night' (cyberpunk dark)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  // Real-time player 3D coordinates for HUD display and minimap tracking
  const [playerPos, setPlayerPos] = useState<IVector3>({ x: 0, y: 1, z: 5 });

  // Player rotation angle (radians around Y axis) for the minimap player directional arrow
  const [playerRotY, setPlayerRotY] = useState<number>(0);

  // Reference to the imperative API exposed by GameCanvas
  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);

  // -----------------------------------------------------------------------
  // Handlers & Callbacks
  // -----------------------------------------------------------------------

  /**
   * Captures the imperative canvas handle once the 3D scene mounts.
   */
  const handleCanvasRef = useCallback((handle: GameCanvasHandle | null) => {
    canvasHandleRef.current = handle;
  }, []);

  /**
   * Toggles to the next celestial lighting mode: day -> sunset -> night -> day.
   */
  const handleToggleTime = () => {
    if (canvasHandleRef.current) {
      const nextTime = canvasHandleRef.current.toggleTimeOfDay();
      setTimeOfDay(nextTime);
    }
  };

  /**
   * Dispatches a purchase request to the 3D game engine.
   * Deducts credits, adds the product to player inventory, and plays audio/visual feedback.
   */
  const handlePurchase = (productId: string) => {
    if (canvasHandleRef.current && activeShop) {
      return canvasHandleRef.current.purchaseItem(activeShop.id, productId);
    }
    return { success: false, message: 'Shop unavailable' };
  };

  /**
   * Closes the active shop modal and returns camera focus to standard exploration mode.
   */
  const handleCloseShop = () => {
    if (canvasHandleRef.current) {
      canvasHandleRef.current.closeShop();
    }
    setActiveShop(null);
  };

  /**
   * High-frequency callback fired from the 3D render loop whenever the player moves.
   * Updates the coordinates badge and minimap radar blip.
   */
  const handleMinimapUpdate = useCallback((data: { position: IVector3; rotationY: number }) => {
    setPlayerPos(data.position);
    setPlayerRotY(data.rotationY);
  }, []);

  /**
   * Callback fired whenever the player's wallet balance or inventory changes.
   */
  const handleStatsUpdate = useCallback((stats: { credits: number; inventory: IInventoryItem[] }) => {
    setCredits(stats.credits);
    setInventory(stats.inventory);
  }, []);

  // -----------------------------------------------------------------------
  // JSX Render
  // -----------------------------------------------------------------------
  return (
    <div style={styles.container}>
      {/* 1. Base Layer: 3D Babylon Rendering Canvas */}
      <div style={styles.canvasWrapper}>
        <GameCanvas
          onPromptChange={setPrompt}
          onOpenShop={setActiveShop}
          onPlayerStatsUpdate={handleStatsUpdate}
          onMinimapUpdate={handleMinimapUpdate}
          onTimeOfDayChange={setTimeOfDay}
          canvasRefCallback={handleCanvasRef}
        />
      </div>

      {/* 2. Top Navigation & Status Bar */}
      <header style={styles.topBar}>
        {/* Game Title & Branding Badge */}
        <div style={styles.brandRow}>
          <div style={styles.brandIcon}>
            <Sparkles size={18} color="#00e5ff" />
          </div>
          <div>
            <h1 style={styles.brandTitle}>NEOVERSE</h1>
            <span style={styles.brandSubtitle}>Virtual 3D City Prototype</span>
          </div>
        </div>

        {/* Top-Right HUD Controls */}
        <div style={styles.topRight}>
          {/* Day / Sunset / Night Atmosphere Switcher Button */}
          <button
            id="time-toggle-btn"
            onClick={handleToggleTime}
            style={styles.timeToggleBtn}
            title={`Current: ${timeOfDay.toUpperCase()}. Click to cycle.`}
          >
            {timeOfDay === 'day' && <Sun size={16} color="#fbbf24" />}
            {timeOfDay === 'sunset' && <Sunset size={16} color="#f97316" />}
            {timeOfDay === 'night' && <Moon size={16} color="#38bdf8" />}
            <span style={styles.timeText}>{timeOfDay.toUpperCase()}</span>
          </button>

          {/* Player Credits Wallet Badge */}
          <div id="credits-hud" style={styles.creditBadge}>
            <Wallet size={16} color="#34d399" />
            <span style={styles.creditAmount}>${credits.toLocaleString()}</span>
          </div>

          {/* 3D World Coordinates HUD (X / Z street grid location) */}
          <div id="coords-hud" style={styles.coordsBadge}>
            <Navigation size={14} color="#00e5ff" />
            <span>X:{playerPos.x.toFixed(0)} Z:{playerPos.z.toFixed(0)}</span>
          </div>
        </div>
      </header>

      {/* 3. Proximity Interaction Prompt ("Press [E] to browse CyberMart") */}
      <InteractionPrompt prompt={prompt} />

      {/* 4. Fullscreen / Centered Interactive Shop Modal */}
      <ShopUI
        shop={activeShop}
        credits={credits}
        inventory={inventory}
        onPurchase={handlePurchase}
        onClose={handleCloseShop}
      />

      {/* 5. Bottom HUD: Controls Cheat-Sheet (Left) & Minimap Radar (Right) */}
      <div style={styles.bottomHud}>
        <ControlsHelp />
        <Minimap playerPosition={playerPos} playerRotationY={playerRotY} />
      </div>
    </div>
  );
};

/**
 * =========================================================================
 * Component Inline Styles
 * =========================================================================
 * Clean, glassmorphism layout tokens structured for full-screen web games.
 */
const styles: Record<string, React.CSSProperties> = {
  // Full-viewport master container
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#05070d',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  // 3D Canvas wrapper filling 100% of viewport at z-index 1
  canvasWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  // Top status bar with pointer-events: none (children enable pointer-events: auto)
  topBar: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    zIndex: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  // Cyberpunk logo card
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(10, 15, 26, 0.75)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    padding: '8px 18px',
    borderRadius: '14px',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  // Glowing icon container
  brandIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(0, 229, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0, 229, 255, 0.3)',
  },
  // Brand title typography
  brandTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: '2px',
  },
  // Brand subtitle
  brandSubtitle: {
    fontSize: '11px',
    color: '#94a3b8',
    letterSpacing: '0.4px',
  },
  // Top right HUD badges wrapper
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    pointerEvents: 'auto',
  },
  // Day / Night cycle button
  timeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 15, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '8px 14px',
    color: '#f1f5f9',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  // Time label
  timeText: {
    letterSpacing: '0.8px',
  },
  // Credits badge
  creditBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 15, 26, 0.8)',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    borderRadius: '12px',
    padding: '8px 14px',
    backdropFilter: 'blur(8px)',
  },
  // Credit amount text
  creditAmount: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: '15px',
  },
  // Coordinates badge
  coordsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(10, 15, 26, 0.8)',
    border: '1px solid rgba(0, 229, 255, 0.2)',
    borderRadius: '12px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    backdropFilter: 'blur(8px)',
  },
  // Bottom HUD wrapper positioning ControlsHelp on the left and Minimap on the right
  bottomHud: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none', // Allows empty space between help and minimap to be clicked through
  },
};

