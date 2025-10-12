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
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  
  serverExternalPackages: ['jsonwebtoken', 'ioredis', 'redis', 'bcryptjs', 'nodemailer'],
  
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
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
      // Hot reload ultra-rapide
      config.watchOptions = {
        poll: 100, // Très réactif - 100ms au lieu de 250ms
        aggregateTimeout: 50, // Encore plus rapide
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
