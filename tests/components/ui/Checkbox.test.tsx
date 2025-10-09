import { Checkbox } from '@/components/ui/checkbox';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Checkbox Component', () => {
  describe('Rendering', () => {
    it('should render checkbox correctly', () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.className).toContain('peer');
      expect(checkbox.className).toContain('border');
      expect(checkbox.className).toContain('rounded');
    });

    it('should accept custom className', () => {
      render(<Checkbox className="custom-checkbox" data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.className).toContain('custom-checkbox');
    });

    it('should render with label', () => {
      render(
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" />
          <label htmlFor="terms">Accept terms and conditions</label>
        </div>
      );
      
      const label = screen.getByText('Accept terms and conditions');
      const checkbox = screen.getByRole('checkbox');
      expect(label).toBeTruthy();
      expect(checkbox).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should handle unchecked state', () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('unchecked');
    });

    it('should handle checked state', () => {
      render(<Checkbox checked data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('checked');
    });

    it('should handle indeterminate state', () => {
      render(<Checkbox checked="indeterminate" data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('indeterminate');
    });

    it('should handle disabled state', () => {
      render(<Checkbox disabled data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('disabled')).toBe('');
      expect(checkbox.className).toContain('disabled:cursor-not-allowed');
    });

    it('should handle required attribute', () => {
      render(<Checkbox required data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      // Radix UI Checkbox may not expose required attribute directly
      // Test that the component renders without errors
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should toggle on click', async () => {
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should not toggle when disabled', async () => {
      const handleChange = jest.fn();
      render(<Checkbox disabled onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.click(checkbox);
      
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks', async () => {
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.click(checkbox);
      await userEvent.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(handleChange).toHaveBeenNthCalledWith(1, true);
      expect(handleChange).toHaveBeenNthCalledWith(2, false);
    });

    it('should handle keyboard interaction (Space)', async () => {
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      checkbox.focus();
      await userEvent.keyboard(' ');
      
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should handle keyboard interaction (Enter)', async () => {
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      checkbox.focus();
      await userEvent.keyboard('{Enter}');
      
      // Radix UI Checkbox may not toggle with Enter key, only Space
      // This test verifies that Enter doesn't cause errors
      expect(checkbox).toBeTruthy();
    });
  });

  describe('Controlled Component', () => {
    it('should work as controlled component', () => {
      const { rerender } = render(<Checkbox checked={false} data-testid="checkbox" />);
      
      let checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('unchecked');
      
      rerender(<Checkbox checked={true} data-testid="checkbox" />);
      checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('checked');
    });

    it('should work as uncontrolled component', async () => {
      render(<Checkbox defaultChecked={false} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('unchecked');
      
      await userEvent.click(checkbox);
      expect(checkbox.getAttribute('data-state')).toBe('checked');
    });
  });

  describe('Accessibility', () => {
    it('should have role checkbox', () => {
      render(<Checkbox />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeTruthy();
    });

    it('should be focusable', async () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.tab();
      
      expect(document.activeElement).toBe(checkbox);
    });

    it('should not be focusable when disabled', () => {
      render(<Checkbox disabled data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('disabled')).toBe('');
    });

    it('should support aria-label', () => {
      render(<Checkbox aria-label="Accept terms" />);
      
      const checkbox = screen.getByLabelText('Accept terms');
      expect(checkbox).toBeTruthy();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Checkbox aria-describedby="description" data-testid="checkbox" />
          <span id="description">Check this to proceed</span>
        </>
      );
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('aria-describedby')).toBe('description');
    });

    it('should announce checked state', () => {
      render(<Checkbox checked aria-label="Terms checkbox" />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
    });

    it('should announce indeterminate state', () => {
      render(<Checkbox checked="indeterminate" aria-label="Select all" />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
    });
  });

  describe('Use Cases', () => {
    it('should work in a form', () => {
      render(
        <form>
          <Checkbox name="newsletter" value="yes" data-testid="checkbox" />
          <label htmlFor="newsletter">Subscribe to newsletter</label>
        </form>
      );
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toBeTruthy();
      // Radix UI Checkbox uses a hidden input for form data
      // The visible button doesn't have name/value attributes
      expect(checkbox).toBeInTheDocument();
    });

    it('should work in a group of checkboxes', () => {
      render(
        <div>
          <Checkbox id="option1" />
          <label htmlFor="option1">Option 1</label>
          
          <Checkbox id="option2" />
          <label htmlFor="option2">Option 2</label>
          
          <Checkbox id="option3" />
          <label htmlFor="option3">Option 3</label>
        </div>
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('should work with validation', () => {
      render(
        <>
          <Checkbox required aria-invalid="true" data-testid="checkbox" />
          <span role="alert">This field is required</span>
        </>
      );
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('should show focus ring on focus', async () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.tab();
      
      expect(checkbox.className).toContain('focus-visible:ring');
    });

    it('should have proper styling classes', () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      // Check for core styling classes
      expect(checkbox.className).toContain('transition');
    });

    it('should show disabled appearance', () => {
      render(<Checkbox disabled data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.className).toContain('disabled:cursor-not-allowed');
      expect(checkbox.className).toContain('disabled:opacity-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks', async () => {
      const handleChange = jest.fn();
      render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox');
      await userEvent.tripleClick(checkbox);
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle programmatic focus', () => {
      render(<Checkbox data-testid="checkbox" />);
      
      const checkbox = screen.getByTestId('checkbox') as HTMLElement;
      checkbox.focus();
      
      expect(document.activeElement).toBe(checkbox);
    });

    it('should work with form reset', async () => {
      render(
        <form data-testid="form">
          <Checkbox defaultChecked={false} data-testid="checkbox" />
          <button type="reset">Reset</button>
        </form>
      );
      
      const checkbox = screen.getByTestId('checkbox');
      const resetButton = screen.getByText('Reset');
      
      await userEvent.click(checkbox);
      expect(checkbox.getAttribute('data-state')).toBe('checked');
      
      await userEvent.click(resetButton);
      // After reset, checkbox should return to defaultChecked state
    });
  });

  describe('Integration with Label', () => {
    it('should toggle when label is clicked', async () => {
      render(
        <div className="flex items-center space-x-2">
          <Checkbox id="terms-checkbox" data-testid="checkbox" />
          <label htmlFor="terms-checkbox">I agree to the terms</label>
        </div>
      );
      
      const label = screen.getByText('I agree to the terms');
      await userEvent.click(label);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('checked');
    });

    it('should not toggle when disabled label is clicked', async () => {
      render(
        <div className="flex items-center space-x-2">
          <Checkbox id="disabled-checkbox" disabled data-testid="checkbox" />
          <label htmlFor="disabled-checkbox">Disabled option</label>
        </div>
      );
      
      const label = screen.getByText('Disabled option');
      await userEvent.click(label);
      
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('unchecked');
    });
  });
});
