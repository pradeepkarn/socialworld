import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let lanIp = '';

  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('vethernet') || lower.includes('wsl') || lower.includes('virtual') || lower.includes('hyper-v')) {
      continue;
    }

    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (lower.includes('wi-fi') || lower.includes('wireless') || iface.address.startsWith('192.168.')) {
          lanIp = iface.address;
          break;
        }
        if (!lanIp) lanIp = iface.address;
      }
    }
    if (lanIp && lanIp.startsWith('192.168.')) break;
  }

  if (!lanIp) lanIp = '192.168.1.2';

  return NextResponse.json({
    lanIp,
    wsPort: 3001,
    wsUrl: `ws://${lanIp}:3001`,
  });
}
