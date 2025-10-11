/**
 * Global setup for Playwright E2E tests
 * Adds necessary polyfills for Node.js globals
 */

// Polyfill for TransformStream if not available
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('stream/web');
  global.TransformStream = TransformStream;
}

// Polyfill for ReadableStream if not available
if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
}

// Polyfill for WritableStream if not available
if (typeof global.WritableStream === 'undefined') {
  const { WritableStream } = require('stream/web');
  global.WritableStream = WritableStream;
}

export default async function globalSetup() {
  console.log('🚀 E2E Global Setup: Polyfills loaded');
}
