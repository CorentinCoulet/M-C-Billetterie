import { Button } from '@/components/ui/button';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeTruthy();
    });

    it('should apply default variant and size', () => {
      render(<Button>Default Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
      expect(button.className).toContain('h-9');
    });

    it('should render with custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });

  describe('Variants', () => {
    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('bg-background');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-primary');
      expect(button.className).toContain('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-8');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
    });

    it('should render icon size', () => {
      render(<Button size="icon" aria-label="icon-button">⚡</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('size-9');
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should render disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('should have pointer-events-none when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:pointer-events-none');
    });
  });

  describe('With Icon', () => {
    it('should render button with icon', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          Button with Icon
        </Button>
      );
      
      expect(screen.getByTestId('icon')).toBeTruthy();
      expect(screen.getByText('Button with Icon')).toBeTruthy();
    });
  });

  describe('As Child (Slot)', () => {
    it('should render as child component', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/test');
      expect(link.textContent).toBe('Link Button');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(
        <Button aria-label="Submit form" type="submit">
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /submit/i });
      expect(button.getAttribute('type')).toBe('submit');
      expect(button.getAttribute('aria-label')).toBe('Submit form');
    });

    it('should be focusable', () => {
      render(<Button>Focus me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });

    it('should have focus-visible styles', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-ring/50');
    });
  });

  describe('Custom Props', () => {
    it('should forward additional props', () => {
      render(
        <Button data-testid="custom-button" id="btn-1">
          Custom Props
        </Button>
      );
      
      const button = screen.getByTestId('custom-button');
      expect(button.getAttribute('id')).toBe('btn-1');
    });

    it('should support type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('submit');
    });
  });
});
