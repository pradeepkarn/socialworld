'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * =========================================================================
 * ControlsHelp - Collapsible On-Screen Keybindings HUD
 * =========================================================================
 * WHAT THIS FILE DOES:
 * - Renders a sleek, cyberpunk-styled floating overlay in the bottom-left corner
 *   of the screen.
 * - Displays an easy-to-read cheat-sheet of all game controls:
 *   - WASD: 3D avatar movement in the city.
 *   - SHIFT: Sprinting / running at boosted speed.
 *   - SPACE: Jumping with realistic physics gravity.
 *   - MOUSE: Orbiting the third-person follow camera.
 *   - SCROLL: Zooming camera distance in and out.
 *   - E: Proximity trigger key for entering shops or starting dialogues.
 *   - ESC: Universal exit key to close modals or cancel actions.
 *
 * KEY UI & GAME DEV CONCEPTS:
 * 1. Collapsible Floating Widget:
 *    - Players need controls guidance when they first start the game, but seasoned
 *      players often prefer an unobstructed view of the 3D city.
 *    - Clicking the header toggles `collapsed` state, shrinking the panel to a tiny title bar.
 * 2. Glassmorphism Design:
 *    - Uses `backdropFilter: blur(8px)` combined with semi-transparent dark backgrounds
 *      `rgba(10, 15, 26, 0.75)` and neon border accents.
 *    - Allows the 3D scene to subtly shine through the HUD, giving a premium, futuristic feel.
 * 3. Physical Key Styling:
 *    - Each hotkey (e.g., [WASD], [SHIFT], [SPACE]) is stylized inside a compact box with
 *      neon text `#00e5ff` and subtle borders to look like a physical mechanical keyboard keycap.
 */
export const ControlsHelp: React.FC = () => {
  // State tracking whether the controls list is collapsed (hidden) or expanded (visible).
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.container}>
      {/* Clickable Header Bar: Toggles expand / collapse */}
      <div style={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <div style={styles.titleRow}>
          {/* Cyan neon icon */}
          <HelpCircle size={15} color="#00e5ff" />
          <span style={styles.title}>CONTROLS GUIDE</span>
        </div>
        {/* Expand / Collapse Chevron Indicator */}
        <button style={styles.toggleBtn}>
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Keybindings List */}
      {!collapsed && (
        <div style={styles.content}>
          {/* Movement Keys */}
          <div style={styles.row}>
            <span style={styles.key}>W A S D</span>
            <span style={styles.desc}>Move Avatar</span>
          </div>

          {/* Sprint Key */}
          <div style={styles.row}>
            <span style={styles.key}>SHIFT</span>
            <span style={styles.desc}>Sprint / Run</span>
          </div>

          {/* Jump Key */}
          <div style={styles.row}>
            <span style={styles.key}>SPACE</span>
            <span style={styles.desc}>Jump</span>
          </div>

          {/* Mouse Camera Orbit */}
          <div style={styles.row}>
            <span style={styles.key}>MOUSE</span>
            <span style={styles.desc}>Orbit / Free Look</span>
          </div>

          {/* Mouse Wheel Zoom */}
          <div style={styles.row}>
            <span style={styles.key}>SCROLL</span>
            <span style={styles.desc}>Zoom In / Out</span>
          </div>

          {/* Action / Interaction Trigger */}
          <div style={styles.row}>
            <span style={styles.key}>E</span>
            <span style={styles.desc}>Enter Shop / Action</span>
          </div>

          {/* Escape / Close Modals */}
          <div style={styles.row}>
            <span style={styles.key}>ESC</span>
            <span style={styles.desc}>Close Menus</span>
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
 * Clean, zero-dependency CSS-in-JS style tokens matching the cyberpunk theme.
 */
const styles: Record<string, React.CSSProperties> = {
  // Main widget card with glassmorphism backdrop blur
  container: {
    background: 'rgba(10, 15, 26, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 14px',
    backdropFilter: 'blur(8px)',
    width: '210px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  // Header row containing title and expand/collapse arrow
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  // Icon and label alignment
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  // Title typography
  title: {
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    color: '#e2e8f0',
  },
  // Minimalist chevron toggle button
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  // Vertical column wrapper for the hotkey rows
  content: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  // Individual row displaying key badge on left and description on right
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
  // Keycap badge mimicking a physical keyboard key
  key: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#00e5ff',
    letterSpacing: '0.5px',
  },
  // Action explanation text
  desc: {
    color: '#94a3b8',
  },
};

