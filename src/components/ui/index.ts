/**
 * Design System Components
 * 
 * This file exports all components from the design system for easy importing.
 * 
 * @example
 * ```tsx
 * // Import multiple components
 * import { Button, Input, Card } from '@/components/ui';
 * ```
 */

// Core Components
// We prioritize the core directory components as they are more feature-complete
export * from './core/Button';
export * from './core/Input';
export * from './core/Card';
export * from './core/Image';
export * from './core/NoSSR';

// Layout Components
export * from './layout/Container';
export * from './layout/Grid';

// Navigation Components
export * from './navigation-menu';
export * from './dropdown-menu';

// Other UI Components
export * from './avatar';

// Theme
export { default as theme } from './theme';
export * from './theme';
