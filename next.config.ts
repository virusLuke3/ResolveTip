import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@tetherto/wdk', '@tetherto/wdk-wallet-evm', 'bare-node-runtime', 'sodium-native', 'sodium-universal'],
  typedRoutes: true,
};

export default nextConfig;
