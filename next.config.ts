import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '192.168.1.2',
    '192.168.1.2:3000',
    '192.168.1.*',
    'pradeep',
    'pradeep:3000',
    'pradeep.local',
    'pradeep.local:3000',
  ],
};

export default nextConfig;
