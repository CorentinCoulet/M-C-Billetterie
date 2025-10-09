import { Badge } from '@/components/ui/badge';
import { render, screen } from '@testing-library/react';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>);
      
      const badge = screen.getByText('New');
      expect(badge).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('rounded-md');
      expect(badge.className).toContain('px-2');
    });

    it('should accept custom className', () => {
      render(
        <Badge className="custom-badge" data-testid="badge">
          Custom
        </Badge>
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('custom-badge');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-primary');
      expect(badge.className).toContain('text-primary-foreground');
    });

    it('should render secondary variant', () => {
      render(
        <Badge variant="secondary" data-testid="badge">
          Secondary
        </Badge>
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-secondary');
      expect(badge.className).toContain('text-secondary-foreground');
    });

    it('should render destructive variant', () => {
      render(
        <Badge variant="destructive" data-testid="badge">
          Error
        </Badge>
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-destructive');
      expect(badge.className).toContain('text-white');
    });

    it('should render outline variant', () => {
      render(
        <Badge variant="outline" data-testid="badge">
          Outline
        </Badge>
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('border');
      expect(badge.className).toContain('text-foreground');
    });
  });

  describe('Content Types', () => {
    it('should render with text content', () => {
      render(<Badge>Text Badge</Badge>);
      
      const badge = screen.getByText('Text Badge');
      expect(badge).toBeTruthy();
    });

    it('should render with number content', () => {
      render(<Badge>42</Badge>);
      
      const badge = screen.getByText('42');
      expect(badge).toBeTruthy();
    });

    it('should render with icon and text', () => {
      render(
        <Badge>
          <span>★</span>
          <span>Featured</span>
        </Badge>
      );
      
      const badge = screen.getByText('Featured');
      expect(badge.parentElement?.textContent).toContain('★');
    });

    it('should render empty badge', () => {
      render(<Badge data-testid="badge" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('');
    });
  });

  describe('Use Cases', () => {
    it('should render status badge', () => {
      render(<Badge variant="secondary">Active</Badge>);
      
      const badge = screen.getByText('Active');
      expect(badge).toBeTruthy();
    });

    it('should render count badge', () => {
      render(<Badge variant="destructive">99+</Badge>);
      
      const badge = screen.getByText('99+');
      expect(badge).toBeTruthy();
    });

    it('should render category badge', () => {
      render(<Badge variant="outline">Music</Badge>);
      
      const badge = screen.getByText('Music');
      expect(badge).toBeTruthy();
    });

    it('should render notification badge', () => {
      render(
        <Badge variant="destructive" className="absolute -top-1 -right-1">
          3
        </Badge>
      );
      
      const badge = screen.getByText('3');
      expect(badge.className).toContain('absolute');
    });
  });

  describe('Multiple Badges', () => {
    it('should render multiple badges together', () => {
      render(
        <div>
          <Badge>Badge 1</Badge>
          <Badge variant="secondary">Badge 2</Badge>
          <Badge variant="destructive">Badge 3</Badge>
        </div>
      );
      
      expect(screen.getByText('Badge 1')).toBeTruthy();
      expect(screen.getByText('Badge 2')).toBeTruthy();
      expect(screen.getByText('Badge 3')).toBeTruthy();
    });

    it('should render badge group with spacing', () => {
      render(
        <div className="flex gap-2">
          <Badge>Tag 1</Badge>
          <Badge>Tag 2</Badge>
          <Badge>Tag 3</Badge>
        </div>
      );
      
      const badges = screen.getAllByText(/Tag \d/);
      expect(badges).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should be semantically correct', () => {
      render(<Badge>Label</Badge>);
      
      const badge = screen.getByText('Label');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should support aria-label', () => {
      render(<Badge aria-label="Unread messages">5</Badge>);
      
      const badge = screen.getByLabelText('Unread messages');
      expect(badge).toBeTruthy();
    });

    it('should be readable by screen readers', () => {
      render(
        <Badge role="status" aria-live="polite">
          New notification
        </Badge>
      );
      
      const badge = screen.getByRole('status');
      expect(badge.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Styling', () => {
    it('should have consistent height', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('py-0.5');
    });

    it('should have rounded corners', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('rounded-md');
    });

    it('should have proper text size', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('text-xs');
    });

    it('should be inline element', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'This is a very long badge text that might wrap';
      render(<Badge>{longText}</Badge>);
      
      const badge = screen.getByText(longText);
      expect(badge).toBeTruthy();
    });

    it('should handle special characters', () => {
      render(<Badge>★ VIP ★</Badge>);
      
      const badge = screen.getByText('★ VIP ★');
      expect(badge).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      render(<Badge>🔥 Hot</Badge>);
      
      const badge = screen.getByText('🔥 Hot');
      expect(badge).toBeTruthy();
    });

    it('should handle zero value', () => {
      render(<Badge>0</Badge>);
      
      const badge = screen.getByText('0');
      expect(badge).toBeTruthy();
    });

    it('should handle negative numbers', () => {
      render(<Badge>-5</Badge>);
      
      const badge = screen.getByText('-5');
      expect(badge).toBeTruthy();
    });
  });

  describe('Composition', () => {
    it('should work inside buttons', () => {
      render(
        <button>
          Messages <Badge variant="destructive">5</Badge>
        </button>
      );
      
      const badge = screen.getByText('5');
      const button = screen.getByRole('button');
      expect(button.contains(badge)).toBe(true);
    });

    it('should work with other components', () => {
      render(
        <div>
          <span>Status:</span>
          <Badge variant="secondary">Online</Badge>
        </div>
      );
      
      expect(screen.getByText('Status:')).toBeTruthy();
      expect(screen.getByText('Online')).toBeTruthy();
    });
  });
});
