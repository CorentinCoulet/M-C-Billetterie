import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define container variants using class-variance-authority
const containerVariants = cva(
  // Base styles applied to all containers
  'mx-auto px-4 w-full',
  {
    variants: {
      // Different max-width options
      size: {
        sm: 'max-w-screen-sm', // 640px
        md: 'max-w-screen-md', // 768px
        lg: 'max-w-screen-lg', // 1024px
        xl: 'max-w-screen-xl', // 1280px
        '2xl': 'max-w-screen-2xl', // 1536px
        full: 'max-w-full', // No max width
      },
      // Different padding options
      padding: {
        none: 'px-0',
        sm: 'px-2',
        md: 'px-4',
        lg: 'px-6',
        xl: 'px-8',
      },
      // Responsive padding options (different padding at different breakpoints)
      responsivePadding: {
        true: 'sm:px-4 md:px-6 lg:px-8',
        false: '',
      },
      // Center content vertically
      centerY: {
        true: 'flex flex-col justify-center',
        false: '',
      },
    },
    // Default values
    defaultVariants: {
      size: 'lg',
      padding: 'md',
      responsivePadding: true,
      centerY: false,
    },
  }
);

// Props interface for the Container component
export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  /**
   * Whether to apply a max height of 100vh
   */
  fullHeight?: boolean;
  /**
   * Whether to apply a min-height
   */
  minHeight?: string;
}

/**
 * Container component for creating responsive, centered layouts
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Container>
 *   <h1>Page Content</h1>
 *   <p>This content will be centered and have a max width</p>
 * </Container>
 * 
 * // Full width container with custom padding
 * <Container size="full" padding="lg">
 *   <div>Wide content</div>
 * </Container>
 * 
 * // Container with vertical centering and full height
 * <Container centerY fullHeight>
 *   <div>Vertically centered content</div>
 * </Container>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      size,
      padding,
      responsivePadding,
      centerY,
      fullHeight,
      minHeight,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          containerVariants({ size, padding, responsivePadding, centerY }),
          fullHeight && 'h-screen',
          minHeight && `min-h-[${minHeight}]`,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

export { Container, containerVariants };