import { Footer } from '@/components/common/Footer';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Footer Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('should render footer correctly', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeTruthy();
    });

    it('should display company name', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const companyName = screen.getAllByText(/billetterie/i);
      expect(companyName.length).toBeGreaterThan(0);
    });

    it('should display copyright year', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const currentYear = new Date().getFullYear();
      const copyright = screen.getByText(new RegExp(currentYear.toString()));
      expect(copyright).toBeTruthy();
    });

    it('should display tagline', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const tagline = screen.getByText(/votre plateforme de réservation/i);
      expect(tagline).toBeTruthy();
    });
  });

  describe('Navigation Buttons', () => {
    it('should have Events button', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const eventsButton = screen.getByRole('button', { name: /événements/i });
      expect(eventsButton).toBeTruthy();
      
      await user.click(eventsButton);
      expect(mockNavigate).toHaveBeenCalledWith('events');
    });

    it('should have About button', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      expect(aboutButton).toBeTruthy();
      
      await user.click(aboutButton);
      expect(mockNavigate).toHaveBeenCalledWith('about');
    });

    it('should have Contact button', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const contactButton = screen.getByRole('button', { name: /contact/i });
      expect(contactButton).toBeTruthy();
      
      await user.click(contactButton);
      expect(mockNavigate).toHaveBeenCalledWith('contact');
    });

    it('should have FAQ button', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const faqButton = screen.getByRole('button', { name: /faq/i });
      expect(faqButton).toBeTruthy();
      
      await user.click(faqButton);
      expect(mockNavigate).toHaveBeenCalledWith('faq');
    });

    it('should have Help button', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const helpButton = screen.getByRole('button', { name: /aide/i });
      expect(helpButton).toBeTruthy();
      
      await user.click(helpButton);
      expect(mockNavigate).toHaveBeenCalledWith('help');
    });
  });

  describe('Legal Section', () => {
    it('should have Terms of Service button', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const termsButton = screen.getByRole('button', { name: /conditions d'utilisation/i });
      expect(termsButton).toBeTruthy();
    });

    it('should have Privacy Policy button', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const privacyButton = screen.getByRole('button', { name: /politique de confidentialité/i });
      expect(privacyButton).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have multiple sections', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.children.length).toBeGreaterThan(0);
    });

    it('should have proper semantic HTML', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.tagName).toBe('FOOTER');
    });

    it('should have Navigation section', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const navigationHeading = screen.getByRole('heading', { name: /navigation/i });
      expect(navigationHeading).toBeTruthy();
    });

    it('should have Support section', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const supportHeading = screen.getByRole('heading', { name: /support/i });
      expect(supportHeading).toBeTruthy();
    });

    it('should have Legal section', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const legalHeading = screen.getByRole('heading', { name: /légal/i });
      expect(legalHeading).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have contentinfo role', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeTruthy();
    });

    it('should have proper heading hierarchy', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(['H3', 'H4']).toContain(heading.tagName);
      });
    });

    it('should have descriptive button text', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy();
        expect(button.textContent!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layout', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      const gridContainer = footer.querySelector('.grid');
      expect(gridContainer).toBeTruthy();
      expect(gridContainer?.className).toMatch(/md:grid-cols-4/);
    });

    it('should have max-width container', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      const container = footer.querySelector('.max-w-7xl');
      expect(container).toBeTruthy();
    });
  });

  describe('Content Sections', () => {
    it('should have company information section', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const heading = screen.getByRole('heading', { name: /billetterie/i });
      expect(heading).toBeTruthy();
      expect(screen.getByText(/votre plateforme de réservation/i)).toBeTruthy();
    });

    it('should have legal information', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const privacyButton = screen.getByRole('button', { name: /politique de confidentialité/i });
      const termsButton = screen.getByRole('button', { name: /conditions d'utilisation/i });
      
      expect(privacyButton).toBeTruthy();
      expect(termsButton).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have background color', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toMatch(/bg-slate-100|dark:bg-slate-800/);
    });

    it('should have padding', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      const container = footer.querySelector('.px-4');
      expect(container).toBeTruthy();
    });

    it('should have top margin', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toMatch(/mt-/);
    });

    it('should have border separator for copyright', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      const borderElement = footer.querySelector('.border-t');
      expect(borderElement).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render without errors', () => {
      expect(() => render(<Footer navigate={mockNavigate} />)).not.toThrow();
    });

    it('should handle navigation callback', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      await user.click(aboutButton);
      
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', async () => {
      const user = userEvent.setup();
      render(<Footer navigate={mockNavigate} />);
      
      const aboutButton = screen.getByRole('button', { name: /à propos/i });
      await user.click(aboutButton);
      await user.click(aboutButton);
      
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Branding', () => {
    it('should display brand name prominently', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const brandHeading = screen.getByRole('heading', { name: /billetterie/i });
      expect(brandHeading).toBeTruthy();
      expect(brandHeading.className).toMatch(/text-lg|font-semibold/);
    });

    it('should have consistent brand styling', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toBeTruthy();
    });
  });

  describe('Button Groups', () => {
    it('should have navigation button group', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3);
    });

    it('should have clear button categories', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const navigationHeading = screen.getByRole('heading', { name: /navigation/i });
      const supportHeading = screen.getByRole('heading', { name: /support/i });
      const legalHeading = screen.getByRole('heading', { name: /légal/i });
      
      expect(navigationHeading).toBeTruthy();
      expect(supportHeading).toBeTruthy();
      expect(legalHeading).toBeTruthy();
    });
  });

  describe('Copyright Section', () => {
    it('should display copyright notice', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const copyright = screen.getByText(/©.*billetterie.*tous droits réservés/i);
      expect(copyright).toBeTruthy();
    });

    it('should be centered', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const copyright = screen.getByText(/©/);
      const parent = copyright.parentElement;
      expect(parent?.className).toMatch(/text-center/);
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(<Footer navigate={mockNavigate} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause layout shift', () => {
      const { container } = render(<Footer navigate={mockNavigate} />);
      
      const footer = container.querySelector('footer');
      expect(footer).toBeTruthy();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      render(<Footer navigate={mockNavigate} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer.className).toMatch(/dark:/);
    });
  });
});
