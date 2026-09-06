'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameCanvas, GameCanvasHandle } from './GameCanvas';
import { InteractionPrompt } from './InteractionPrompt';
import { ShopUI } from './ShopUI';
import { Minimap } from './Minimap';
import { ControlsHelp } from './ControlsHelp';
import { MobileControls, JoystickHand } from './MobileControls';
import {
  IInteractionPrompt,
  IShop,
  IInventoryItem,
  IVector3,
  TimeOfDay,
} from '@/types/game';
import { INetworkStats } from '@/game/multiplayer/NetworkTypes';
import {
  Sun,
  Sunset,
  Moon,
  Wallet,
  Sparkles,
  Navigation,
  MapPin,
  Maximize2,
  Minimize2,
  Settings,
  X,
  SlidersHorizontal,
  RotateCcw,
  Smartphone,
  Monitor,
} from 'lucide-react';

export type OrientationPref = 'auto' | 'landscape' | 'portrait';

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

  // Phase 2: Multiplayer Network Status & Latency
  const [netStats, setNetStats] = useState<INetworkStats>({
    status: 'CONNECTING',
    playerCount: 1,
    ping: 0,
  });

  // Social notification banner (e.g. "🤝 Handshake with Runner_1234! +10 Credits")
  const [socialNotification, setSocialNotification] = useState<string | null>(null);
  const socialToastTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSocialNotification = useCallback((message: string) => {
    setSocialNotification(message);
    if (socialToastTimeout.current) clearTimeout(socialToastTimeout.current);
    socialToastTimeout.current = setTimeout(() => {
      setSocialNotification(null);
    }, 4000);
  }, []);

  // Reference to the imperative API exposed by GameCanvas
  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);
  const [canvasHandle, setCanvasHandle] = useState<GameCanvasHandle | null>(null);

  // Mobile & Touch Responsiveness
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [isHudFaded, setIsHudFaded] = useState<boolean>(false);
  const [showMobileMap, setShowMobileMap] = useState<boolean>(false);

  // Mobile Polish & Configuration State
  const [joystickHand, setJoystickHand] = useState<JoystickHand>('left');
  const [cameraSens, setCameraSens] = useState<number>(1.0);
  const [showDistanceSlider, setShowDistanceSlider] = useState<boolean>(false);
  const [showMobileSettings, setShowMobileSettings] = useState<boolean>(false);
  const [isImmersive, setIsImmersive] = useState<boolean>(false);
  const [orientationPref, setOrientationPref] = useState<OrientationPref>('auto');
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  // Restore saved mobile preferences from localStorage
  useEffect(() => {
    try {
      const savedHand = localStorage.getItem('neoverse_joystick_pos') as JoystickHand | null;
      if (savedHand === 'left' || savedHand === 'right') {
        setJoystickHand(savedHand);
      }
      const savedSens = localStorage.getItem('neoverse_camera_sens');
      if (savedSens) {
        const parsed = parseFloat(savedSens);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.5) {
          setCameraSens(parsed);
        }
      }
      const savedDistSlider = localStorage.getItem('neoverse_dist_slider');
      if (savedDistSlider !== null) {
        setShowDistanceSlider(savedDistSlider === 'true');
      }
      const savedOrient = localStorage.getItem('neoverse_orientation_pref') as OrientationPref | null;
      if (savedOrient === 'auto' || savedOrient === 'landscape' || savedOrient === 'portrait') {
        setOrientationPref(savedOrient);
      }
    } catch {
      // localStorage may fail in restricted browser contexts
    }
  }, []);

  // Track browser fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsImmersive(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    const checkTouchAndDimensions = () => {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const forceMobile = urlParams?.get('touch') === '1' || urlParams?.get('mobile') === '1';

      if (typeof window === 'undefined') return;

      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isFine = window.matchMedia('(pointer: fine)').matches;
      const hasTouchCapability = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

      // Pure touch device: finger/coarse primary pointer without fine mouse pointer
      // Desktop: fine mouse pointer -> keeps standard keyboard + mouse controls
      const isMobileTouch = forceMobile || (hasTouchCapability && isCoarse && !isFine) || (isCoarse && !isFine);
      const isLand = window.innerWidth > window.innerHeight;

      setIsTouchDevice(isMobileTouch);
      setIsLandscape(isLand);
      // On mobile devices, even in landscape (e.g. 844x390), treat as mobile view
      setIsMobileView(isMobileTouch || window.innerWidth < 768 || window.innerHeight < 500);
    };

    checkTouchAndDimensions();
    window.addEventListener('resize', checkTouchAndDimensions);
    window.addEventListener('orientationchange', checkTouchAndDimensions);
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', checkTouchAndDimensions);
    }
    return () => {
      window.removeEventListener('resize', checkTouchAndDimensions);
      window.removeEventListener('orientationchange', checkTouchAndDimensions);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', checkTouchAndDimensions);
      }
    };
  }, []);

  const handleJoystickHandChange = (hand: JoystickHand) => {
    setJoystickHand(hand);
    try {
      localStorage.setItem('neoverse_joystick_pos', hand);
    } catch {}
  };

  const handleSensitivityChange = (val: number) => {
    setCameraSens(val);
    if (canvasHandleRef.current) {
      canvasHandleRef.current.setCameraSensitivity(val);
    }
    try {
      localStorage.setItem('neoverse_camera_sens', val.toString());
    } catch {}
  };

  const handleDistanceSliderToggle = (val: boolean) => {
    setShowDistanceSlider(val);
    try {
      localStorage.setItem('neoverse_dist_slider', val.toString());
    } catch {}
  };

  const [showIosFullscreenHint, setShowIosFullscreenHint] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = useCallback(async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (err) {
      console.warn('PWA install error:', err);
    }
  }, [installPrompt]);

  const handleOrientationChange = useCallback(async (mode: OrientationPref) => {
    setOrientationPref(mode);
    try {
      localStorage.setItem('neoverse_orientation_pref', mode);
    } catch {}

    try {
      if (typeof screen !== 'undefined' && screen.orientation) {
        if (mode === 'auto') {
          if (screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        } else {
          // On mobile browsers, screen.orientation.lock requires fullscreen mode
          const isFs = Boolean(
            document.fullscreenElement ||
              (document as any).webkitFullscreenElement
          );
          if (!isFs) {
            const el = document.getElementById('neoverse-master-root') || document.documentElement;
            const requestFn = el.requestFullscreen || (el as any).webkitRequestFullscreen;
            if (requestFn) {
              try {
                await requestFn.call(el, { navigationUI: 'hide' });
              } catch {
                await requestFn.call(el);
              }
              setIsImmersive(true);
            }
          }

          if ((screen.orientation as any).lock) {
            await (screen.orientation as any).lock(mode);
          }
        }
      }
    } catch (err) {
      console.warn(`Screen orientation lock to ${mode} not permitted:`, err);
    }
  }, []);

  const toggleImmersive = useCallback(async () => {
    try {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      const isIos =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const isStandalone =
        typeof window !== 'undefined' &&
        (Boolean((window.navigator as any).standalone) ||
          window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches);

      if (!isFs) {
        const el = document.getElementById('neoverse-master-root') || document.documentElement;
        const requestFn =
          el.requestFullscreen ||
          (el as any).webkitRequestFullscreen ||
          (el as any).mozRequestFullScreen ||
          (el as any).msRequestFullscreen;

        if (requestFn) {
          try {
            // Explicitly request browser to hide navigation and address bars
            await requestFn.call(el, { navigationUI: 'hide' });
          } catch {
            // Fallback if browser does not support options object
            await requestFn.call(el);
          }
          setIsImmersive(true);
        } else if (isIos && !isStandalone) {
          // iOS Safari does not support Element.requestFullscreen() for HTML elements
          setShowIosFullscreenHint(true);
        }

        // Apply orientation preference if explicitly chosen; otherwise allow free auto-rotation
        if (typeof screen !== 'undefined' && screen.orientation) {
          try {
            if (orientationPref === 'landscape') {
              if ((screen.orientation as any).lock) {
                await (screen.orientation as any).lock('landscape');
              }
            } else if (orientationPref === 'portrait') {
              if ((screen.orientation as any).lock) {
                await (screen.orientation as any).lock('portrait');
              }
            } else {
              // 'auto': Keep unlocked so user can freely rotate between horizontal and vertical
              if (screen.orientation.unlock) {
                screen.orientation.unlock();
              }
            }
          } catch {}
        }
      } else {
        const exitFn =
          document.exitFullscreen ||
          (document as any).webkitExitFullscreen ||
          (document as any).mozCancelFullScreen ||
          (document as any).msExitFullscreen;

        if (exitFn) {
          await exitFn.call(document);
          setIsImmersive(false);
          // Unlock orientation when exiting fullscreen
          if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
            try {
              screen.orientation.unlock();
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed or not permitted:', err);
    }
  }, [orientationPref]);

  // -----------------------------------------------------------------------
  // Handlers & Callbacks
  // -----------------------------------------------------------------------

  /**
   * Captures the imperative canvas handle once the 3D scene mounts.
   */
  const handleCanvasRef = useCallback((handle: GameCanvasHandle | null) => {
    canvasHandleRef.current = handle;
    setCanvasHandle(handle);
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

  const canHandshake = prompt.visible && prompt.actionKey === 'H';
  const canInteract = prompt.visible && prompt.actionKey === 'E';
  const isHudDimmed = isTouchDevice && isHudFaded && !prompt.visible && !activeShop;

  // -----------------------------------------------------------------------
  // JSX Render
  // -----------------------------------------------------------------------
  return (
    <div id="neoverse-master-root" style={styles.container}>
      {/* 1. Base Layer: 3D Babylon Rendering Canvas */}
      <div style={styles.canvasWrapper}>
        <GameCanvas
          onPromptChange={setPrompt}
          onOpenShop={setActiveShop}
          onPlayerStatsUpdate={handleStatsUpdate}
          onMinimapUpdate={handleMinimapUpdate}
          onTimeOfDayChange={setTimeOfDay}
          onNetworkStatsUpdate={setNetStats}
          onSocialNotification={handleSocialNotification}
          canvasRefCallback={handleCanvasRef}
        />
      </div>

      {/* 2. Top Navigation & Status Bar */}
      <header
        style={{
          ...styles.topBar,
          opacity: isHudDimmed ? 0.15 : 1,
          pointerEvents: isHudDimmed ? 'none' : 'auto',
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* Game Title & Branding Badge */}
        <div
          style={{
            ...styles.brandRow,
            padding: isMobileView ? '4px 8px' : '8px 18px',
            gap: isMobileView ? '6px' : '12px',
          }}
        >
          <div
            style={{
              ...styles.brandIcon,
              width: isMobileView ? '22px' : '32px',
              height: isMobileView ? '22px' : '32px',
            }}
          >
            <Sparkles size={isMobileView ? 12 : 18} color="#00e5ff" />
          </div>
          <div>
            <h1
              style={{
                ...styles.brandTitle,
                fontSize: isMobileView ? '12px' : '16px',
                letterSpacing: isMobileView ? '1px' : '2px',
              }}
            >
              NEOVERSE
            </h1>
            {!isMobileView && <span style={styles.brandSubtitle}>Virtual 3D City Prototype</span>}
          </div>
        </div>

        {/* Top-Right HUD Controls */}
        <div
          style={{
            ...styles.topRight,
            gap: isMobileView ? '5px' : '10px',
          }}
        >
          {/* Multiplayer Network Status Badge (Phase 2) */}
          <div
            id="network-status-hud"
            title={`Status: ${netStats.status}`}
            style={{
              ...styles.networkBadge,
              padding: isMobileView ? '5px 6px' : '8px 14px',
              fontSize: isMobileView ? '11px' : '12px',
            }}
          >
            <span
              style={{
                ...styles.statusDot,
                backgroundColor:
                  netStats.status === 'ONLINE'
                    ? '#22c55e'
                    : netStats.status === 'CONNECTING'
                    ? '#eab308'
                    : '#ef4444',
                boxShadow:
                  netStats.status === 'ONLINE'
                    ? '0 0 8px #22c55e'
                    : netStats.status === 'CONNECTING'
                    ? '0 0 8px #eab308'
                    : '0 0 8px #ef4444',
              }}
            />
            {!isMobileView && <span style={styles.statusText}>{netStats.status}</span>}
            {netStats.status === 'ONLINE' && !isMobileView && (
              <>
                <span style={styles.statusDivider}>•</span>
                <span style={styles.statusDetail}>
                  {netStats.playerCount} {netStats.playerCount === 1 ? 'Player' : 'Players'}
                </span>
                <span style={styles.statusDivider}>•</span>
                <span style={styles.statusDetail}>{netStats.ping}ms</span>
              </>
            )}
          </div>

          {/* Day / Sunset / Night Atmosphere Switcher Button (Desktop only; on mobile it is in Settings) */}
          {!isMobileView && (
            <button
              id="time-toggle-btn"
              onClick={handleToggleTime}
              style={{
                ...styles.timeToggleBtn,
                padding: '8px 14px',
              }}
              title={`Current: ${timeOfDay.toUpperCase()}. Click to cycle.`}
            >
              {timeOfDay === 'day' && <Sun size={16} color="#fbbf24" />}
              {timeOfDay === 'sunset' && <Sunset size={16} color="#f97316" />}
              {timeOfDay === 'night' && <Moon size={16} color="#38bdf8" />}
              <span style={styles.timeText}>{timeOfDay.toUpperCase()}</span>
            </button>
          )}

          {/* Player Credits Wallet Badge */}
          <div
            id="credits-hud"
            style={{
              ...styles.creditBadge,
              padding: isMobileView ? '5px 8px' : '8px 14px',
              gap: isMobileView ? '5px' : '8px',
            }}
          >
            <Wallet size={isMobileView ? 13 : 16} color="#34d399" />
            <span
              style={{
                ...styles.creditAmount,
                fontSize: isMobileView ? '12px' : '15px',
              }}
            >
              ${credits.toLocaleString()}
            </span>
          </div>

          {/* 3D World Coordinates HUD (X / Z street grid location) */}
          {!isMobileView && (
            <div id="coords-hud" style={styles.coordsBadge}>
              <Navigation size={14} color="#00e5ff" />
              <span>
                X:{playerPos.x.toFixed(0)} Z:{playerPos.z.toFixed(0)}
              </span>
            </div>
          )}

          {/* Mobile Minimap Radar Toggle */}
          {isTouchDevice && (
            <button
              id="mobile-map-toggle-btn"
              onClick={() => setShowMobileMap((prev) => !prev)}
              style={{
                ...styles.iconBtn,
                borderColor: showMobileMap ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)',
                background: showMobileMap ? 'rgba(0, 229, 255, 0.2)' : 'rgba(10, 15, 26, 0.8)',
              }}
              title="Toggle Radar Map"
              aria-label="Toggle Radar Map"
            >
              <MapPin size={isMobileView ? 14 : 16} color="#00e5ff" />
            </button>
          )}

          {/* Quick Screen Orientation Switcher (Horizontal / Vertical) */}
          {isTouchDevice && (
            <button
              id="orientation-toggle-btn"
              onClick={() => {
                if (isLandscape) {
                  handleOrientationChange('portrait');
                } else {
                  handleOrientationChange('landscape');
                }
              }}
              style={{
                ...styles.iconBtn,
                borderColor: orientationPref !== 'auto' ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)',
                background: orientationPref !== 'auto' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(10, 15, 26, 0.8)',
              }}
              title={
                isLandscape
                  ? 'Switch to Vertical (Portrait)'
                  : 'Switch to Horizontal (Landscape)'
              }
              aria-label="Toggle Screen Orientation"
            >
              <RotateCcw size={isMobileView ? 14 : 16} color={orientationPref !== 'auto' ? '#00e5ff' : '#f1f5f9'} />
            </button>
          )}

          {/* Immersive / Fullscreen Toggle Button */}
          <button
            id="fullscreen-toggle-btn"
            onClick={toggleImmersive}
            style={{
              ...styles.iconBtn,
              borderColor: isImmersive ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)',
              background: isImmersive ? 'rgba(0, 229, 255, 0.2)' : 'rgba(10, 15, 26, 0.8)',
            }}
            title={isImmersive ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isImmersive ? (
              <Minimize2 size={isMobileView ? 14 : 16} color="#00e5ff" />
            ) : (
              <Maximize2 size={isMobileView ? 14 : 16} color="#f1f5f9" />
            )}
          </button>

          {/* Mobile Gameplay Settings Modal Toggle */}
          {isTouchDevice && (
            <button
              id="mobile-settings-btn"
              onClick={() => setShowMobileSettings((prev) => !prev)}
              style={{
                ...styles.iconBtn,
                borderColor: showMobileSettings ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)',
                background: showMobileSettings ? 'rgba(0, 229, 255, 0.2)' : 'rgba(10, 15, 26, 0.8)',
              }}
              title="Gameplay & Controls Settings"
              aria-label="Open Settings"
            >
              <Settings size={isMobileView ? 14 : 16} color={showMobileSettings ? '#00e5ff' : '#f1f5f9'} />
            </button>
          )}
        </div>
      </header>

      {/* Floating Minimap for Mobile (when toggled) */}
      {isTouchDevice && showMobileMap && (
        <div id="mobile-floating-minimap" style={styles.mobileFloatingMap}>
          <Minimap playerPosition={playerPos} playerRotationY={playerRotY} />
        </div>
      )}

      {/* 2b. Floating Social Notification Toast */}
      {socialNotification && (
        <div id="social-notification-toast" style={styles.socialToast}>
          <Sparkles size={18} color="#22c55e" />
          <span>{socialNotification}</span>
        </div>
      )}

      {/* 3. Proximity Interaction Prompt ("Press [E] to browse CyberMart" - desktop only) */}
      {!isTouchDevice && <InteractionPrompt prompt={prompt} />}

      {/* 4. Fullscreen / Centered Interactive Shop Modal */}
      <ShopUI
        shop={activeShop}
        credits={credits}
        inventory={inventory}
        onPurchase={handlePurchase}
        onClose={handleCloseShop}
      />

      {/* 5. Mobile Controls HUD Overlay (Virtual Joystick, Touch Look, Contextual Actions) */}
      {isTouchDevice && (
        <MobileControls
          canvasHandle={canvasHandle}
          canHandshake={canHandshake}
          canInteract={canInteract}
          joystickHand={joystickHand}
          sensitivityMultiplier={cameraSens}
          showDistanceSlider={showDistanceSlider}
          onActivePlayChange={setIsHudFaded}
          onOpenSettings={() => setShowMobileSettings(true)}
        />
      )}

      {/* 6. Desktop Bottom HUD: Controls Cheat-Sheet (Left) & Minimap Radar (Right) */}
      {!isTouchDevice && (
        <div style={styles.bottomHud}>
          <ControlsHelp />
          <Minimap playerPosition={playerPos} playerRotationY={playerRotY} />
        </div>
      )}

      {/* 7. Cyberpunk Mobile Gameplay Settings Modal */}
      {showMobileSettings && (
        <div
          id="mobile-settings-modal-backdrop"
          style={styles.modalBackdrop}
          onClick={() => setShowMobileSettings(false)}
        >
          <div
            id="mobile-settings-modal"
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <Settings size={18} color="#00e5ff" />
                <span>GAMEPLAY SETTINGS</span>
              </div>
              <button
                id="close-settings-btn"
                onClick={() => setShowMobileSettings(false)}
                style={styles.modalCloseBtn}
                aria-label="Close Settings"
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            {/* Body */}
            <div style={styles.modalBody}>
              {/* Setting 1: Joystick Hand Preference */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  JOYSTICK POSITION
                  <span style={styles.settingSubLabel}>Select which hand controls avatar movement</span>
                </div>
                <div style={styles.segmentedRow}>
                  <button
                    id="joystick-hand-left"
                    onClick={() => handleJoystickHandChange('left')}
                    style={{
                      ...styles.segmentedBtn,
                      ...(joystickHand === 'left' ? styles.segmentedBtnActive : {}),
                    }}
                  >
                    <span>🕹️ Left Hand</span>
                    <span style={styles.segmentedHint}>Move: Left / Look: Right</span>
                  </button>
                  <button
                    id="joystick-hand-right"
                    onClick={() => handleJoystickHandChange('right')}
                    style={{
                      ...styles.segmentedBtn,
                      ...(joystickHand === 'right' ? styles.segmentedBtnActive : {}),
                    }}
                  >
                    <span>🕹️ Right Hand</span>
                    <span style={styles.segmentedHint}>Move: Right / Look: Left</span>
                  </button>
                </div>
              </div>

              {/* Setting 2: Camera Look Sensitivity */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  LOOK SENSITIVITY ({cameraSens.toFixed(1)}x)
                  <span style={styles.settingSubLabel}>Adjust touch drag orbiting speed</span>
                </div>
                <div style={styles.chipsRow}>
                  {[
                    { label: '0.7x Slow', val: 0.7 },
                    { label: '1.0x Normal', val: 1.0 },
                    { label: '1.4x Fast', val: 1.4 },
                    { label: '1.8x Pro', val: 1.8 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => handleSensitivityChange(preset.val)}
                      style={{
                        ...styles.chipBtn,
                        ...(cameraSens === preset.val ? styles.chipBtnActive : {}),
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 3: Camera Distance Quick Presets */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  CAMERA DISTANCE PRESET
                  <span style={styles.settingSubLabel}>Adjust camera orbit distance from avatar</span>
                </div>
                <div style={styles.chipsRow}>
                  {[
                    { label: 'Close (5m)', dist: 5.0 },
                    { label: 'Default (9m)', dist: 9.0 },
                    { label: 'Wide (14m)', dist: 14.0 },
                  ].map((preset) => (
                    <button
                      key={preset.dist}
                      onClick={() => {
                        canvasHandleRef.current?.setCameraDistance(preset.dist);
                      }}
                      style={styles.chipBtn}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 4: Vertical Distance Slider on Screen */}
              <div style={styles.settingGroup}>
                <div style={styles.toggleRow}>
                  <div>
                    <div style={styles.settingLabel}>ON-SCREEN ZOOM SLIDER</div>
                    <div style={styles.settingSubLabel}>Show a touch slider along screen edge</div>
                  </div>
                  <button
                    id="dist-slider-toggle"
                    onClick={() => handleDistanceSliderToggle(!showDistanceSlider)}
                    style={{
                      ...styles.toggleSwitch,
                      backgroundColor: showDistanceSlider ? '#00e5ff' : 'rgba(255, 255, 255, 0.2)',
                    }}
                    aria-label="Toggle distance slider"
                  >
                    <div
                      style={{
                        ...styles.toggleThumb,
                        transform: showDistanceSlider ? 'translateX(20px)' : 'translateX(0px)',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Setting 5: Atmosphere / Time of Day */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  ATMOSPHERE & LIGHTING
                  <span style={styles.settingSubLabel}>Toggle day, sunset, or cyberpunk night</span>
                </div>
                <div style={styles.chipsRow}>
                  {[
                    { label: '☀️ Day', mode: 'day' as TimeOfDay },
                    { label: '🌅 Sunset', mode: 'sunset' as TimeOfDay },
                    { label: '🌙 Night', mode: 'night' as TimeOfDay },
                  ].map((preset) => (
                    <button
                      key={preset.mode}
                      onClick={() => {
                        if (canvasHandleRef.current) {
                          canvasHandleRef.current.setTimeOfDay(preset.mode);
                          setTimeOfDay(preset.mode);
                        }
                      }}
                      style={{
                        ...styles.chipBtn,
                        ...(timeOfDay === preset.mode ? styles.chipBtnActive : {}),
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 6: Screen Orientation (Both Horizontal & Vertical Support) */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  SCREEN ORIENTATION (HORIZONTAL & VERTICAL)
                  <span style={styles.settingSubLabel}>
                    Play in full screen without address bar in horizontal or vertical view
                  </span>
                </div>
                <div style={styles.chipsRow}>
                  {[
                    { label: '🔄 Auto-Rotate', mode: 'auto' as OrientationPref },
                    { label: '📱 Vertical', mode: 'portrait' as OrientationPref },
                    { label: '🖥️ Horizontal', mode: 'landscape' as OrientationPref },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      id={`orient-btn-${item.mode}`}
                      onClick={() => handleOrientationChange(item.mode)}
                      style={{
                        ...styles.chipBtn,
                        ...(orientationPref === item.mode ? styles.chipBtnActive : {}),
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 7: Immersive Fullscreen & App Installation */}
              <div style={styles.settingGroup}>
                <div style={styles.settingLabel}>
                  IMMERSIVE FULLSCREEN & ADDRESS BAR
                  <span style={styles.settingSubLabel}>
                    {isImmersive ? 'Status: Fullscreen active (Address bar hidden)' : 'Status: Windowed mode'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    id="modal-toggle-fullscreen-btn"
                    onClick={() => toggleImmersive()}
                    style={{
                      ...styles.chipBtn,
                      padding: '11px',
                      background: isImmersive ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isImmersive ? '#00e5ff' : 'rgba(255, 255, 255, 0.2)',
                      color: isImmersive ? '#00e5ff' : '#ffffff',
                      fontWeight: '800',
                    }}
                  >
                    {isImmersive ? '✕ Exit Fullscreen' : '⛶ Enter Fullscreen (Hide Address Bar)'}
                  </button>

                  {installPrompt && (
                    <button
                      id="modal-install-pwa-btn"
                      onClick={handleInstallPWA}
                      style={{
                        ...styles.chipBtn,
                        padding: '11px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        borderColor: '#22c55e',
                        color: '#22c55e',
                        fontWeight: '800',
                      }}
                    >
                      📲 Install to Home Screen (Never Show Address Bar)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button
                id="save-settings-btn"
                onClick={() => setShowMobileSettings(false)}
                style={styles.modalSaveBtn}
              >
                APPLY & RESUME GAME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. iOS Safari Address Bar Guide Modal */}
      {showIosFullscreenHint && (
        <div
          id="ios-fullscreen-modal-backdrop"
          style={styles.modalBackdrop}
          onClick={() => setShowIosFullscreenHint(false)}
        >
          <div
            id="ios-fullscreen-modal"
            style={{ ...styles.modalContent, maxWidth: '380px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderTitle}>
                <Sparkles size={18} color="#00e5ff" />
                <span>HIDE ADDRESS BAR (IPHONE)</span>
              </div>
              <button
                id="close-ios-hint-x-btn"
                onClick={() => setShowIosFullscreenHint(false)}
                style={styles.modalCloseBtn}
                aria-label="Close"
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                iOS Safari restricts automatic DOM fullscreen. Use either option below to hide the address bar in both horizontal and vertical modes:
              </p>
              <div
                style={{
                  background: 'rgba(0, 229, 255, 0.08)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: '800', color: '#00e5ff', fontSize: '12.5px' }}>
                  ⚡ Option 1 (Instant in Safari):
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                  Tap the <strong>aA</strong> icon in the address bar ➔ Tap <strong>&quot;Hide Toolbar&quot;</strong>.
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: '800', color: '#22c55e', fontSize: '12.5px' }}>
                  📲 Option 2 (Permanent Fullscreen App):
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                  Tap Safari <strong>Share</strong> (⎋) ➔ Tap <strong>&quot;Add to Home Screen&quot;</strong>. Launches with <strong>NO address bar forever</strong>!
                </div>
              </div>

              <div style={{ color: '#94a3b8', fontSize: '11.5px', marginTop: '2px', textAlign: 'center' }}>
                🔄 Supports both horizontal (landscape) and vertical (portrait) view. Simply rotate your device anytime!
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                id="close-ios-hint-btn"
                onClick={() => setShowIosFullscreenHint(false)}
                style={styles.modalSaveBtn}
              >
                GOT IT, RESUME GAME
              </button>
            </div>
          </div>
        </div>
      )}
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
    height: '100dvh',
    overflow: 'hidden',
    backgroundColor: '#05070d',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    touchAction: 'none',
    overscrollBehavior: 'none',
  },
  // 3D Canvas wrapper filling 100% of viewport at z-index 1
  canvasWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    touchAction: 'none',
  },
  // Top status bar with pointer-events: none (children enable pointer-events: auto)
  topBar: {
    position: 'absolute',
    top: 'max(12px, env(safe-area-inset-top))',
    left: 'max(12px, env(safe-area-inset-left))',
    right: 'max(12px, env(safe-area-inset-right))',
    zIndex: 50,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
    gap: '8px',
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
  // Multiplayer Network Status Badge (Phase 2)
  networkBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 15, 26, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '700',
    backdropFilter: 'blur(8px)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    letterSpacing: '0.8px',
    color: '#f1f5f9',
  },
  statusDivider: {
    color: 'rgba(255, 255, 255, 0.25)',
    margin: '0 2px',
  },
  statusDetail: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  // Bottom HUD wrapper positioning ControlsHelp on the left and Minimap on the right
  bottomHud: {
    position: 'absolute',
    bottom: 'max(20px, env(safe-area-inset-bottom))',
    left: 'max(20px, env(safe-area-inset-left))',
    right: 'max(20px, env(safe-area-inset-right))',
    zIndex: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none', // Allows empty space between help and minimap to be clicked through
  },
  mobileFloatingMap: {
    position: 'absolute',
    top: 'max(68px, calc(env(safe-area-inset-top) + 56px))',
    right: 'max(16px, env(safe-area-inset-right))',
    zIndex: 45,
    pointerEvents: 'auto',
  },
  socialToast: {
    position: 'absolute',
    top: '76px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 24px',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(34, 197, 94, 0.7)',
    boxShadow: '0 0 25px rgba(34, 197, 94, 0.45), inset 0 0 10px rgba(34, 197, 94, 0.15)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
  },
  // Generic HUD icon button
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '30px',
    height: '30px',
    padding: '5px',
    background: 'rgba(10, 15, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '9px',
    color: '#f1f5f9',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  },
  // Settings Modal Backdrop
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100dvh',
    backgroundColor: 'rgba(5, 7, 13, 0.75)',
    backdropFilter: 'blur(10px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    pointerEvents: 'auto',
  },
  modalContent: {
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90dvh',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
    border: '1px solid rgba(0, 229, 255, 0.35)',
    borderRadius: '20px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 229, 255, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modalHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '1px',
  },
  modalCloseBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '18px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingLabel: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: '0.8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  settingSubLabel: {
    fontSize: '11px',
    fontWeight: '400',
    color: '#94a3b8',
  },
  segmentedRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  segmentedBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '12px 8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  segmentedBtnActive: {
    background: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
    color: '#00e5ff',
    boxShadow: '0 0 16px rgba(0, 229, 255, 0.25)',
  },
  segmentedHint: {
    fontSize: '9.5px',
    fontWeight: '400',
    color: '#94a3b8',
    textAlign: 'center',
  },
  chipsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chipBtn: {
    flex: 1,
    minWidth: '70px',
    padding: '8px 10px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#cbd5e1',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  chipBtnActive: {
    background: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
    color: '#00e5ff',
    boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: '46px',
    height: '26px',
    borderRadius: '13px',
    padding: '3px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s ease',
  },
  toggleThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    transition: 'transform 0.2s ease',
  },
  modalFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modalSaveBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#05070d',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '1px',
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(0, 229, 255, 0.35)',
  },
};

