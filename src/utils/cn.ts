import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function that merges multiple class names together and
 * resolves Tailwind CSS class conflicts using tailwind-merge.
 * 
 * @param inputs - Class names or conditional class objects
 * @returns Merged class string with resolved Tailwind conflicts
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <div className={cn('text-red-500', 'bg-blue-500')}>
 *   Red text on blue background
 * </div>
 * 
 * // With conditions
 * <div className={cn(
 *   'text-sm',
 *   isLarge && 'text-lg',
 *   isActive && 'bg-blue-500'
 * )}>
 *   Conditional classes
 * </div>
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}