'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameCanvasHandle } from './GameCanvas';
import { ArrowUp, Sparkles, SlidersHorizontal } from 'lucide-react';

export type JoystickHand = 'left' | 'right';

interface MobileControlsProps {
  canvasHandle: GameCanvasHandle | null;
  canHandshake: boolean;
  canInteract: boolean;
  joystickHand?: JoystickHand;
  sensitivityMultiplier?: number;
  showDistanceSlider?: boolean;
  onActivePlayChange?: (isActive: boolean) => void;
  onOpenSettings?: () => void;
}

/**
 * =========================================================================
 * MobileControls - Tactile Third-Person Mobile Controls HUD
 * =========================================================================
 * High-performance mobile controls overlay designed specifically for NeoVerse.
 * Supports:
 * - Dynamic Left-Handed or Right-Handed virtual joystick placement
 * - Dedicated 360° touch camera look & two-finger pinch-to-zoom
 * - Zero React re-renders during 60 FPS gameplay movement and camera orbiting
 * - Thumb-accessible action cluster (Jump, Handshake, Interact)
 * - Safe area inset compliance (notches and home indicator bars)
 */
export const MobileControls: React.FC<MobileControlsProps> = ({
  canvasHandle,
  canHandshake,
  canInteract,
  joystickHand = 'left',
  sensitivityMultiplier = 1.0,
  showDistanceSlider = false,
  onActivePlayChange,
  onOpenSettings,
}) => {
  // Fresh reference to canvasHandle
  const canvasHandleRef = useRef<GameCanvasHandle | null>(canvasHandle);
  useEffect(() => {
    canvasHandleRef.current = canvasHandle;
  }, [canvasHandle]);

  // References for zero re-render DOM manipulation
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const movementZoneRef = useRef<HTMLDivElement>(null);
  const cameraZoneRef = useRef<HTMLDivElement>(null);

  // State tracking active touch identifiers
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastCameraPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);

  // Inactivity / Auto-hide timer
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMovingRef = useRef<boolean>(false);

  const resetActivityTimer = useCallback(() => {
    if (onActivePlayChange) {
      onActivePlayChange(false);
    }
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    activityTimerRef.current = setTimeout(() => {
      if (isMovingRef.current && onActivePlayChange) {
        onActivePlayChange(true);
      }
    }, 3500);
  }, [onActivePlayChange]);

  // -------------------------------------------------------------------------
  // 1. Virtual Movement Joystick Logic (Zero Re-render)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const zone = movementZoneRef.current;
    const base = joystickBaseRef.current;
    const thumb = joystickThumbRef.current;
    if (!zone || !base || !thumb) return;

    const maxRadius = 48; // max pixel distance from joystick center

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      resetActivityTimer();

      // Only track if touched directly inside movement zone (not on buttons)
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-control-button]')) {
        return;
      }

      if (joystickTouchIdRef.current !== null) return; // already tracking a finger

      const touch = e.changedTouches[0];
      joystickTouchIdRef.current = touch.identifier;

      const rect = zone.getBoundingClientRect();
      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Position floating base centered at touch point
      joystickCenterRef.current = { x: touchX, y: touchY };
      base.style.opacity = '1.0';
      base.style.bottom = 'auto';
      base.style.right = 'auto';
      base.style.left = `${touchX - rect.left - 60}px`;
      base.style.top = `${touchY - rect.top - 60}px`;
      thumb.style.transform = 'translate3d(0px, 0px, 0px)';

      isMovingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchIdRef.current) {
          const dx = touch.clientX - joystickCenterRef.current.x;
          const dy = touch.clientY - joystickCenterRef.current.y;
          const distance = Math.hypot(dx, dy);

          let clampedX = dx;
          let clampedY = dy;
          if (distance > maxRadius) {
            clampedX = (dx / distance) * maxRadius;
            clampedY = (dy / distance) * maxRadius;
          }

          // Move visual thumb
          thumb.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0px)`;

          // Normalize: forward is -dy (screen Y increases downward), right is dx
          const forward = -clampedY / maxRadius;
          const right = clampedX / maxRadius;
          const isSprinting = distance / maxRadius > 0.82;

          if (canvasHandleRef.current) {
            canvasHandleRef.current.setMobileJoystick(forward, right, isSprinting);
          }
          break;
        }
      }
    };

    const endJoystick = (e: TouchEvent) => {
      if (joystickTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchIdRef.current) {
          joystickTouchIdRef.current = null;
          thumb.style.transform = 'translate3d(0px, 0px, 0px)';
          base.style.opacity = '0.55';
          base.style.top = 'auto';
          base.style.bottom = 'max(40px, env(safe-area-inset-bottom))';
          if (isLeftHand) {
            base.style.left = 'max(30px, env(safe-area-inset-left))';
            base.style.right = 'auto';
          } else {
            base.style.right = 'max(30px, env(safe-area-inset-right))';
            base.style.left = 'auto';
          }

          if (canvasHandleRef.current) {
            canvasHandleRef.current.setMobileJoystick(0, 0, false);
          }
          isMovingRef.current = false;
          resetActivityTimer();
          break;
        }
      }
    };

    zone.addEventListener('touchstart', onTouchStart, { passive: false });
    zone.addEventListener('touchmove', onTouchMove, { passive: false });
    zone.addEventListener('touchend', endJoystick, { passive: false });
    zone.addEventListener('touchcancel', endJoystick, { passive: false });

    return () => {
      zone.removeEventListener('touchstart', onTouchStart);
      zone.removeEventListener('touchmove', onTouchMove);
      zone.removeEventListener('touchend', endJoystick);
      zone.removeEventListener('touchcancel', endJoystick);
    };
  }, [canvasHandle, resetActivityTimer, joystickHand]);

  // -------------------------------------------------------------------------
  // 2. Touch Camera Look & Pinch-to-Zoom Logic (Zero Re-render)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const cameraZone = cameraZoneRef.current;
    if (!cameraZone) return;

    // Base sensitivity scaled by user setting
    const baseSensitivity = 0.0055 * (sensitivityMultiplier || 1.0);

    const onLookStart = (e: TouchEvent) => {
      resetActivityTimer();

      // Only track if touched directly inside camera zone (not on buttons)
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-control-button]')) {
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        cameraTouchesRef.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }

      if (cameraTouchesRef.current.size === 1) {
        const [singleTouch] = cameraTouchesRef.current.values();
        lastCameraPosRef.current = { x: singleTouch.x, y: singleTouch.y };
        isMovingRef.current = true;
      } else if (cameraTouchesRef.current.size >= 2) {
        const pts = Array.from(cameraTouchesRef.current.values());
        lastPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        isMovingRef.current = true;
      }
    };

    const onLookMove = (e: TouchEvent) => {
      if (cameraTouchesRef.current.size === 0) return;

      let hasUpdated = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (cameraTouchesRef.current.has(touch.identifier)) {
          cameraTouchesRef.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
          hasUpdated = true;
        }
      }

      if (!hasUpdated) return;
      e.preventDefault();

      if (cameraTouchesRef.current.size === 1) {
        // Single finger: 360° camera look orbit without moving character
        const [touchPos] = cameraTouchesRef.current.values();
        const deltaX = touchPos.x - lastCameraPosRef.current.x;
        const deltaY = touchPos.y - lastCameraPosRef.current.y;
        lastCameraPosRef.current = { x: touchPos.x, y: touchPos.y };

        if (canvasHandleRef.current) {
          canvasHandleRef.current.rotateCamera(deltaX * baseSensitivity, deltaY * baseSensitivity);
        }
      } else if (cameraTouchesRef.current.size >= 2) {
        // Two fingers: Pinch-to-zoom (spread = zoom out, pinch = zoom in)
        const pts = Array.from(cameraTouchesRef.current.values());
        const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

        if (lastPinchDistRef.current !== null) {
          const distDelta = currentDist - lastPinchDistRef.current;
          if (Math.abs(distDelta) > 0.5 && canvasHandleRef.current) {
            const pinchSensitivity = 0.025;
            canvasHandleRef.current.zoomCamera(distDelta * pinchSensitivity);
          }
        }
        lastPinchDistRef.current = currentDist;
      }
    };

    const onLookEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        cameraTouchesRef.current.delete(touch.identifier);
      }

      if (cameraTouchesRef.current.size === 1) {
        // Down to 1 finger: reset lastCameraPos to avoid sudden jump
        const [remainingTouch] = cameraTouchesRef.current.values();
        lastCameraPosRef.current = { x: remainingTouch.x, y: remainingTouch.y };
        lastPinchDistRef.current = null;
      } else if (cameraTouchesRef.current.size === 0) {
        lastPinchDistRef.current = null;
        isMovingRef.current = false;
        resetActivityTimer();
      }
    };

    cameraZone.addEventListener('touchstart', onLookStart, { passive: false });
    cameraZone.addEventListener('touchmove', onLookMove, { passive: false });
    cameraZone.addEventListener('touchend', onLookEnd, { passive: false });
    cameraZone.addEventListener('touchcancel', onLookEnd, { passive: false });

    return () => {
      cameraZone.removeEventListener('touchstart', onLookStart);
      cameraZone.removeEventListener('touchmove', onLookMove);
      cameraZone.removeEventListener('touchend', onLookEnd);
      cameraZone.removeEventListener('touchcancel', onLookEnd);
    };
  }, [canvasHandle, resetActivityTimer, joystickHand, sensitivityMultiplier]);

  const isLeftHand = joystickHand === 'left';

  return (
    <div id="mobile-controls-root" style={styles.overlay}>
      {/* 1. MOVEMENT ZONE (Virtual Joystick) */}
      <div
        id="mobile-joystick-zone"
        ref={movementZoneRef}
        style={{
          ...styles.halfZone,
          left: isLeftHand ? 0 : 'auto',
          right: isLeftHand ? 'auto' : 0,
        }}
      >
        {/* Floating Joystick Base */}
        <div
          id="joystick-base"
          ref={joystickBaseRef}
          style={{
            ...styles.joystickBase,
            left: isLeftHand ? 'max(30px, env(safe-area-inset-left))' : 'auto',
            right: isLeftHand ? 'auto' : 'max(30px, env(safe-area-inset-right))',
          }}
        >
          <div style={styles.joystickRing} />
          <div id="joystick-thumb" ref={joystickThumbRef} style={styles.joystickThumb} />
        </div>

        {/* Joystick idle indicator prompt */}
        <div
          style={{
            ...styles.joystickHint,
            left: isLeftHand ? 'max(20px, env(safe-area-inset-left))' : 'auto',
            right: isLeftHand ? 'auto' : 'max(20px, env(safe-area-inset-right))',
          }}
        >
          <span>🕹️ DRAG TO MOVE</span>
        </div>
      </div>

      {/* 2. CAMERA LOOK & PINCH ZONE */}
      <div
        id="mobile-camera-zone"
        ref={cameraZoneRef}
        style={{
          ...styles.halfZone,
          left: isLeftHand ? 'auto' : 0,
          right: isLeftHand ? 0 : 'auto',
        }}
      >
        {/* Action Buttons Hub (Placed opposite the joystick hand) */}
        <div
          id="mobile-action-hub"
          style={{
            ...styles.actionButtonsHub,
            left: isLeftHand ? 'auto' : 'max(18px, env(safe-area-inset-left))',
            right: isLeftHand ? 'max(18px, env(safe-area-inset-right))' : 'auto',
            alignItems: isLeftHand ? 'flex-end' : 'flex-start',
          }}
        >
          {/* Contextual: 🤝 Handshake Button */}
          {canHandshake && (
            <button
              id="mobile-handshake-btn"
              data-control-button="true"
              style={styles.handshakeBtn}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                resetActivityTimer();
                if (canvasHandleRef.current) canvasHandleRef.current.triggerHandshake();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canvasHandleRef.current) canvasHandleRef.current.triggerHandshake();
              }}
            >
              <span style={styles.buttonEmoji}>🤝</span>
              <span style={styles.buttonText}>HANDSHAKE</span>
            </button>
          )}

          {/* Contextual: 🛍️ Interact / Shop Button */}
          {canInteract && (
            <button
              id="mobile-interact-btn"
              data-control-button="true"
              style={styles.interactBtn}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                resetActivityTimer();
                if (canvasHandleRef.current) canvasHandleRef.current.triggerInteract();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canvasHandleRef.current) canvasHandleRef.current.triggerInteract();
              }}
            >
              <Sparkles size={18} color="#00e5ff" />
              <span style={styles.buttonText}>INTERACT</span>
            </button>
          )}

          {/* Primary Action: JUMP Button */}
          <button
            id="mobile-jump-btn"
            data-control-button="true"
            style={styles.jumpBtn}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              resetActivityTimer();
              if (canvasHandleRef.current) canvasHandleRef.current.triggerJump();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (canvasHandleRef.current) canvasHandleRef.current.triggerJump();
            }}
          >
            <ArrowUp size={22} color="#ffffff" />
            <span style={styles.jumpText}>JUMP</span>
          </button>
        </div>

        {/* Optional One-Handed Distance Slider along edge */}
        {showDistanceSlider && (
          <div
            id="mobile-distance-slider-wrap"
            data-control-button="true"
            style={{
              ...styles.distanceSliderWrap,
              left: isLeftHand ? 'auto' : 'max(10px, env(safe-area-inset-left))',
              right: isLeftHand ? 'max(10px, env(safe-area-inset-right))' : 'auto',
            }}
          >
            <span style={styles.sliderTag}>+</span>
            <input
              type="range"
              min="4.0"
              max="14.0"
              step="0.2"
              defaultValue="9.0"
              style={styles.distanceSlider}
              onChange={(e) => {
                if (canvasHandleRef.current) {
                  canvasHandleRef.current.setCameraDistance(parseFloat(e.target.value));
                }
              }}
            />
            <span style={styles.sliderTag}>-</span>
          </div>
        )}

        {/* Camera look idle hint */}
        <div
          style={{
            ...styles.cameraHint,
            left: isLeftHand ? 'auto' : 'max(20px, env(safe-area-inset-left))',
            right: isLeftHand ? 'max(20px, env(safe-area-inset-right))' : 'auto',
          }}
        >
          <span>DRAG TO LOOK · PINCH ZOOM</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 35,
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
    overflow: 'hidden',
  },
  halfZone: {
    position: 'absolute',
    top: 'max(56px, calc(env(safe-area-inset-top) + 48px))',
    bottom: 0,
    width: '50%',
    pointerEvents: 'auto',
    touchAction: 'none',
  },
  joystickBase: {
    display: 'block',
    position: 'absolute',
    bottom: 'max(40px, env(safe-area-inset-bottom))',
    width: '120px',
    height: '120px',
    pointerEvents: 'none',
    zIndex: 36,
    opacity: 0.55,
    transition: 'opacity 0.2s ease',
  },
  joystickRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 229, 255, 0.14) 0%, rgba(10, 15, 26, 0.75) 100%)',
    border: '2px solid rgba(0, 229, 255, 0.5)',
    boxShadow: '0 0 20px rgba(0, 229, 255, 0.25), inset 0 0 15px rgba(0, 229, 255, 0.15)',
    backdropFilter: 'blur(4px)',
  },
  joystickThumb: {
    position: 'absolute',
    top: '35px',
    left: '35px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)',
    boxShadow: '0 0 16px rgba(0, 229, 255, 0.85)',
    border: '2px solid #ffffff',
  },
  joystickHint: {
    position: 'absolute',
    bottom: 'max(22px, env(safe-area-inset-bottom))',
    padding: '5px 12px',
    borderRadius: '16px',
    background: 'rgba(8, 12, 22, 0.7)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    color: '#94a3b8',
    fontSize: 'clamp(9px, 2.5vw, 11px)',
    fontWeight: '700',
    letterSpacing: '0.8px',
    pointerEvents: 'none',
    opacity: 0.75,
  },
  cameraHint: {
    position: 'absolute',
    top: 'max(74px, calc(env(safe-area-inset-top) + 60px))',
    padding: '4px 10px',
    borderRadius: '12px',
    background: 'rgba(8, 12, 22, 0.55)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    fontSize: 'clamp(9px, 2.3vw, 10px)',
    fontWeight: '700',
    letterSpacing: '0.6px',
    pointerEvents: 'none',
    opacity: 0.65,
  },
  actionButtonsHub: {
    position: 'absolute',
    bottom: 'max(20px, env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'auto',
    zIndex: 40,
  },
  jumpBtn: {
    width: 'clamp(58px, 15vw, 68px)',
    height: 'clamp(58px, 15vw, 68px)',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.4) 0%, rgba(14, 165, 233, 0.88) 100%)',
    border: '2px solid rgba(0, 229, 255, 0.9)',
    boxShadow: '0 0 22px rgba(0, 229, 255, 0.55), inset 0 0 10px rgba(255, 255, 255, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    backdropFilter: 'blur(8px)',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform 0.1s ease',
  },
  jumpText: {
    fontSize: 'clamp(9px, 2.5vw, 11px)',
    fontWeight: '900',
    letterSpacing: '1px',
    marginTop: '2px',
  },
  handshakeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3.5vw, 18px)',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.92) 0%, rgba(21, 128, 61, 0.95) 100%)',
    border: '2px solid #86efac',
    boxShadow: '0 0 20px rgba(34, 197, 94, 0.65)',
    color: '#ffffff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    animation: 'pulseGlow 1.5s infinite ease-in-out',
  },
  interactBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3.5vw, 18px)',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.92) 0%, rgba(126, 34, 206, 0.95) 100%)',
    border: '2px solid #c084fc',
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.65)',
    color: '#ffffff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    animation: 'pulseGlow 1.5s infinite ease-in-out',
  },
  buttonEmoji: {
    fontSize: 'clamp(15px, 4vw, 18px)',
  },
  buttonText: {
    fontSize: 'clamp(10px, 2.8vw, 12px)',
    fontWeight: '800',
    letterSpacing: '0.8px',
  },
  distanceSliderWrap: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(8, 12, 22, 0.65)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    borderRadius: '16px',
    padding: '8px 4px',
    backdropFilter: 'blur(6px)',
    zIndex: 42,
    pointerEvents: 'auto',
    opacity: 0.8,
  },
  sliderTag: {
    color: '#00e5ff',
    fontSize: '11px',
    fontWeight: '900',
    userSelect: 'none',
  },
  distanceSlider: {
    writingMode: 'vertical-lr' as any,
    WebkitAppearance: 'slider-vertical' as any,
    width: '18px',
    height: '110px',
    cursor: 'pointer',
    accentColor: '#00e5ff',
  },
};
