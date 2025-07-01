import React, { Suspense } from 'react';

/**
 * Default loading component shown while the lazy-loaded component is being loaded
 */
export const DefaultLoading = () => (
  <div className="flex items-center justify-center p-4 h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

/**
 * Options for lazy loading a component
 */
export interface LazyLoadOptions {
  /**
   * Custom loading component to show while the component is being loaded
   */
  loading?: React.ReactNode;
  /**
   * Whether to enable server-side rendering
   * Set to false for client-side only components
   */
  ssr?: boolean;
  /**
   * Minimum delay before showing the component (to prevent flashes)
   */
  delay?: number;
}

/**
 * Lazy loads a component using React.lazy for client-side only components
 * 
 * @param importFunc - Function that imports the component
 * @param options - Options for lazy loading
 * @returns Lazy loaded component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const LazyComponent = lazyLoad(() => import('@/components/HeavyComponent'));
 * 
 * // With custom loading component
 * const LazyComponent = lazyLoad(
 *   () => import('@/components/HeavyComponent'),
 *   { loading: <CustomLoadingSpinner /> }
 * );
 * ```
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: Omit<LazyLoadOptions, 'ssr'> = {}
) {
  const {
    loading = <DefaultLoading />,
    delay = 0
  } = options;

  const LazyComponent = React.lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={loading}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Helper type for Next.js dynamic import options
 */
export interface DynamicImportOptions extends LazyLoadOptions {
  /**
   * Whether to enable server-side rendering (default: true)
   */
  ssr?: boolean;
}

/**
 * Creates a wrapper for Next.js dynamic import with consistent options
 * 
 * This function doesn't actually implement dynamic loading - it's meant to be used
 * with Next.js's dynamic import function.
 * 
 * @example
 * ```tsx
 * import dynamic from 'next/dynamic';
 * import { createDynamicImportOptions, DefaultLoading } from '@/utils/lazyLoad';
 * 
 * // Create options for Next.js dynamic import
 * const options = createDynamicImportOptions({ 
 *   loading: <CustomLoadingSpinner />,
 *   ssr: true 
 * });
 * 
 * // Use with Next.js dynamic import
 * const DynamicComponent = dynamic(
 *   () => import('@/components/HeavyComponent'),
 *   options
 * );
 * ```
 */
export function createDynamicImportOptions(options: DynamicImportOptions = {}) {
  const {
    loading = <DefaultLoading />,
    ssr = true,
    delay = 0
  } = options;

  return {
    loading: () => loading,
    ssr,
    ...(delay > 0 ? { loading: () => loading } : {})
  };
}

/**
 * Example usage with Next.js dynamic import:
 * 
 * ```tsx
 * import dynamic from 'next/dynamic';
 * import { createDynamicImportOptions } from '@/utils/lazyLoad';
 * 
 * // For server-rendered components
 * const ServerComponent = dynamic(
 *   () => import('@/components/ServerComponent'),
 *   createDynamicImportOptions()
 * );
 * 
 * // For client-side only components
 * const ClientComponent = dynamic(
 *   () => import('@/components/ClientComponent'),
 *   createDynamicImportOptions({ ssr: false })
 * );
 * 
 * // With custom loading component
 * const CustomLoadingComponent = dynamic(
 *   () => import('@/components/HeavyComponent'),
 *   createDynamicImportOptions({ 
 *     loading: <CustomSpinner />,
 *     delay: 200
 *   })
 * );
 * ```
 */
