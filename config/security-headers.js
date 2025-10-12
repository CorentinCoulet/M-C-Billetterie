const DEFAULT_SECURITY_HEADERS = Object.freeze([
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
]);

const DEFAULT_CSP_DIRECTIVES = Object.freeze({
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", 'data:', 'https:'],
  "font-src": ["'self'", 'data:'],
  "connect-src": ["'self'"],
  "frame-ancestors": ["'none'"]
});

function mergeCspDirectives(baseDirectives = DEFAULT_CSP_DIRECTIVES, overrides = {}) {
  const result = {};
  const keys = new Set([...Object.keys(baseDirectives), ...Object.keys(overrides || {})]);

  keys.forEach((key) => {
    const baseValues = Array.isArray(baseDirectives[key]) ? baseDirectives[key] : [];
    const overrideValues = Array.isArray(overrides?.[key]) ? overrides[key] : [];
    const merged = [...new Set([...baseValues, ...overrideValues].filter(Boolean))];

    if (merged.length > 0) {
      result[key] = merged;
    }
  });

  return result;
}

function serializeCspDirectives(directives = DEFAULT_CSP_DIRECTIVES) {
  return Object.entries(directives)
    .map(([directive, values]) => {
      const serializedValues = Array.isArray(values) ? values.join(' ') : String(values);
      return `${directive} ${serializedValues}`.trim();
    })
    .join('; ');
}

function buildSecurityHeaders(options = {}) {
  const {
    env = process.env.NODE_ENV || 'development',
    cspDirectives,
    reportOnly = false,
    additionalHeaders = []
  } = options;

  const mergedDirectives = mergeCspDirectives(DEFAULT_CSP_DIRECTIVES, cspDirectives);
  const headers = [
    ...DEFAULT_SECURITY_HEADERS,
    {
      key: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
      value: serializeCspDirectives(mergedDirectives)
    }
  ];

  if (env === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload'
    });
  }

  return headers.concat(additionalHeaders).filter(Boolean);
}

module.exports = {
  DEFAULT_SECURITY_HEADERS,
  DEFAULT_CSP_DIRECTIVES,
  mergeCspDirectives,
  serializeCspDirectives,
  buildSecurityHeaders
};
