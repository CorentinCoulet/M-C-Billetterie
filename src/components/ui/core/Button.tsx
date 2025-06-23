import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles applied to all buttons
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      // Different visual variants
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100 text-gray-700',
        ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700',
        link: 'bg-transparent underline-offset-4 hover:underline text-primary-500 hover:text-primary-600',
        danger: 'bg-error text-white hover:bg-red-600 active:bg-red-700',
      },
      // Different size options
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10', // For icon-only buttons
      },
      // Full width option
      fullWidth: {
        true: 'w-full',
      },
    },
    // Default values
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// Props interface extending the HTML button element props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Optional icon to display before the button text
   */
  startIcon?: React.ReactNode;
  /**
   * Optional icon to display after the button text
   */
  endIcon?: React.ReactNode;
  /**
   * If true, shows a loading spinner and disables the button
   */
  isLoading?: boolean;
  /**
   * Text to show when button is in loading state
   */
  loadingText?: string;
}

/**
 * Button component with multiple variants and sizes
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 * 
 * <Button 
 *   variant="outline" 
 *   startIcon={<Icon name="plus" />}
 *   isLoading={isSubmitting}
 *   loadingText="Saving..."
 * >
 *   Add new
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      startIcon,
      endIcon,
      isLoading = false,
      loadingText,
      children,
      ...props
    },
    ref
  ) => {
    // Determine what to display as content based on loading state
    const content = isLoading ? (
      <>
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {loadingText || children}
      </>
    ) : (
      <>
        {startIcon && <span className="mr-2">{startIcon}</span>}
        {children}
        {endIcon && <span className="ml-2">{endIcon}</span>}
      </>
    );

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };