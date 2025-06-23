import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define grid variants using class-variance-authority
const gridVariants = cva(
  // Base styles applied to all grids
  'grid w-full',
  {
    variants: {
      // Different column counts for different breakpoints (mobile-first)
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
        12: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12',
        none: 'grid-cols-none', // For manual column specification
      },
      // Different gap sizes
      gap: {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
      },
      // Different row gap sizes (if different from column gap)
      rowGap: {
        none: 'row-gap-0',
        xs: 'row-gap-1',
        sm: 'row-gap-2',
        md: 'row-gap-4',
        lg: 'row-gap-6',
        xl: 'row-gap-8',
      },
      // Different column gap sizes (if different from row gap)
      colGap: {
        none: 'col-gap-0',
        xs: 'col-gap-1',
        sm: 'col-gap-2',
        md: 'col-gap-4',
        lg: 'col-gap-6',
        xl: 'col-gap-8',
      },
      // Alignment options
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
      },
      // Justify options
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
    },
    // Default values
    defaultVariants: {
      cols: 3,
      gap: 'md',
      align: 'stretch',
      justify: 'start',
    },
  }
);

// Props interface for the Grid component
export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  /**
   * Custom grid template columns
   */
  gridTemplateColumns?: string;
  /**
   * Custom grid template rows
   */
  gridTemplateRows?: string;
  /**
   * Custom grid template areas
   */
  gridTemplateAreas?: string;
}

/**
 * Grid component for creating responsive grid layouts
 * 
 * @example
 * ```tsx
 * // Basic usage with 3 columns on desktop, 2 on tablet, 1 on mobile
 * <Grid cols={3} gap="md">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 *   <div>Item 4</div>
 * </Grid>
 * 
 * // Custom grid template
 * <Grid 
 *   cols="none" 
 *   gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))"
 *   gap="lg"
 * >
 *   <div>Auto-filling grid item</div>
 *   <div>Auto-filling grid item</div>
 *   <div>Auto-filling grid item</div>
 * </Grid>
 * ```
 */
const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols,
      gap,
      rowGap,
      colGap,
      align,
      justify,
      gridTemplateColumns,
      gridTemplateRows,
      gridTemplateAreas,
      style = {},
      ...props
    },
    ref
  ) => {
    // Merge custom grid properties with style
    const gridStyle = {
      ...style,
      ...(gridTemplateColumns && { gridTemplateColumns }),
      ...(gridTemplateRows && { gridTemplateRows }),
      ...(gridTemplateAreas && { gridTemplateAreas }),
    };

    return (
      <div
        className={cn(gridVariants({ cols, gap, rowGap, colGap, align, justify }), className)}
        ref={ref}
        style={gridStyle}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

// Grid Item component for individual grid cells
interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns this item should span
   */
  colSpan?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  /**
   * Number of rows this item should span
   */
  rowSpan?: number;
  /**
   * Column start position
   */
  colStart?: number;
  /**
   * Row start position
   */
  rowStart?: number;
}

/**
 * GridItem component for controlling individual grid cell behavior
 * 
 * @example
 * ```tsx
 * <Grid cols={4}>
 *   <GridItem colSpan={2}>Spans 2 columns</GridItem>
 *   <GridItem>Regular item</GridItem>
 *   <GridItem colSpan={{ sm: 1, md: 2, lg: 3 }}>Responsive span</GridItem>
 * </Grid>
 * ```
 */
const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  (
    { className, colSpan, rowSpan, colStart, rowStart, style = {}, ...props },
    ref
  ) => {
    // Generate responsive column span classes
    const getColSpanClasses = () => {
      if (!colSpan) return '';
      
      if (typeof colSpan === 'number') {
        return `col-span-${colSpan}`;
      }
      
      return Object.entries(colSpan)
        .map(([breakpoint, span]) => {
          if (breakpoint === 'sm') return `sm:col-span-${span}`;
          if (breakpoint === 'md') return `md:col-span-${span}`;
          if (breakpoint === 'lg') return `lg:col-span-${span}`;
          if (breakpoint === 'xl') return `xl:col-span-${span}`;
          return '';
        })
        .filter(Boolean)
        .join(' ');
    };

    // Merge grid item properties with style
    const gridItemStyle = {
      ...style,
      ...(rowSpan && { gridRow: `span ${rowSpan} / span ${rowSpan}` }),
      ...(colStart && { gridColumnStart: colStart }),
      ...(rowStart && { gridRowStart: rowStart }),
    };

    return (
      <div
        className={cn(
          typeof colSpan === 'number' && `col-span-${colSpan}`,
          typeof colSpan === 'object' && getColSpanClasses(),
          className
        )}
        ref={ref}
        style={gridItemStyle}
        {...props}
      />
    );
  }
);

GridItem.displayName = 'GridItem';

export { Grid, GridItem, gridVariants };