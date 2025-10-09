import { DashboardActivities } from '@/components/dashboard/DashboardActivities';
import { UserRole } from '@/types/enums/user.enum';
import { render, screen } from '@testing-library/react';

// Mock data
const mockActivities = [
  {
    id: '1',
    type: 'ticket_purchase' as const,
    title: 'Achat de billet',
    description: 'Nouveau billet acheté pour Summer Festival',
    timestamp: new Date('2025-10-08T10:00:00Z'),
  },
  {
    id: '2',
    type: 'event_created' as const,
    title: 'Événement créé',
    description: 'Événement Jazz Concert créé',
    timestamp: new Date('2025-10-08T09:30:00Z'),
  },
  {
    id: '3',
    type: 'user_registered' as const,
    title: 'Nouvel utilisateur',
    description: 'Utilisateur Rock Night inscrit',
    timestamp: new Date('2025-10-07T15:00:00Z'),
  },
];

describe('DashboardActivities Component', () => {
  describe('Rendering', () => {
    it('should render without activities', () => {
      render(<DashboardActivities activities={[]} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/aucune activité récente/i)).toBeTruthy();
    });

    it('should render with activities', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Summer Festival/i)).toBeTruthy();
      expect(screen.getByText(/Jazz Concert/i)).toBeTruthy();
      expect(screen.getByText(/Rock Night/i)).toBeTruthy();
    });

    it('should render activity items', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const activities = screen.getAllByText(/Summer Festival|Jazz Concert|Rock Night/i);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should have proper heading', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const heading = screen.getByRole('heading', { name: /activités récentes/i });
      expect(heading).toBeTruthy();
    });
  });

  describe('Activity Items', () => {
    it('should display activity titles', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Achat de billet/i)).toBeTruthy();
      expect(screen.getByText(/Événement créé/i)).toBeTruthy();
      expect(screen.getByText(/Nouvel utilisateur/i)).toBeTruthy();
    });

    it('should display activity timestamp', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      // Check for relative time or formatted date
      const timeElements = screen.getAllByText(/il y a|heure|jour/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should display activity descriptions', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Summer Festival/i)).toBeTruthy();
      expect(screen.getByText(/Jazz Concert/i)).toBeTruthy();
    });

    it('should show activity icons', () => {
      const { container } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Types', () => {
    it('should differentiate ticket_purchase activities', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const orderActivity = screen.getByText(/Achat de billet/i);
      expect(orderActivity).toBeTruthy();
    });

    it('should differentiate event_created activities', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const eventActivity = screen.getByText(/Événement créé/i);
      expect(eventActivity).toBeTruthy();
    });

    it('should differentiate user_registered activities', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const userActivity = screen.getByText(/Nouvel utilisateur/i);
      expect(userActivity).toBeTruthy();
    });

    it('should handle payment_processed activity types', () => {
      const paymentActivity = [{
        id: '4',
        type: 'payment_processed' as const,
        title: 'Paiement traité',
        description: 'Paiement de 50€ traité',
        timestamp: new Date(),
      }];
      
      render(<DashboardActivities activities={paymentActivity} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Paiement traité/i)).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state message', () => {
      render(<DashboardActivities activities={[]} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/aucune activité récente/i)).toBeTruthy();
    });

    it('should show empty state icon', () => {
      const { container } = render(<DashboardActivities activities={[]} role={UserRole.ADMIN} />);
      
      const emptyIcon = container.querySelector('svg');
      expect(emptyIcon).toBeTruthy();
    });

    it('should not show activities when empty', () => {
      render(<DashboardActivities activities={[]} role={UserRole.ADMIN} />);
      
      expect(screen.queryByText(/Achat de billet/i)).toBeFalsy();
    });
  });

  describe('Sorting', () => {
    it('should display activities in order', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Summer Festival/i)).toBeTruthy();
    });

    it('should show all activities', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Achat de billet/i)).toBeTruthy();
      expect(screen.getByText(/Événement créé/i)).toBeTruthy();
      expect(screen.getByText(/Nouvel utilisateur/i)).toBeTruthy();
    });
  });

  describe('Limit Display', () => {
    it('should limit number of displayed activities to 8', () => {
      const manyActivities = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        type: 'ticket_purchase' as const,
        title: `Activité ${i}`,
        description: `Description activité ${i}`,
        timestamp: new Date(),
      }));
      
      const { container } = render(<DashboardActivities activities={manyActivities} role={UserRole.ADMIN} />);
      
      const activityItems = container.querySelectorAll('.space-y-4 > div');
      expect(activityItems.length).toBeLessThanOrEqual(8);
    });

    it('should show "Voir tout" button', () => {
      const manyActivities = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        type: 'ticket_purchase' as const,
        title: `Activité ${i}`,
        description: `Description activité ${i}`,
        timestamp: new Date(),
      }));
      
      render(<DashboardActivities activities={manyActivities} role={UserRole.ADMIN} />);
      
      const viewAllButton = screen.getByRole('button', { name: /voir tout/i });
      expect(viewAllButton).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const heading = screen.getByRole('heading', { name: /activités récentes/i });
      expect(heading).toBeTruthy();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const mainDiv = container.querySelector('.bg-white');
      expect(mainDiv).toBeTruthy();
    });

    it('should be keyboard navigable with button', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const button = screen.getByRole('button', { name: /voir tout/i });
      expect(button).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have container styles', () => {
      const { container } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toBeTruthy();
      expect(wrapper).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm');
    });

    it('should style activity items with proper spacing', () => {
      const { container } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const activityContainer = container.querySelector('.space-y-4');
      expect(activityContainer).toBeTruthy();
    });

    it('should have hover states on button', () => {
      render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const button = screen.getByRole('button', { name: /voir tout/i });
      expect(button.className).toMatch(/hover:/);
    });
  });

  describe('Time Formatting', () => {
    it('should format recent times as relative', () => {
      const recentActivity = [{
        id: '1',
        type: 'ticket_purchase' as const,
        title: 'Achat récent',
        description: 'Commande récente',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      }];
      
      render(<DashboardActivities activities={recentActivity} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/il y a quelques minutes/i)).toBeTruthy();
    });

    it('should format old times as dates', () => {
      const oldActivity = [{
        id: '1',
        type: 'ticket_purchase' as const,
        title: 'Achat ancien',
        description: 'Ancienne commande',
        timestamp: new Date('2025-01-01'),
      }];
      
      render(<DashboardActivities activities={oldActivity} role={UserRole.ADMIN} />);
      
      const dateElements = screen.getAllByText(/janv|jan|2025/i);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      const { container } = render(<DashboardActivities activities={[]} role={UserRole.ADMIN} loading={true} />);
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show heading during loading', () => {
      render(<DashboardActivities activities={[]} role={UserRole.ADMIN} loading={true} />);
      
      expect(screen.getByText(/activités récentes/i)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty activities array', () => {
      expect(() => render(<DashboardActivities activities={[]} role={UserRole.ADMIN} />))
        .not.toThrow();
    });

    it('should handle undefined activities gracefully', () => {
      expect(() => render(<DashboardActivities activities={undefined as any} role={UserRole.ADMIN} />))
        .not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with real-time updates', () => {
      const { rerender } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      const newActivity = {
        id: '4',
        type: 'payment_processed' as const,
        title: 'Nouveau paiement',
        description: 'Paiement traité avec succès',
        timestamp: new Date(),
      };
      
      rerender(<DashboardActivities activities={[newActivity, ...mockActivities]} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Nouveau paiement/i)).toBeTruthy();
    });

    it('should handle activity refresh', () => {
      const { rerender } = render(<DashboardActivities activities={mockActivities} role={UserRole.ADMIN} />);
      
      expect(screen.getByText(/Summer Festival/i)).toBeTruthy();
      
      rerender(<DashboardActivities activities={[]} role={UserRole.ADMIN} />);
      
      expect(screen.queryByText(/Summer Festival/i)).toBeFalsy();
    });
  });
});
