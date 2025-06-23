import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define card variants using class-variance-authority
const cardVariants = cva(
  // Base styles applied to all cards
  'rounded-lg border bg-white shadow-sm',
  {
    variants: {
      // Different visual variants
      variant: {
        default: 'border-gray-200',
        outline: 'border-gray-300 shadow-none',
        ghost: 'border-transparent shadow-none bg-transparent',
      },
      // Different padding options
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      // Different width options
      width: {
        auto: 'w-auto',
        full: 'w-full',
      },
    },
    // Default values
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      width: 'full',
    },
  }
);

// Props interface for the Card component
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Whether to apply hover effects to the card
   */
  hoverable?: boolean;
}

/**
 * Card component for containing content in a boxed layout
 * 
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Main content goes here
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, width, hoverable, ...props }, ref) => {
    return (
      <div
        className={cn(
          cardVariants({ variant, padding, width }),
          hoverable && 'transition-shadow hover:shadow-md',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

// Card Header component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-4', className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

// Card Title component
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold text-gray-900', className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = 'CardTitle';

// Card Description component
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-500', className)}
        {...props}
      />
    );
  }
);
CardDescription.displayName = 'CardDescription';

// Card Content component
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-4 pt-0', className)}
        {...props}
      />
    );
  }
);
CardContent.displayName = 'CardContent';

// Card Footer component
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center p-4 pt-0', className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};