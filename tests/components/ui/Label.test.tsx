import { Label } from '@/components/ui/label';
import { render, screen } from '@testing-library/react';

describe('Label Component', () => {
  describe('Rendering', () => {
    it('should render label with text', () => {
      render(<Label>Username</Label>);
      
      const label = screen.getByText('Username');
      expect(label).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Label data-testid="label">Label Text</Label>);
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('text-sm');
      expect(label.className).toContain('font-medium');
    });

    it('should accept custom className', () => {
      render(
        <Label className="custom-label" data-testid="label">
          Custom Label
        </Label>
      );
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('custom-label');
    });

    it('should render as label element', () => {
      render(<Label>Email</Label>);
      
      const label = screen.getByText('Email');
      expect(label.tagName).toBe('LABEL');
    });
  });

  describe('Association with Inputs', () => {
    it('should associate with input via htmlFor', () => {
      render(
        <>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </>
      );
      
      const label = screen.getByText('Username');
      const input = screen.getByLabelText('Username');
      
      expect(label).toBeTruthy();
      expect(input).toBeTruthy();
    });

    it('should work with nested input', () => {
      render(
        <Label>
          Email
          <input type="email" />
        </Label>
      );
      
      const label = screen.getByText('Email');
      expect(label).toBeTruthy();
    });

    it('should work with checkbox', () => {
      render(
        <>
          <input type="checkbox" id="terms" />
          <Label htmlFor="terms">I agree to terms</Label>
        </>
      );
      
      const label = screen.getByText('I agree to terms');
      const checkbox = screen.getByLabelText('I agree to terms');
      
      expect(label).toBeTruthy();
      expect(checkbox).toBeTruthy();
    });

    it('should work with radio button', () => {
      render(
        <>
          <input type="radio" id="option1" name="choice" />
          <Label htmlFor="option1">Option 1</Label>
        </>
      );
      
      const label = screen.getByText('Option 1');
      const radio = screen.getByLabelText('Option 1');
      
      expect(label).toBeTruthy();
      expect(radio).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should show disabled appearance', () => {
      render(
        <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70" data-testid="label">
          Disabled Field
        </Label>
      );
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('peer-disabled:cursor-not-allowed');
      expect(label.className).toContain('peer-disabled:opacity-70');
    });

    it('should work with required indicator', () => {
      render(
        <Label>
          Email <span className="text-destructive">*</span>
        </Label>
      );
      
      const label = screen.getByText(/Email/);
      expect(label.textContent).toContain('*');
    });
  });

  describe('Content Variations', () => {
    it('should render with icon', () => {
      render(
        <Label>
          <span>🔒</span> Password
        </Label>
      );
      
      const label = screen.getByText(/Password/);
      expect(label.textContent).toContain('🔒');
    });

    it('should render with multiple children', () => {
      render(
        <Label>
          <span>Field Name</span>
          <span className="text-muted-foreground">(optional)</span>
        </Label>
      );
      
      expect(screen.getByText('Field Name')).toBeTruthy();
      expect(screen.getByText('(optional)')).toBeTruthy();
    });

    it('should render with help text', () => {
      render(
        <div>
          <Label htmlFor="password">Password</Label>
          <small className="text-muted-foreground">Must be at least 8 characters</small>
          <input id="password" type="password" />
        </div>
      );
      
      expect(screen.getByText('Password')).toBeTruthy();
      expect(screen.getByText('Must be at least 8 characters')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(
        <>
          <Label htmlFor="email-input">Email Address</Label>
          <input id="email-input" type="email" />
        </>
      );
      
      const input = screen.getByLabelText('Email Address');
      expect(input).toBeTruthy();
    });

    it('should support aria-label', () => {
      render(<Label aria-label="Username label">Username</Label>);
      
      const label = screen.getByLabelText('Username label');
      expect(label).toBeTruthy();
    });

    it('should maintain association when input is disabled', () => {
      render(
        <>
          <Label htmlFor="disabled-input">Disabled Field</Label>
          <input id="disabled-input" type="text" disabled />
        </>
      );
      
      const input = screen.getByLabelText('Disabled Field') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('Form Use Cases', () => {
    it('should work in a login form', () => {
      render(
        <form>
          <div>
            <Label htmlFor="username">Username</Label>
            <input id="username" type="text" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <input id="password" type="password" />
          </div>
        </form>
      );
      
      expect(screen.getByLabelText('Username')).toBeTruthy();
      expect(screen.getByLabelText('Password')).toBeTruthy();
    });

    it('should work in a registration form', () => {
      render(
        <form>
          <Label htmlFor="email">Email</Label>
          <Label htmlFor="name">Full Name</Label>
          <Label htmlFor="age">Age</Label>
        </form>
      );
      
      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByText('Full Name')).toBeTruthy();
      expect(screen.getByText('Age')).toBeTruthy();
    });

    it('should work with form validation', () => {
      render(
        <>
          <Label htmlFor="email" className="text-destructive">
            Email <span>(required)</span>
          </Label>
          <input id="email" type="email" required aria-invalid="true" />
        </>
      );
      
      const label = screen.getByText(/Email/);
      const input = screen.getByLabelText(/Email/) as HTMLInputElement;
      
      expect(label.className).toContain('text-destructive');
      expect(input.required).toBe(true);
    });
  });

  describe('Styling', () => {
    it('should have proper text size', () => {
      render(<Label data-testid="label">Label</Label>);
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('text-sm');
    });

    it('should have medium font weight', () => {
      render(<Label data-testid="label">Label</Label>);
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('font-medium');
    });

    it('should have leading class for line height', () => {
      render(<Label data-testid="label">Label</Label>);
      
      const label = screen.getByTestId('label');
      expect(label.className).toContain('leading-none');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      render(<Label data-testid="label" />);
      
      const label = screen.getByTestId('label');
      expect(label).toBeTruthy();
      expect(label.textContent).toBe('');
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long label text that might wrap to multiple lines in the UI';
      render(<Label>{longText}</Label>);
      
      const label = screen.getByText(longText);
      expect(label).toBeTruthy();
    });

    it('should handle special characters', () => {
      render(<Label>Email (@example.com)</Label>);
      
      const label = screen.getByText('Email (@example.com)');
      expect(label).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      render(<Label>用户名 (Username)</Label>);
      
      const label = screen.getByText('用户名 (Username)');
      expect(label).toBeTruthy();
    });
  });

  describe('Multiple Labels', () => {
    it('should render multiple labels in a form', () => {
      render(
        <form>
          <Label>First Name</Label>
          <Label>Last Name</Label>
          <Label>Email</Label>
          <Label>Phone</Label>
        </form>
      );
      
      expect(screen.getByText('First Name')).toBeTruthy();
      expect(screen.getByText('Last Name')).toBeTruthy();
      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByText('Phone')).toBeTruthy();
    });

    it('should handle label groups', () => {
      render(
        <div>
          <fieldset>
            <legend>Personal Information</legend>
            <Label htmlFor="name">Name</Label>
            <Label htmlFor="age">Age</Label>
          </fieldset>
          <fieldset>
            <legend>Contact Information</legend>
            <Label htmlFor="email">Email</Label>
            <Label htmlFor="phone">Phone</Label>
          </fieldset>
        </div>
      );
      
      expect(screen.getByText('Personal Information')).toBeTruthy();
      expect(screen.getByText('Contact Information')).toBeTruthy();
    });
  });
});
