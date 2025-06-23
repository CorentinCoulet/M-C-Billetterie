import React from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';
import { cn } from '@/utils/cn';

// Props interface extending Next.js Image props
export interface ImageProps extends Omit<NextImageProps, 'alt'> {
  /**
   * Alternative text for the image (required for accessibility)
   */
  alt: string;
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Whether to apply a rounded style to the image
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /**
   * Whether to apply an aspect ratio to the image container
   */
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9';
  /**
   * Whether to apply a hover zoom effect
   */
  hoverZoom?: boolean;
  /**
   * Whether to apply a skeleton loading effect
   */
  skeleton?: boolean;
  /**
   * Whether to apply object-fit: cover
   */
  cover?: boolean;
  /**
   * Whether to apply object-fit: contain
   */
  contain?: boolean;
}

/**
 * Optimized image component built on top of Next.js Image
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Image
 *   src="/images/product.jpg"
 *   alt="Product image"
 *   width={500}
 *   height={300}
 * />
 * 
 * // With aspect ratio and rounded corners
 * <Image
 *   src="/images/profile.jpg"
 *   alt="Profile picture"
 *   width={200}
 *   height={200}
 *   aspectRatio="1:1"
 *   rounded="full"
 *   cover
 * />
 * 
 * // With hover zoom effect
 * <Image
 *   src="/images/product.jpg"
 *   alt="Product image"
 *   width={500}
 *   height={300}
 *   hoverZoom
 *   rounded="md"
 * />
 * ```
 */
const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      alt,
      className,
      rounded = 'none',
      aspectRatio,
      hoverZoom = false,
      skeleton = false,
      cover = false,
      contain = false,
      ...props
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = React.useState(true);

    // Map rounded values to Tailwind classes
    const roundedClasses = {
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    };

    // Map aspect ratio values to Tailwind classes
    const aspectRatioClasses = {
      '1:1': 'aspect-square',
      '4:3': 'aspect-[4/3]',
      '16:9': 'aspect-[16/9]',
      '21:9': 'aspect-[21/9]',
    };

    return (
      <div
        className={cn(
          'relative overflow-hidden',
          aspectRatio && aspectRatioClasses[aspectRatio],
          rounded && roundedClasses[rounded],
          hoverZoom && 'group',
          className
        )}
      >
        {skeleton && isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <NextImage
          ref={ref}
          alt={alt}
          className={cn(
            'transition-all duration-300',
            cover && 'object-cover',
            contain && 'object-contain',
            hoverZoom && 'group-hover:scale-110',
            isLoading && skeleton ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={() => setIsLoading(false)}
          {...props}
        />
      </div>
    );
  }
);

Image.displayName = 'Image';

export { Image };