import { DashboardStatsCards } from '@/components/dashboard/DashboardStats';
import { DashboardStats } from '@/types/dashboard';
import { UserRole } from '@/types/enums/user.enum';
import { render, screen } from '@testing-library/react';

describe('DashboardStatsCards Component', () => {
  const mockUserStats: DashboardStats = {
    totalTickets: 5,
    upcomingEvents: 3,
    recentOrders: 2,
    notifications: 7,
  };

  const mockOrganizerStats: DashboardStats = {
    totalEvents: 12,
    totalRevenue: 15000,
    totalParticipants: 450,
    activeEvents: 5,
  };

  const mockAdminStats: DashboardStats = {
    totalUsers: 1500,
    platformRevenue: 125000,
    systemHealth: 98,
    securityAlerts: 2,
  };

  describe('Loading State', () => {
    it('should render loading skeletons when loading is true', () => {
      render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={true}
        />
      );
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render 4 skeleton cards', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={true}
        />
      );
      
      const skeletonCards = container.querySelectorAll('.bg-white');
      expect(skeletonCards).toHaveLength(4);
    });

    it('should not display stats data when loading', () => {
      render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={true}
        />
      );
      
      expect(screen.queryByText('Mes Tickets')).toBeNull();
    });
  });

  describe('USER Role Stats', () => {
    beforeEach(() => {
      render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
    });

    it('should render all user stat cards', () => {
      expect(screen.getByText('Mes Tickets')).toBeTruthy();
      expect(screen.getByText('Événements à venir')).toBeTruthy();
      expect(screen.getByText('Commandes récentes')).toBeTruthy();
      expect(screen.getByText('Notifications')).toBeTruthy();
    });

    it('should display correct ticket count', () => {
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('Tickets actifs')).toBeTruthy();
    });

    it('should display correct upcoming events count', () => {
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Dans les 30 prochains jours')).toBeTruthy();
    });

    it('should display correct recent orders count', () => {
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    });

    it('should display correct notifications count', () => {
      expect(screen.getByText('7')).toBeTruthy();
      expect(screen.getByText('Messages non lus')).toBeTruthy();
    });

    it('should display all icons', () => {
      const cards = document.querySelectorAll('.bg-white');
      cards.forEach((card) => {
        const svg = card.querySelector('svg');
        expect(svg).toBeTruthy();
      });
    });
  });

  describe('ORGANIZER Role Stats', () => {
    beforeEach(() => {
      render(
        <DashboardStatsCards
          stats={mockOrganizerStats}
          role={UserRole.ORGANIZER}
          loading={false}
        />
      );
    });

    it('should render all organizer stat cards', () => {
      expect(screen.getByText('Mes Événements')).toBeTruthy();
      expect(screen.getByText('Revenus totaux')).toBeTruthy();
      expect(screen.getByText('Participants')).toBeTruthy();
      expect(screen.getByText('Événements actifs')).toBeTruthy();
    });

    it('should display correct events count', () => {
      expect(screen.getByText('12')).toBeTruthy();
      expect(screen.getByText('Événements créés')).toBeTruthy();
    });

    it('should display formatted revenue', () => {
      expect(screen.getByText(/15.*000.*€/)).toBeTruthy();
      expect(screen.getByText('Revenus générés')).toBeTruthy();
    });

    it('should display correct participants count', () => {
      expect(screen.getByText('450')).toBeTruthy();
      expect(screen.getByText('Total inscriptions')).toBeTruthy();
    });

    it('should display correct active events count', () => {
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('Événements en cours')).toBeTruthy();
    });

    it('should format large revenue numbers correctly', () => {
      const largeRevenueStats: DashboardStats = {
        totalRevenue: 1250000,
      };
      
      const { rerender } = render(
        <DashboardStatsCards
          stats={mockOrganizerStats}
          role={UserRole.ORGANIZER}
          loading={false}
        />
      );
      
      rerender(
        <DashboardStatsCards
          stats={largeRevenueStats}
          role={UserRole.ORGANIZER}
          loading={false}
        />
      );
      
      // French locale formatting: 1 250 000
      expect(screen.getByText(/1.*250.*000.*€/)).toBeTruthy();
    });
  });

  describe('ADMIN Role Stats', () => {
    beforeEach(() => {
      render(
        <DashboardStatsCards
          stats={mockAdminStats}
          role={UserRole.ADMIN}
          loading={false}
        />
      );
    });

    it('should render all admin stat cards', () => {
      expect(screen.getByText('Utilisateurs totaux')).toBeTruthy();
      expect(screen.getByText('Revenus plateforme')).toBeTruthy();
      expect(screen.getByText('Santé du système')).toBeTruthy();
      expect(screen.getByText('Alertes sécurité')).toBeTruthy();
    });

    it('should display correct total users', () => {
      expect(screen.getByText(/1.*500/)).toBeTruthy();
      expect(screen.getByText('Utilisateurs inscrits')).toBeTruthy();
    });

    it('should display formatted platform revenue', () => {
      expect(screen.getByText(/125.*000.*€/)).toBeTruthy();
      expect(screen.getByText('Revenus totaux')).toBeTruthy();
    });

    it('should display system health percentage', () => {
      expect(screen.getByText('98%')).toBeTruthy();
      expect(screen.getByText('Performance système')).toBeTruthy();
    });

    it('should display security alerts count', () => {
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('Alertes actives')).toBeTruthy();
    });

    it('should handle 100% system health', () => {
      const perfectHealthStats: DashboardStats = {
        ...mockAdminStats,
        systemHealth: 100,
      };
      
      const { rerender } = render(
        <DashboardStatsCards
          stats={mockAdminStats}
          role={UserRole.ADMIN}
          loading={false}
        />
      );
      
      rerender(
        <DashboardStatsCards
          stats={perfectHealthStats}
          role={UserRole.ADMIN}
          loading={false}
        />
      );
      
      expect(screen.getByText('100%')).toBeTruthy();
    });
  });

  describe('Grid Layout', () => {
    it('should render stats in a grid', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('md:grid-cols-2');
      expect(grid.className).toContain('lg:grid-cols-4');
      expect(grid.className).toContain('gap-6');
    });

    it('should render exactly 4 stat cards', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const statCards = container.querySelectorAll('.bg-white.rounded-lg');
      expect(statCards).toHaveLength(4);
    });
  });

  describe('Default/Missing Stats', () => {
    it('should handle missing stats with default values', () => {
      const emptyStats: DashboardStats = {};
      
      render(
        <DashboardStatsCards
          stats={emptyStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      // Should display 0 for missing values
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle undefined stats gracefully for USER', () => {
      render(
        <DashboardStatsCards
          stats={{}}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      expect(screen.getByText('Mes Tickets')).toBeTruthy();
      expect(screen.getByText('Événements à venir')).toBeTruthy();
    });

    it('should handle undefined stats gracefully for ORGANIZER', () => {
      render(
        <DashboardStatsCards
          stats={{}}
          role={UserRole.ORGANIZER}
          loading={false}
        />
      );
      
      expect(screen.getByText('Mes Événements')).toBeTruthy();
      expect(screen.getByText(/0.*€/)).toBeTruthy(); // 0 € for revenue
    });

    it('should default systemHealth to 100 when not provided', () => {
      const statsWithoutHealth: DashboardStats = {
        totalUsers: 100,
        platformRevenue: 5000,
        securityAlerts: 0,
      };
      
      render(
        <DashboardStatsCards
          stats={statsWithoutHealth}
          role={UserRole.ADMIN}
          loading={false}
        />
      );
      
      expect(screen.getByText('100%')).toBeTruthy();
    });
  });

  describe('Card Styling', () => {
    it('should apply correct card styles', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const cards = container.querySelectorAll('.bg-white');
      cards.forEach((card) => {
        expect((card as HTMLElement).className).toContain('rounded-lg');
        expect((card as HTMLElement).className).toContain('shadow-sm');
        expect((card as HTMLElement).className).toContain('border');
        expect((card as HTMLElement).className).toContain('p-6');
      });
    });

    it('should have flex layout for card content', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const flexContainers = container.querySelectorAll('.flex.items-center.justify-between');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('should style stat values correctly', () => {
      render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const statValues = document.querySelectorAll('.text-3xl.font-bold.text-gray-900');
      expect(statValues.length).toBe(4);
    });
  });

  describe('Icon Rendering', () => {
    it('should render SVG icons for each stat', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons).toHaveLength(4);
    });

    it('should have proper icon dimensions', () => {
      const { container } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      const icons = container.querySelectorAll('.w-8.h-8');
      expect(icons).toHaveLength(4);
    });
  });

  describe('Role Switching', () => {
    it('should update displayed stats when role changes', () => {
      const { rerender } = render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={UserRole.USER}
          loading={false}
        />
      );
      
      expect(screen.getByText('Mes Tickets')).toBeTruthy();
      
      rerender(
        <DashboardStatsCards
          stats={mockOrganizerStats}
          role={UserRole.ORGANIZER}
          loading={false}
        />
      );
      
      expect(screen.queryByText('Mes Tickets')).not.toBeTruthy();
      expect(screen.getByText('Mes Événements')).toBeTruthy();
    });

    it('should default to USER stats for unknown role', () => {
      render(
        <DashboardStatsCards
          stats={mockUserStats}
          role={'UNKNOWN' as UserRole}
          loading={false}
        />
      );
      
      expect(screen.getByText('Mes Tickets')).toBeTruthy();
      expect(screen.getByText('Événements à venir')).toBeTruthy();
    });
  });
});
