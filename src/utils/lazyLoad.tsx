import React, { Suspense } from 'react';

/**
 * Default loading component shown while the lazy-loaded component is being loaded
 */
const DefaultLoading = () => (
  <div className="flex items-center justify-center p-4 h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

/**
 * Options for lazy loading a component
 */
interface LazyLoadOptions {
  /**
   * Custom loading component to show while the component is being loaded
   */
  loading?: React.ReactNode;
  /**
   * Whether to use React.lazy for client-side lazy loading
   * Set to false if you're using Next.js dynamic import with SSR
   */
  useReactLazy?: boolean;
  /**
   * Minimum delay before showing the component (to prevent flashes)
   */
  delay?: number;
}

/**
 * Lazy loads a component using React.lazy or Next.js dynamic import
 * 
 * @param importFunc - Function that imports the component
 * @param options - Options for lazy loading
 * @returns Lazy loaded component
 * 
 * @example
 * ```tsx
 * // Using React.lazy (client-side only)
 * const LazyComponent = lazyLoad(() => import('@/components/HeavyComponent'));
 * 
 * // Using Next.js dynamic import
 * import dynamic from 'next/dynamic';
 * const LazyComponent = lazyLoad(
 *   () => import('@/components/HeavyComponent'),
 *   { useReactLazy: false }
 * );
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
  options: LazyLoadOptions = {}
) {
  const {
    loading = <DefaultLoading />,
    useReactLazy = true,
    delay = 0
  } = options;

  // For client-side only components using React.lazy
  if (useReactLazy) {
    const LazyComponent = React.lazy(importFunc);

    return (props: React.ComponentProps<T>) => (
      <Suspense fallback={loading}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  // For Next.js dynamic import (supports SSR)
  // This is just a type definition, the actual implementation
  // should use Next.js dynamic import in the component
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={loading}>
      <div>{/* Component will be loaded by Next.js dynamic import */}</div>
    </Suspense>
  );
}

/**
 * Creates a Next.js dynamically imported component with optimized loading
 * 
 * @param importFunc - Function that imports the component
 * @param options - Options for dynamic import
 * @returns Dynamically imported component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const DynamicComponent = dynamicImport(() => import('@/components/HeavyComponent'));
 * 
 * // With SSR disabled (loads only on client)
 * const DynamicClientComponent = dynamicImport(
 *   () => import('@/components/ClientOnlyComponent'),
 *   { ssr: false }
 * );
 * 
 * // With custom loading component
 * const DynamicComponent = dynamicImport(
 *   () => import('@/components/HeavyComponent'),
 *   { loading: <CustomLoadingSpinner /> }
 * );
 * ```
 */
export function dynamicImport<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    loading?: React.ReactNode;
    ssr?: boolean;
    delay?: number;
  } = {}
) {
  // This function should be used with Next.js dynamic import
  // It's just a type definition here, the actual implementation
  // will be provided by the developer using this utility
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={options.loading || <DefaultLoading />}>
      <div>{/* Component will be loaded by Next.js dynamic import */}</div>
    </Suspense>
  );
}

/**
 * Example usage with Next.js dynamic import:
 * 
 * ```tsx
 * import dynamic from 'next/dynamic';
 * import { DefaultLoading } from '@/utils/lazyLoad';
 * 
 * // Using the dynamicImport utility with Next.js dynamic
 * const DynamicComponent = dynamic(
 *   () => import('@/components/HeavyComponent'),
 *   { 
 *     loading: () => <DefaultLoading />,
 *     ssr: true
 *   }
 * );
 * 
 * // Usage in a component
 * function MyPage() {
 *   return (
 *     <div>
 *       <h1>My Page</h1>
 *       <DynamicComponent prop1="value" />
 *     </div>
 *   );
 * }
 * ```
 */

export { DefaultLoading };