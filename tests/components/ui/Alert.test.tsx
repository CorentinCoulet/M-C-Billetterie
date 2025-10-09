import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { render, screen } from '@testing-library/react';

describe('Alert Component', () => {
  describe('Rendering', () => {
    it('should render alert correctly', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>Alert description</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Alert Title')).toBeTruthy();
      expect(screen.getByText('Alert description')).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toContain('relative');
      expect(alert.className).toContain('rounded-lg');
      expect(alert.className).toContain('border');
    });

    it('should accept custom className', () => {
      render(
        <Alert className="custom-alert" data-testid="alert">
          Content
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toContain('custom-alert');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Alert data-testid="alert">Default alert</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toBeTruthy();
    });

    it('should render destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          Error alert
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toContain('destructive');
    });
  });

  describe('AlertTitle', () => {
    it('should render title correctly', () => {
      render(
        <Alert>
          <AlertTitle>Important Notice</AlertTitle>
        </Alert>
      );
      
      const title = screen.getByText('Important Notice');
      expect(title).toBeTruthy();
      expect(title.tagName).toBe('DIV');
    });

    it('should apply title styles', () => {
      render(
        <Alert>
          <AlertTitle data-testid="alert-title">Title</AlertTitle>
        </Alert>
      );
      
      const title = screen.getByTestId('alert-title');
      expect(title.className).toContain('font-medium');
      expect(title.className).toContain('col-start-2');
    });
  });

  describe('AlertDescription', () => {
    it('should render description correctly', () => {
      render(
        <Alert>
          <AlertDescription>This is a detailed message</AlertDescription>
        </Alert>
      );
      
      const description = screen.getByText('This is a detailed message');
      expect(description).toBeTruthy();
    });

    it('should apply description styles', () => {
      render(
        <Alert>
          <AlertDescription data-testid="alert-description">
            Description
          </AlertDescription>
        </Alert>
      );
      
      const description = screen.getByTestId('alert-description');
      expect(description.className).toContain('text-sm');
      expect(description.className).toContain('col-start-2');
    });

    it('should support multiline content', () => {
      render(
        <Alert>
          <AlertDescription>
            Line 1
            <br />
            Line 2
            <br />
            Line 3
          </AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText(/Line 1/)).toBeTruthy();
      expect(screen.getByText(/Line 3/)).toBeTruthy();
    });
  });

  describe('With Icons', () => {
    it('should render with icon', () => {
      render(
        <Alert>
          <span role="img" aria-label="warning">⚠️</span>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>Important message</AlertDescription>
        </Alert>
      );
      
      const icon = screen.getByRole('img', { name: 'warning' });
      expect(icon).toBeTruthy();
    });

    it('should render icon with title and description', () => {
      const { container } = render(
        <Alert>
          <svg data-testid="alert-icon" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed</AlertDescription>
        </Alert>
      );
      
      const icon = container.querySelector('[data-testid="alert-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Use Cases', () => {
    it('should work as success alert', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your changes have been saved.</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Success!')).toBeTruthy();
      expect(screen.getByText('Your changes have been saved.')).toBeTruthy();
    });

    it('should work as error alert', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText(/Something went wrong/)).toBeTruthy();
    });

    it('should work as warning alert', () => {
      render(
        <Alert>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This action cannot be undone.</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Warning')).toBeTruthy();
      expect(screen.getByText(/cannot be undone/)).toBeTruthy();
    });

    it('should work as info alert', () => {
      render(
        <Alert>
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>Your session will expire in 5 minutes.</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Information')).toBeTruthy();
      expect(screen.getByText(/expire in 5 minutes/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have role alert', () => {
      render(<Alert role="alert">Important message</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
    });

    it('should support aria-live', () => {
      render(
        <Alert role="alert" aria-live="polite" data-testid="alert">
          Message
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });

    it('should be readable by screen readers', () => {
      render(
        <Alert>
          <AlertTitle>Accessible Alert</AlertTitle>
          <AlertDescription>This can be read by screen readers</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Accessible Alert')).toBeTruthy();
    });

    it('should support aria-label', () => {
      render(
        <Alert aria-label="System notification" data-testid="alert">
          <AlertDescription>Update available</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert.getAttribute('aria-label')).toBe('System notification');
    });
  });

  describe('Layout Variations', () => {
    it('should render with only title', () => {
      render(
        <Alert>
          <AlertTitle>Title Only</AlertTitle>
        </Alert>
      );
      
      expect(screen.getByText('Title Only')).toBeTruthy();
    });

    it('should render with only description', () => {
      render(
        <Alert>
          <AlertDescription>Description only alert</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText('Description only alert')).toBeTruthy();
    });

    it('should render with custom content', () => {
      render(
        <Alert>
          <div>
            <p>Custom paragraph 1</p>
            <p>Custom paragraph 2</p>
          </div>
        </Alert>
      );
      
      expect(screen.getByText('Custom paragraph 1')).toBeTruthy();
      expect(screen.getByText('Custom paragraph 2')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have padding', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/p[xy]-/);
    });

    it('should have border', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toContain('border');
    });

    it('should have rounded corners', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toContain('rounded-lg');
    });

    it('should have background color', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-/);
    });
  });

  describe('With Actions', () => {
    it('should render with action button', () => {
      render(
        <Alert>
          <AlertTitle>Confirm Action</AlertTitle>
          <AlertDescription>
            Are you sure you want to proceed?
          </AlertDescription>
          <button>Confirm</button>
        </Alert>
      );
      
      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(button).toBeTruthy();
    });

    it('should render with multiple actions', () => {
      render(
        <Alert>
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>You have unsaved changes.</AlertDescription>
          <div>
            <button>Save</button>
            <button>Discard</button>
          </div>
        </Alert>
      );
      
      expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy();
    });

    it('should render with dismiss button', () => {
      render(
        <Alert>
          <AlertDescription>Dismissible alert</AlertDescription>
          <button aria-label="Dismiss">×</button>
        </Alert>
      );
      
      const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
      expect(dismissButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(<Alert data-testid="alert" />);
      
      const alert = screen.getByTestId('alert');
      expect(alert).toBeTruthy();
    });

    it('should handle very long content', () => {
      const longText = 'A'.repeat(1000);
      render(
        <Alert>
          <AlertDescription>{longText}</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText(longText)).toBeTruthy();
    });

    it('should handle special characters', () => {
      render(
        <Alert>
          <AlertDescription>Alert with &lt;special&gt; &amp; characters!</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByText(/special/)).toBeTruthy();
    });

    it('should handle HTML in description', () => {
      render(
        <Alert>
          <AlertDescription>
            Visit <a href="/">our website</a> for more info.
          </AlertDescription>
        </Alert>
      );
      
      const link = screen.getByRole('link', { name: 'our website' });
      expect(link).toBeTruthy();
    });
  });

  describe('Multiple Alerts', () => {
    it('should render multiple alerts', () => {
      render(
        <>
          <Alert>
            <AlertTitle>Alert 1</AlertTitle>
          </Alert>
          <Alert>
            <AlertTitle>Alert 2</AlertTitle>
          </Alert>
          <Alert>
            <AlertTitle>Alert 3</AlertTitle>
          </Alert>
        </>
      );
      
      expect(screen.getByText('Alert 1')).toBeTruthy();
      expect(screen.getByText('Alert 2')).toBeTruthy();
      expect(screen.getByText('Alert 3')).toBeTruthy();
    });

    it('should stack alerts properly', () => {
      render(
        <div className="space-y-4">
          <Alert><AlertTitle>First</AlertTitle></Alert>
          <Alert><AlertTitle>Second</AlertTitle></Alert>
        </div>
      );
      
      const alerts = screen.getAllByText(/First|Second/);
      expect(alerts).toHaveLength(2);
    });
  });
});
