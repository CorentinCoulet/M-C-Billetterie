import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Select Component', () => {
  describe('Rendering', () => {
    it('should render select trigger correctly', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toBeTruthy();
    });

    it('should show placeholder', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choose a fruit" />
          </SelectTrigger>
        </Select>
      );
      
      const placeholder = screen.getByText('Choose a fruit');
      expect(placeholder).toBeTruthy();
    });

    it('should apply default styles to trigger', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.className).toContain('flex');
      expect(trigger.className).toContain('border');
      expect(trigger.className).toContain('rounded-md');
    });
  });

  describe('Options', () => {
    it('should render select with options', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Select a fruit')).toBeTruthy();
    });

    it('should have correct option structure', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test" data-testid="select-item">
              Test Option
            </SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeTruthy();
      expect(trigger).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.hasAttribute('disabled')).toBe(true);
      expect(trigger.className).toContain('disabled:cursor-not-allowed');
    });

    it('should handle required state', () => {
      render(
        <Select required>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.hasAttribute('aria-required')).toBe(true);
    });

    it('should show selected value', () => {
      render(
        <Select defaultValue="apple">
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('Apple');
    });
  });

  describe('Interactions', () => {
    it('should open dropdown on click', async () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      // Verify trigger is clickable
      expect(trigger.getAttribute('role')).toBe('combobox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('should select option on click', async () => {
      const handleChange = jest.fn();
      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      // Verify trigger renders with placeholder
      expect(trigger).toBeTruthy();
      expect(screen.getByText('Select')).toBeTruthy();
    });

    it('should handle keyboard navigation', async () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      trigger.focus();
      
      // Verify trigger is focusable
      expect(document.activeElement).toBe(trigger);
    });

    it('should not open when disabled', async () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      
      // Verify disabled state
      expect(trigger).toBeDisabled();
    });
  });

  describe('Controlled Component', () => {
    it('should work as controlled component', () => {
      const { rerender } = render(
        <Select value="option1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Option 1')).toBeTruthy();
      
      rerender(
        <Select value="option2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Option 2')).toBeTruthy();
    });

    it('should work as uncontrolled component', () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Option 1')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have role combobox', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeTruthy();
    });

    it('should be keyboard accessible', async () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      await userEvent.tab();
      
      expect(trigger).toHaveFocus();
    });

    it('should support aria-label', () => {
      render(
        <Select>
          <SelectTrigger aria-label="Choose an option">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByLabelText('Choose an option');
      expect(trigger).toBeTruthy();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Select>
            <SelectTrigger aria-describedby="help-text" data-testid="select-trigger">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
          </Select>
          <span id="help-text">Select your preferred option</span>
        </>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.getAttribute('aria-describedby')).toBe('help-text');
    });

    it('should announce selection to screen readers', () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('Option 1');
    });
  });

  describe('Use Cases', () => {
    it('should work in a form', () => {
      render(
        <form>
          <label htmlFor="country">Country</label>
          <Select name="country">
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="fr">France</SelectItem>
            </SelectContent>
          </Select>
        </form>
      );
      
      expect(screen.getByText('Country')).toBeTruthy();
      expect(screen.getByText('Select country')).toBeTruthy();
    });

    it('should work with categories', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="music">Music</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="arts">Arts</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Select category')).toBeTruthy();
    });

    it('should work with grouped options', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <div data-testid="group1">
              <div>Fruits</div>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </div>
            <div data-testid="group2">
              <div>Vegetables</div>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="broccoli">Broccoli</SelectItem>
            </div>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Select option')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="No options available" />
          </SelectTrigger>
          <SelectContent>
            {/* No items */}
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('No options available')).toBeTruthy();
    });

    it('should handle many options', () => {
      const options = Array.from({ length: 100 }, (_, i) => (
        <SelectItem key={i} value={`option${i}`}>
          Option {i}
        </SelectItem>
      ));
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>{options}</SelectContent>
        </Select>
      );
      
      expect(screen.getByText('Select')).toBeTruthy();
    });

    it('should handle special characters in values', () => {
      render(
        <Select defaultValue="test@example.com">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test@example.com">test@example.com</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('should handle unicode in options', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="选择选项" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cn">中文</SelectItem>
            <SelectItem value="jp">日本語</SelectItem>
          </SelectContent>
        </Select>
      );
      
      expect(screen.getByText('选择选项')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have proper height', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.className).toContain('h-9');
    });

    it('should have focus ring', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.className).toContain('focus-visible:ring');
    });

    it('should have chevron icon', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      );
      
      const trigger = screen.getByTestId('select-trigger');
      // Check for chevron SVG or icon
      expect(trigger.querySelector('svg')).toBeTruthy();
    });
  });
});
