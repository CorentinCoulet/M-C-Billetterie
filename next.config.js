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
  compress: true,
  
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: false,
    
    experimental: {
      serverActions: {
        allowedOrigins: ['localhost:3001', '0.0.0.0:3001']
      },
      optimizePackageImports: ['@phosphor-icons/react', '@radix-ui/react-*'],
    },
  }),
  
  ...(process.env.NODE_ENV === 'production' && {
    reactStrictMode: true,
    compiler: {
      removeConsole: true,
    },
  }),
  
  poweredByHeader: false,
  output: 'standalone',
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Externalize certain server-only packages so webpack doesn't attempt to bundle them.
  // This avoids issues like "require.extensions is not supported by webpack" (e.g., Handlebars)
  serverExternalPackages: ['jsonwebtoken', 'ioredis', 'redis', 'bcryptjs', 'nodemailer', 'handlebars'],
  
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/_next/image(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
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
  
  redirects: async () => [
    {
      source: '/admin',
      destination: '/admin/dashboard',
      permanent: true,
    },
  ],
  
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: process.env.WATCHPACK_POLLING === 'true' ? 2000 : undefined,
        aggregateTimeout: 500,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/coverage/**',
          '**/logs/**',
          '**/uploads/**',
          '**/.git/**',
          '**/backups/**',
          '**/prisma/migrations/**',
          '**/docs/**',
          '**/diagrams/**',
          '**/k8s/**',
          '**/infrastructure/**',
          '**/monitoring/**',
          '**/*.md'
        ]
      };
      
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
      
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
          runtimeChunk: false,
        };
      }
      
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
      };
    }
    
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
