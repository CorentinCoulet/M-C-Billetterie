const { buildSecurityHeaders } = require('./config/security-headers');

const securityHeaders = buildSecurityHeaders({
  env: process.env.NODE_ENV,
  additionalHeaders: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: 'Billetterie',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  // Active gzip/deflate compression côté Next.js en production
  compress: true,
  
  // Configuration optimisée pour le développement
  ...(process.env.NODE_ENV === 'development' && {
    // Fast Refresh optimisé
    reactStrictMode: false, // Désactive en dev pour éviter les doubles renders
    
    // Configuration expérimentale pour Docker
    experimental: {
      serverActions: {
        allowedOrigins: ['localhost:3001', '0.0.0.0:3001']
      },
      // Optimisations de développement
      optimizePackageImports: ['@phosphor-icons/react', '@radix-ui/react-*'],
    },
  }),
  
  // Configuration de production
  ...(process.env.NODE_ENV === 'production' && {
    reactStrictMode: true,
    compiler: {
      removeConsole: true,
    },
  }),
  
  poweredByHeader: false,
  output: 'standalone',
  
  // Ignore les erreurs pendant le développement pour accélérer
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  serverExternalPackages: ['jsonwebtoken', 'ioredis', 'redis', 'bcryptjs', 'nodemailer'],
  
  headers: async () => [
    // Global security headers
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
    // Cache aggressively Next.js static assets
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // Cache images served by next/image loader
    {
      source: '/_next/image(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
    // Public assets (icons, fonts, etc.)
    {
      source: '/fonts/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/images/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=604800' },
      ],
    },
  ],
  
  // Redirects
  redirects: async () => [
    {
      source: '/admin',
      destination: '/admin/dashboard',
      permanent: true,
    },
  ],
  
  webpack: (config, { isServer, dev }) => {
    // Configuration spécifique au développement
    if (dev) {
      // Désactive le polling coûteux sous Docker, conserve uniquement les exclusions
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/cache/**',
          '**/coverage/**',
          '**/logs/**',
          '**/uploads/**',
          '**/.git/**',
          '**/prisma/migrations/**',
          '**/backups/**'
        ]
      };
      
      // Cache en mémoire pour éviter les problèmes de permissions
      config.cache = {
        type: 'memory',
        maxGenerations: 1, // Limite le cache pour éviter les corruptions
      };
      
      // Optimisations de développement agressives
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
          runtimeChunk: false, // Désactive pour simplifier
        };
      }
      
      // Module resolution plus rapide
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
      };
    }
    
    // Fallbacks pour le client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        worker_threads: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
