'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import GameUI with ssr: false for WebGL/Babylon.js window compatibility
const GameUI = dynamic(
  () => import('@/components/GameUI').then((mod) => mod.GameUI),
  {
    ssr: false,
    loading: () => (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <h2 style={loadingStyles.title}>INITIALIZING NEOVERSE CITY</h2>
        <p style={loadingStyles.subtitle}>Building PBR environment, roads, and shaders...</p>
      </div>
    ),
  }
);

export default function GamePage() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameUI />
    </main>
  );
}

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060911',
    color: '#f8fafc',
    gap: '16px',
    fontFamily: 'sans-serif',
  },
  spinner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '3px solid rgba(0, 229, 255, 0.2)',
    borderTopColor: '#00e5ff',
    animation: 'spin 1s linear infinite',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '2px',
    color: '#00e5ff',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#94a3b8',
  },
};
