'use client';

import React, { useEffect, useRef } from 'react';
import { IVector3 } from '@/types/game';

interface MinimapProps {
  playerPosition: IVector3;
  playerRotationY: number;
}

export const Minimap: React.FC<MinimapProps> = ({ playerPosition, playerRotationY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 160;
    const center = size / 2;
    const scale = 1.35; // 1 meter in 3D = 1.35 px on radar

    // Clear radar
    ctx.clearRect(0, 0, size, size);

    // Radar circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 4, 0, Math.PI * 2);
    ctx.clip();

    // Dark radar background with grid lines
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Range rings
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, 30, 0, Math.PI * 2);
    ctx.arc(center, center, 55, 0, Math.PI * 2);
    ctx.stroke();

    // World-to-radar transformation (centered on player)
    ctx.save();
    ctx.translate(center, center);

    const worldToRadar = (wx: number, wz: number) => {
      return {
        x: (wx - playerPosition.x) * scale,
        y: -(wz - playerPosition.z) * scale,
      };
    };

    // Draw Main Roads
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    // NS road: width 14m
    const rNS = worldToRadar(0, 0);
    ctx.fillRect(rNS.x - 7 * scale, -100, 14 * scale, 200);
    // EW road: height 14m
    ctx.fillRect(-100, rNS.y - 7 * scale, 200, 14 * scale);

    // Draw Shops on Radar
    // 1. CyberMart (-12, 20)
    const cm = worldToRadar(-12, 20);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(cm.x, cm.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('CyberMart', cm.x + 6, cm.y + 3);

    // 2. Neon Cafe (12, 20)
    const nc = worldToRadar(12, 20);
    ctx.fillStyle = '#ff2a85';
    ctx.beginPath();
    ctx.arc(nc.x, nc.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Neon Cafe', nc.x + 6, nc.y + 3);

    // Central Monument (0, 0)
    const mon = worldToRadar(0, 0);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(mon.x - 3, mon.y - 3, 6, 6);

    ctx.restore(); // Exit world transform

    // Draw Player Arrow in Center
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-playerRotationY); // Rotate arrow to player heading

    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore(); // Exit circular clip

    // Outer cyber border
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Compass points (N, S, E, W)
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('N', center, 14);
    ctx.fillText('S', center, size - 6);
    ctx.fillText('E', size - 8, center + 3);
    ctx.fillText('W', 8, center + 3);
  }, [playerPosition, playerRotationY]);

  return (
    <div style={styles.radarContainer}>
      <canvas ref={canvasRef} width={160} height={160} style={styles.canvas} />
      <div style={styles.label}>TACTICAL RADAR</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  radarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(10, 15, 26, 0.75)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    borderRadius: '16px',
    padding: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
  },
  canvas: {
    borderRadius: '50%',
    display: 'block',
  },
  label: {
    fontSize: '9px',
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: '1px',
    marginTop: '6px',
  },
};
