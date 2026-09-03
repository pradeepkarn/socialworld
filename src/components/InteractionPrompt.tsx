'use client';

import React from 'react';
import { IInteractionPrompt } from '@/types/game';

interface InteractionPromptProps {
  prompt: IInteractionPrompt;
}

export const InteractionPrompt: React.FC<InteractionPromptProps> = ({ prompt }) => {
  if (!prompt.visible) return null;

  return (
    <div id="interaction-prompt" style={styles.container}>
      <div style={styles.badge}>
        <div style={styles.keyBox}>{prompt.actionKey}</div>
        <div style={styles.textContainer}>
          <span style={styles.actionText}>{prompt.message}</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 40,
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    animation: 'pulseGlow 2s infinite ease-in-out',
  },
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
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  actionText: {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
  },
};
