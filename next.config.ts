import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // ✅ Configuration mise à jour pour Next.js 15
  // Désactiver temporairement
  // serverExternalPackages: ['next-intl'], // Correction de l'avertissement

  // ✅ Configuration Webpack pour React 19
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  // ✅ Désactiver temporairement certaines optimisations
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
};

export default nextConfig;
