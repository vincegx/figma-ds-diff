import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from the core workspace package
  transpilePackages: ['@figma-ds-diff/core'],
  // Keep sharp + pixelmatch out of bundling (native modules)
  serverExternalPackages: ['sharp', 'pixelmatch'],
  // Turbopack handles .js → .ts resolution natively.
  // Keep webpack config as fallback for `next build` (which still uses webpack).
  webpack(config, { isServer }) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };

    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('sharp', 'pixelmatch');
      }
    }

    return config;
  },
};

export default nextConfig;
