// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This tells Next.js the root of your project is the 'frontend' folder
  turbopack: {
    root: __dirname,
  },
  // Keeps your dev server stable on Windows
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  // Limits hot-reload polling interval (use pollIntervalMs on supported Next types)
  // (Ignored patterns are not part of NextConfig's watchOptions type.)
  watchOptions: { pollIntervalMs: 1000 },
};

export default nextConfig;