'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const ControlsHelp: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <div style={styles.titleRow}>
          <HelpCircle size={15} color="#00e5ff" />
          <span style={styles.title}>CONTROLS GUIDE</span>
        </div>
        <button style={styles.toggleBtn}>
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div style={styles.content}>
          <div style={styles.row}>
            <span style={styles.key}>W A S D</span>
            <span style={styles.desc}>Move Avatar</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>SHIFT</span>
            <span style={styles.desc}>Sprint / Run</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>SPACE</span>
            <span style={styles.desc}>Jump</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>MOUSE</span>
            <span style={styles.desc}>Orbit / Free Look</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>SCROLL</span>
            <span style={styles.desc}>Zoom In / Out</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>E</span>
            <span style={styles.desc}>Enter Shop / Action</span>
          </div>
          <div style={styles.row}>
            <span style={styles.key}>ESC</span>
            <span style={styles.desc}>Close Menus</span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(10, 15, 26, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 14px',
    backdropFilter: 'blur(8px)',
    width: '210px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    color: '#e2e8f0',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
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
  desc: {
    color: '#94a3b8',
  },
};
