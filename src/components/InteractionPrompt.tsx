'use client';

import React from 'react';
import { IInteractionPrompt } from '@/types/game';

/**
 * =========================================================================
 * InteractionPrompt - Proximity Action Notification HUD
 * =========================================================================
 * WHAT THIS FILE DOES:
 * - Renders an animated floating neon prompt (e.g., "[E] Browse CyberMart")
 *   whenever the player walks inside an interactive trigger zone (like a shop entrance).
 * - Appears dynamically when `prompt.visible` is true and disappears when the player
 *   walks away or opens the shop menu.
 *
 * KEY GAME & UI DEV CONCEPTS:
 * 1. Conditional Rendering for Performance:
 *    - `if (!prompt.visible) return null;`
 *    - Instead of rendering an invisible `opacity: 0` element that still consumes layout
 *      and DOM memory, returning `null` completely unmounts the element from the DOM tree.
 *    - This completely halts CSS animations (`pulseGlow`) when no prompt is needed, saving GPU cycles.
 * 2. `pointerEvents: 'none'`:
 *    - This is one of the most critical CSS rules for in-game HUDs!
 *    - Floating HUD elements sit directly in front of the 3D WebGL Canvas.
 *    - Setting `pointerEvents: 'none'` ensures that mouse clicks and camera drags pass straight
 *      through the prompt into Babylon.js, allowing the player to look around without the prompt
 *      blocking their mouse clicks.
 * 3. Eye-Catching Neon Key Cap Badge:
 *    - The prompt displays the hotkey (`actionKey = "E"`) in a glowing circular gradient badge,
 *      accompanied by high-contrast white text with drop shadows for maximum legibility against
 *      bright neon storefronts or dark night alleys.
 */

// Component Props interface: expects an IInteractionPrompt object from the game state.
interface InteractionPromptProps {
  prompt: IInteractionPrompt;
}

export const InteractionPrompt: React.FC<InteractionPromptProps> = ({ prompt }) => {
  // If the player is not close to any interactive object, render nothing.
  if (!prompt.visible) return null;

  return (
    <div id="interaction-prompt" style={styles.container}>
      {/* Floating Pill Badge */}
      <div style={styles.badge}>
        {/* Glowing Circular Key Indicator (e.g., "E") */}
        <div style={styles.keyBox}>{prompt.actionKey}</div>

        {/* Action Message Text (e.g., "Browse CyberMart") */}
        <div style={styles.textContainer}>
          <span style={styles.actionText}>{prompt.message}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * =========================================================================
 * Component Inline Styles
 * =========================================================================
 * Uses modern glassmorphism, cyan glows, and CSS transforms for screen-space centering.
 */
const styles: Record<string, React.CSSProperties> = {
  // Screen-space container centered horizontally above the bottom HUD
  container: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)', // Mathematically centers the element regardless of its width
    zIndex: 40,
    pointerEvents: 'none', // Crucial: allows 3D camera mouse orbit to pass straight through
    display: 'flex',
    justifyContent: 'center',
    animation: 'pulseGlow 2s infinite ease-in-out', // Subtle breathing animation defined in global CSS
  },
  // Glowing pill-shaped capsule surrounding the key and text
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(10, 15, 26, 0.85)',
    border: '1px solid rgba(0, 229, 255, 0.5)',
    boxShadow: '0 0 25px rgba(0, 229, 255, 0.3), inset 0 0 15px rgba(0, 229, 255, 0.1)',
    borderRadius: '30px',
    padding: '8px 20px 8px 10px',
    backdropFilter: 'blur(10px)',
  },
  // Vibrant circular gradient button displaying the action key
  keyBox: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)',
    color: '#0a0d14',
    fontWeight: '800',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.6)',
  },
  // Column wrapper for prompt text
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  // High-legibility action description text
  actionText: {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)', // Ensures crisp readability over any background
  },
};

