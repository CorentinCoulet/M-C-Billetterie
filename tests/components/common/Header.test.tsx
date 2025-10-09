import { Header } from '@/components/common/Header';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Header Component', () => {
  const mockNavigate = jest.fn();
  const mockLogout = jest.fn();

  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with logo', () => {
      render(<Header navigate={mockNavigate} />);
      
      expect(screen.getByText('Billetterie')).toBeTruthy();
    });

    it('should render navigation links', () => {
      render(<Header navigate={mockNavigate} />);
      
      expect(screen.getByRole('button', { name: /événements/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /à propos/i })).toBeTruthy();
    });

    it('should have fixed positioning', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const header = container.querySelector('header');
      expect(header?.className).toContain('fixed');
      expect(header?.className).toContain('top-0');
      expect(header?.className).toContain('z-50');
    });

    it('should have backdrop blur effect', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const header = container.querySelector('header');
      expect(header?.className).toContain('backdrop-blur-sm');
      expect(header?.className).toContain('bg-white/80');
    });
  });

  describe('Navigation', () => {
    it('should navigate to home when logo is clicked', async () => {
      const user = userEvent.setup();
      render(<Header navigate={mockNavigate} />);
      
      const logo = screen.getByText('Billetterie');
      await user.click(logo);
      
      expect(mockNavigate).toHaveBeenCalledWith('home');
    });

    it('should navigate to events page', async () => {
      const user = userEvent.setup();
      render(<Header navigate={mockNavigate} />);
      
      const eventsButton = screen.getByRole('button', { name: /événements/i });
      await user.click(eventsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('events');
    });

    it('should navigate to about page', async () => {
      const user = userEvent.setup();
      render(<Header navigate={mockNavigate} />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      await user.click(aboutButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('about');
    });
  });

  describe('Active Page Styling', () => {
    it('should highlight active page (events)', () => {
      render(<Header navigate={mockNavigate} currentPage="events" />);
      
      const eventsButton = screen.getByRole('button', { name: /événements/i });
      expect(eventsButton.className).toContain('bg-primary'); // default variant
    });

    it('should highlight active page (about)', () => {
      render(<Header navigate={mockNavigate} currentPage="about" />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      expect(aboutButton.className).toContain('bg-primary');
    });

    it('should use ghost variant for inactive pages', () => {
      render(<Header navigate={mockNavigate} currentPage="events" />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      expect(aboutButton.className).toContain('hover:bg-accent'); // ghost variant
    });
  });

  describe('Unauthenticated User', () => {
    it('should show login button when user is not authenticated', () => {
      render(<Header navigate={mockNavigate} currentUser={null} />);
      
      expect(screen.getByRole('button', { name: /^connexion$/i })).toBeTruthy();
    });

    it('should not show user menu when not authenticated', () => {
      render(<Header navigate={mockNavigate} currentUser={null} />);
      
      expect(screen.queryByRole('button', { name: /profil/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /panier/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /déconnexion/i })).toBeNull();
    });

    it('should navigate to auth page when login is clicked', async () => {
      const user = userEvent.setup();
      render(<Header navigate={mockNavigate} currentUser={null} />);
      
      const loginButton = screen.getByRole('button', { name: /^connexion$/i });
      await user.click(loginButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('auth');
    });
  });

  describe('Authenticated User', () => {
    it('should show user menu when authenticated', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          logout={mockLogout}
        />
      );
      
      expect(screen.getByRole('button', { name: /profil/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /panier/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /déconnexion/i })).toBeTruthy();
    });

    it('should not show login button when authenticated', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
        />
      );
      
      expect(screen.queryByRole('button', { name: /^connexion$/i })).toBeNull();
    });

    it('should navigate to profile page', async () => {
      const user = userEvent.setup();
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
        />
      );
      
      const profileButton = screen.getByRole('button', { name: /profil/i });
      await user.click(profileButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('profile');
    });

    it('should navigate to cart page', async () => {
      const user = userEvent.setup();
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
        />
      );
      
      const cartButton = screen.getByRole('button', { name: /panier/i });
      await user.click(cartButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('cart');
    });

    it('should call logout function', async () => {
      const user = userEvent.setup();
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          logout={mockLogout}
        />
      );
      
      const logoutButton = screen.getByRole('button', { name: /déconnexion/i });
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cart Counter', () => {
    it('should display cart item count', () => {
      const cart = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];
      
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          cart={cart}
        />
      );
      
      expect(screen.getByText(/panier \(3\)/i)).toBeTruthy();
    });

    it('should display zero when cart is empty', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          cart={[]}
        />
      );
      
      expect(screen.getByText(/panier \(0\)/i)).toBeTruthy();
    });

    it('should default to empty array if cart is not provided', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
        />
      );
      
      expect(screen.getByText(/panier \(0\)/i)).toBeTruthy();
    });

    it('should have relative positioning for cart badge', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          cart={[{ id: 1 }]}
        />
      );
      
      const cartButton = screen.getByRole('button', { name: /panier/i });
      expect(cartButton.className).toContain('relative');
    });
  });

  describe('Favorites (Props)', () => {
    it('should accept favorites array prop', () => {
      const favorites = [1, 2, 3];
      
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          favorites={favorites}
        />
      );
      
      // Component renders without errors
      expect(screen.getByText('Billetterie')).toBeTruthy();
    });

    it('should default favorites to empty array', () => {
      render(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
        />
      );
      
      // Component renders without errors
      expect(screen.getByText('Billetterie')).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should hide navigation on mobile (md:flex)', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('hidden');
      expect(nav?.className).toContain('md:flex');
    });

    it('should have responsive container', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const innerContainer = container.querySelector('.max-w-7xl');
      expect(innerContainer).toBeTruthy();
      expect(innerContainer?.className).toContain('mx-auto');
    });
  });

  describe('Layout & Spacing', () => {
    it('should have correct spacing between elements', () => {
      const { container } = render(<Header navigate={mockNavigate} currentUser={mockUser} />);
      
      const logoNav = container.querySelector('.flex.items-center.space-x-8');
      expect(logoNav).toBeTruthy();
      
      const userMenu = container.querySelector('.flex.items-center.space-x-4');
      expect(userMenu).toBeTruthy();
    });

    it('should use flexbox for layout', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const mainContainer = container.querySelector('.flex.items-center.justify-between');
      expect(mainContainer).toBeTruthy();
    });
  });

  describe('Cursor & Interactions', () => {
    it('should have pointer cursor on logo', () => {
      const { container } = render(<Header navigate={mockNavigate} />);
      
      const logo = container.querySelector('.cursor-pointer');
      expect(logo?.textContent).toContain('Billetterie');
    });

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      render(<Header navigate={mockNavigate} />);
      
      const eventsButton = screen.getByRole('button', { name: /événements/i });
      
      await user.click(eventsButton);
      await user.click(eventsButton);
      await user.click(eventsButton);
      
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration', () => {
    it('should handle complete user session flow', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Header
          navigate={mockNavigate}
          currentUser={null}
        />
      );
      
      // Initially not authenticated
      expect(screen.getByRole('button', { name: /^connexion$/i })).toBeTruthy();
      
      // User logs in
      rerender(
        <Header
          navigate={mockNavigate}
          currentUser={mockUser}
          logout={mockLogout}
        />
      );
      
      // Now authenticated
      expect(screen.getByRole('button', { name: /profil/i })).toBeTruthy();
      
      // User logs out
      const logoutButton = screen.getByRole('button', { name: /déconnexion/i });
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
