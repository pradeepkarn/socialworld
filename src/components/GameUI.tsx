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

export const GameUI: React.FC = () => {
  const [prompt, setPrompt] = useState<IInteractionPrompt>({
    visible: false,
    message: '',
    actionKey: 'E',
  });
  const [activeShop, setActiveShop] = useState<IShop | null>(null);
  const [credits, setCredits] = useState<number>(250);
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [playerPos, setPlayerPos] = useState<IVector3>({ x: 0, y: 1, z: 5 });
  const [playerRotY, setPlayerRotY] = useState<number>(0);

  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);

  const handleCanvasRef = useCallback((handle: GameCanvasHandle | null) => {
    canvasHandleRef.current = handle;
  }, []);

  const handleToggleTime = () => {
    if (canvasHandleRef.current) {
      const nextTime = canvasHandleRef.current.toggleTimeOfDay();
      setTimeOfDay(nextTime);
    }
  };

  const handlePurchase = (productId: string) => {
    if (canvasHandleRef.current && activeShop) {
      return canvasHandleRef.current.purchaseItem(activeShop.id, productId);
    }
    return { success: false, message: 'Shop unavailable' };
  };

  const handleCloseShop = () => {
    if (canvasHandleRef.current) {
      canvasHandleRef.current.closeShop();
    }
    setActiveShop(null);
  };

  const handleMinimapUpdate = useCallback((data: { position: IVector3; rotationY: number }) => {
    setPlayerPos(data.position);
    setPlayerRotY(data.rotationY);
  }, []);

  const handleStatsUpdate = useCallback((stats: { credits: number; inventory: IInventoryItem[] }) => {
    setCredits(stats.credits);
    setInventory(stats.inventory);
  }, []);

  return (
    <div style={styles.container}>
      {/* 3D Babylon Rendering Canvas */}
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

      {/* Top Navigation / Status Bar */}
      <header style={styles.topBar}>
        <div style={styles.brandRow}>
          <div style={styles.brandIcon}>
            <Sparkles size={18} color="#00e5ff" />
          </div>
          <div>
            <h1 style={styles.brandTitle}>NEOVERSE</h1>
            <span style={styles.brandSubtitle}>Virtual 3D City Prototype</span>
          </div>
        </div>

        <div style={styles.topRight}>
          {/* Day / Sunset / Night Switcher */}
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

          {/* Player Credits Badge */}
          <div id="credits-hud" style={styles.creditBadge}>
            <Wallet size={16} color="#34d399" />
            <span style={styles.creditAmount}>${credits.toLocaleString()}</span>
          </div>

          {/* Coordinates HUD */}
          <div id="coords-hud" style={styles.coordsBadge}>
            <Navigation size={14} color="#00e5ff" />
            <span>X:{playerPos.x.toFixed(0)} Z:{playerPos.z.toFixed(0)}</span>
          </div>
        </div>
      </header>

      {/* Proximity Interaction Prompt ("Press [E] to browse CyberMart") */}
      <InteractionPrompt prompt={prompt} />

      {/* Interactive Shop Modal */}
      <ShopUI
        shop={activeShop}
        credits={credits}
        inventory={inventory}
        onPurchase={handlePurchase}
        onClose={handleCloseShop}
      />

      {/* Bottom HUD: Controls Help (Left) & Minimap (Right) */}
      <div style={styles.bottomHud}>
        <ControlsHelp />
        <Minimap playerPosition={playerPos} playerRotationY={playerRotY} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#05070d',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  canvasWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
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
  brandTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: '2px',
  },
  brandSubtitle: {
    fontSize: '11px',
    color: '#94a3b8',
    letterSpacing: '0.4px',
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    pointerEvents: 'auto',
  },
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
  timeText: {
    letterSpacing: '0.8px',
  },
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
  creditAmount: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: '15px',
  },
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
  bottomHud: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'auto',
  },
};
