const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Expose environment variables to client-side if needed
    NEXT_PUBLIC_APP_NAME: 'Billetterie',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  
  // Optimize performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Temporarily ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configure external packages for server components
  serverExternalPackages: ['jsonwebtoken', 'ioredis', 'redis'],
  
  // Configure experimental features
  experimental: {
    // Optimize performance
    optimizeCss: true,
  },
  
  // Security headers (additional to middleware)
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
      ]
    }
  ],
  
  // Redirects
  redirects: async () => [
    {
      source: '/admin',
      destination: '/admin/dashboard',
      permanent: true,
    },
  ],
  
  // Webpack config for additional optimizations
  webpack: (config, { isServer, dev }) => {
    // Optimize for production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Skip certain modules during build phase to avoid runtime issues
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      config.externals = config.externals || [];
      config.externals.push({
        'ioredis': 'commonjs ioredis',
        'redis': 'commonjs redis',
      });
    }
    
    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config for Sentry webpack plugin
  silent: process.env.NODE_ENV !== 'production',
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Upload source maps only in production
  upload: process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN,
  
  // Don't upload source maps in development
  dryRun: process.env.NODE_ENV !== 'production',
  
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring/sentry",
};

// Export configuration with Sentry integration
module.exports = process.env.SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
