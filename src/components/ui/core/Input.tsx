import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define input variants using class-variance-authority
const inputVariants = cva(
  // Base styles applied to all inputs
  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      // Different visual variants
      variant: {
        default: 'border-gray-300',
        error: 'border-error focus-visible:ring-error',
        success: 'border-success focus-visible:ring-success',
      },
      // Different size options
      size: {
        sm: 'h-8 text-xs px-2',
        md: 'h-10',
        lg: 'h-12 text-lg px-4',
      },
    },
    // Default values
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Props interface extending the HTML input element props
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label for the input
   */
  label?: string;
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  /**
   * Error message to display below the input
   */
  errorMessage?: string;
  /**
   * Optional icon to display at the start of the input
   */
  startIcon?: React.ReactNode;
  /**
   * Optional icon to display at the end of the input
   */
  endIcon?: React.ReactNode;
  /**
   * Whether the input is full width
   */
  fullWidth?: boolean;
}

/**
 * Input component with multiple variants and sizes
 * 
 * @example
 * ```tsx
 * <Input 
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 *   helperText="We'll never share your email with anyone else."
 * />
 * 
 * <Input 
 *   label="Password"
 *   type="password"
 *   variant="error"
 *   errorMessage="Password must be at least 8 characters"
 *   endIcon={<EyeIcon />}
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      errorMessage,
      startIcon,
      endIcon,
      fullWidth = false,
      id,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if none is provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    
    // Determine the variant based on error state
    const computedVariant = errorMessage ? 'error' : variant;
    
    return (
      <div className={cn('space-y-1', fullWidth ? 'w-full' : 'max-w-sm')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {startIcon}
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              inputVariants({ variant: computedVariant, size }),
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!errorMessage}
            aria-describedby={
              errorMessage
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-description`
                : undefined
            }
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {endIcon}
            </div>
          )}
        </div>
        {helperText && !errorMessage && (
          <p
            id={`${inputId}-description`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
        {errorMessage && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };