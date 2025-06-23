# M&C Society Design System

This design system provides a collection of reusable UI components, layout utilities, and design tokens for the M&C Society Billetterie application.

## Features

- **Reusable Components**: A library of consistent, accessible UI components
- **Mobile-First Design**: All components are designed with a mobile-first approach
- **Accessibility**: Components follow WCAG 2.1 AA standards
- **Performance Optimized**: Leverages Next.js features for optimal performance
- **TypeScript Support**: Fully typed components and utilities

## Directory Structure

```
src/components/ui/
├── core/               # Core UI components
│   ├── Button.tsx      # Button component
│   ├── Input.tsx       # Input component
│   ├── Card.tsx        # Card component
│   └── Image.tsx       # Optimized image component
├── layout/             # Layout components
│   ├── Container.tsx   # Container component
│   └── Grid.tsx        # Grid system
├── theme.ts            # Design tokens and theme configuration
├── index.ts            # Exports all components
└── README.md           # Documentation
```

## Usage

### Importing Components

You can import components either from the main entry point or directly from their files:

```tsx
// Import from main entry point
import { Button, Input, Card } from '@/components/ui';

// Or import directly
import { Button } from '@/components/ui/core/Button';
```

### Using the Theme

The design system includes a theme with design tokens for colors, typography, spacing, etc.

```tsx
import { theme } from '@/components/ui';

// Access theme values
console.log(theme.colors.primary[500]); // Primary brand color
console.log(theme.spacing[4]); // 1rem (16px)
```

### Examples

#### Button Component

```tsx
<Button variant="primary" size="md">
  Click me
</Button>

<Button 
  variant="outline" 
  startIcon={<Icon name="plus" />}
  isLoading={isSubmitting}
  loadingText="Saving..."
>
  Add new
</Button>
```

#### Input Component

```tsx
<Input 
  label="Email"
  placeholder="Enter your email"
  type="email"
  helperText="We'll never share your email with anyone else."
/>

<Input 
  label="Password"
  type="password"
  variant="error"
  errorMessage="Password must be at least 8 characters"
/>
```

#### Card Component

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Layout Components

```tsx
<Container size="lg">
  <Grid cols={3} gap="md">
    <GridItem>Item 1</GridItem>
    <GridItem colSpan={2}>Item 2 (spans 2 columns)</GridItem>
    <GridItem>Item 3</GridItem>
  </Grid>
</Container>
```

## Performance Optimizations

### Optimized Image Component

The `Image` component extends Next.js's Image component with additional features:

```tsx
<Image
  src="/images/product.jpg"
  alt="Product image"
  width={500}
  height={300}
  aspectRatio="16:9"
  rounded="md"
  skeleton
/>
```

### Lazy Loading Components

Use the `lazyLoad` utility to lazy load components:

```tsx
import { lazyLoad } from '@/utils/lazyLoad';

const LazyComponent = lazyLoad(() => import('@/components/HeavyComponent'));

// In your component
function MyPage() {
  return (
    <div>
      <LazyComponent prop1="value" />
    </div>
  );
}
```

## Responsive Design

All components follow a mobile-first approach. The Grid component especially helps with responsive layouts:

```tsx
<Grid cols={4} gap="md">
  {/* 
    This will create:
    - 1 column on mobile
    - 2 columns on small screens (sm)
    - 4 columns on large screens (lg)
  */}
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
  <GridItem>Item 4</GridItem>
</Grid>
```

## Accessibility

Components are designed with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Screen reader friendly

## Contributing

When adding new components to the design system:

1. Follow the established patterns and naming conventions
2. Ensure components are fully typed with TypeScript
3. Add comprehensive JSDoc documentation with examples
4. Implement proper accessibility features
5. Test on different screen sizes for responsive behavior