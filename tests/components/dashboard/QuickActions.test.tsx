import { QuickActions } from '@/components/dashboard/QuickActions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarChart, Calendar, Plus, ShoppingBag, Ticket } from 'lucide-react';

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />;

const createMockActions = (count: number = 3) => {
  const actions = [
    {
      name: 'Browse Events',
      href: '/events',
      icon: Calendar,
    },
    {
      name: 'My Tickets',
      href: '/tickets',
      icon: Ticket,
      badge: 'New',
    },
    {
      name: 'My Orders',
      href: '/orders',
      icon: ShoppingBag,
      count: 5,
    },
    {
      name: 'Create Event',
      href: '/events/create',
      icon: Plus,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart,
      count: 12,
    },
  ];
  
  return actions.slice(0, count);
};

describe('QuickActions Component', () => {
  describe('Rendering', () => {
    it('should render quick actions with heading', () => {
      const actions = createMockActions(3);
      render(<QuickActions actions={actions} />);
      
      const heading = screen.getByRole('heading', { name: /actions rapides/i });
      expect(heading).toBeInTheDocument();
    });

    it('should render all provided actions', () => {
      const actions = createMockActions(3);
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('Browse Events')).toBeInTheDocument();
      expect(screen.getByText('My Tickets')).toBeInTheDocument();
      expect(screen.getByText('My Orders')).toBeInTheDocument();
    });

    it('should render nothing when actions array is empty', () => {
      const { container } = render(<QuickActions actions={[]} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when actions is undefined', () => {
      const { container } = render(<QuickActions actions={undefined as any} />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Action Links', () => {
    it('should render actions as links with correct href', () => {
      const actions = createMockActions(2);
      render(<QuickActions actions={actions} />);
      
      const browseLink = screen.getByRole('link', { name: /browse events/i });
      expect(browseLink).toHaveAttribute('href', '/events');
      
      const ticketsLink = screen.getByRole('link', { name: /my tickets/i });
      expect(ticketsLink).toHaveAttribute('href', '/tickets');
    });

    it('should have proper link styling', () => {
      const actions = createMockActions(1);
      render(<QuickActions actions={actions} />);
      
      const link = screen.getByRole('link');
      expect(link.className).toContain('hover:bg-gray-50');
      expect(link.className).toContain('border');
    });
  });

  describe('Icons', () => {
    it('should display icons for each action', () => {
      const actions = createMockActions(3);
      const { container } = render(<QuickActions actions={actions} />);
      
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render icon with proper styling', () => {
      const actions = createMockActions(1);
      const { container } = render(<QuickActions actions={actions} />);
      
      const iconContainer = container.querySelector('.flex-shrink-0');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('should display badge when provided', () => {
      const actions = [
        {
          name: 'My Tickets',
          href: '/tickets',
          icon: Ticket,
          badge: 'New',
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should not display badge when not provided', () => {
      const actions = [
        {
          name: 'Browse Events',
          href: '/events',
          icon: Calendar,
        },
      ];
      const { container } = render(<QuickActions actions={actions} />);
      
      const badge = container.querySelector('.bg-blue-100');
      expect(badge).toBeNull();
    });

    it('should style badge correctly', () => {
      const actions = [
        {
          name: 'My Tickets',
          href: '/tickets',
          icon: Ticket,
          badge: 'New',
        },
      ];
      render(<QuickActions actions={actions} />);
      
      const badge = screen.getByText('New');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-800');
    });
  });

  describe('Count Display', () => {
    it('should display count when provided', () => {
      const actions = [
        {
          name: 'My Orders',
          href: '/orders',
          icon: ShoppingBag,
          count: 5,
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display "99+" for counts over 99', () => {
      const actions = [
        {
          name: 'My Orders',
          href: '/orders',
          icon: ShoppingBag,
          count: 150,
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not display count when not provided', () => {
      const actions = [
        {
          name: 'Browse Events',
          href: '/events',
          icon: Calendar,
        },
      ];
      const { container } = render(<QuickActions actions={actions} />);
      
      const countBadge = container.querySelector('.bg-blue-100.rounded-full');
      expect(countBadge).toBeNull();
    });

    it('should display count 0 correctly', () => {
      const actions = [
        {
          name: 'My Orders',
          href: '/orders',
          icon: ShoppingBag,
          count: 0,
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render actions in a grid', () => {
      const actions = createMockActions(3);
      const { container } = render(<QuickActions actions={actions} />);
      
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have responsive grid classes', () => {
      const actions = createMockActions(3);
      const { container } = render(<QuickActions actions={actions} />);
      
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('sm:grid-cols-2');
      expect(grid?.className).toContain('lg:grid-cols-3');
    });

    it('should have proper spacing', () => {
      const actions = createMockActions(3);
      const { container } = render(<QuickActions actions={actions} />);
      
      const wrapper = container.querySelector('.bg-white');
      expect(wrapper?.className).toContain('p-6');
    });
  });

  describe('Styling', () => {
    it('should have card styling on wrapper', () => {
      const actions = createMockActions(1);
      const { container } = render(<QuickActions actions={actions} />);
      
      const wrapper = container.querySelector('.bg-white');
      expect(wrapper?.className).toContain('rounded-lg');
      expect(wrapper?.className).toContain('shadow-sm');
      expect(wrapper?.className).toContain('border');
    });

    it('should have hover effects on links', () => {
      const actions = createMockActions(1);
      render(<QuickActions actions={actions} />);
      
      const link = screen.getByRole('link');
      expect(link.className).toContain('hover:bg-gray-50');
      expect(link.className).toContain('hover:border-gray-300');
    });

    it('should have transition effects', () => {
      const actions = createMockActions(1);
      render(<QuickActions actions={actions} />);
      
      const link = screen.getByRole('link');
      expect(link.className).toContain('transition-colors');
    });
  });

  describe('Accessibility', () => {
    it('should render links that are keyboard accessible', async () => {
      const actions = createMockActions(2);
      render(<QuickActions actions={actions} />);
      
      const links = screen.getAllByRole('link');
      links[0].focus();
      
      expect(links[0]).toHaveFocus();
    });

    it('should support keyboard navigation', async () => {
      const actions = createMockActions(2);
      render(<QuickActions actions={actions} />);
      
      const links = screen.getAllByRole('link');
      
      await userEvent.tab();
      expect(links[0]).toHaveFocus();
      
      await userEvent.tab();
      expect(links[1]).toHaveFocus();
    });

    it('should have proper heading hierarchy', () => {
      const actions = createMockActions(1);
      render(<QuickActions actions={actions} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive link text', () => {
      const actions = createMockActions(3);
      render(<QuickActions actions={actions} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toBeTruthy();
      });
    });
  });

  describe('Arrow Icon', () => {
    it('should display arrow icon for each action', () => {
      const actions = createMockActions(2);
      const { container } = render(<QuickActions actions={actions} />);
      
      const arrows = container.querySelectorAll('path[d*="M9 5l7 7-7 7"]');
      expect(arrows.length).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should render quickly with multiple actions', () => {
      const actions = createMockActions(5);
      const startTime = performance.now();
      render(<QuickActions actions={actions} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause unnecessary re-renders', () => {
      const actions = createMockActions(2);
      const { rerender } = render(<QuickActions actions={actions} />);
      
      const firstLinkText = screen.getAllByRole('link')[0].textContent;
      
      rerender(<QuickActions actions={actions} />);
      expect(screen.getAllByRole('link')[0].textContent).toBe(firstLinkText);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single action', () => {
      const actions = createMockActions(1);
      render(<QuickActions actions={actions} />);
      
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('should handle many actions', () => {
      const actions = createMockActions(5);
      render(<QuickActions actions={actions} />);
      
      expect(screen.getAllByRole('link')).toHaveLength(5);
    });

    it('should handle action without badge and count', () => {
      const actions = [
        {
          name: 'Simple Action',
          href: '/simple',
          icon: Calendar,
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('Simple Action')).toBeInTheDocument();
    });

    it('should handle action with both badge and count', () => {
      const actions = [
        {
          name: 'Complex Action',
          href: '/complex',
          icon: Ticket,
          badge: 'New',
          count: 5,
        },
      ];
      render(<QuickActions actions={actions} />);
      
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with actual navigation', () => {
      const actions = createMockActions(2);
      render(<QuickActions actions={actions} />);
      
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/events');
      expect(links[1]).toHaveAttribute('href', '/tickets');
    });

    it('should integrate within a dashboard layout', () => {
      const actions = createMockActions(3);
      const { container } = render(<QuickActions actions={actions} />);
      
      expect(container.firstChild).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('bg-white');
    });
  });
});
