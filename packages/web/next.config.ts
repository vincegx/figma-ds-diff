import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from the core workspace package
  transpilePackages: ['@figma-ds-diff/core'],
  // Keep sharp + pixelmatch out of webpack (native modules)
  serverExternalPackages: ['sharp', 'pixelmatch'],
  webpack(config, { isServer }) {
    // Resolve .js → .ts for ESM TypeScript packages (core uses .js extensions in imports)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };

    // Force-externalize sharp and pixelmatch for server builds.
    // serverExternalPackages doesn't catch transitive deps from transpilePackages.
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
