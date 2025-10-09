import { Input } from '@/components/ui/input';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input correctly', () => {
      render(<Input placeholder="Enter text" />);
      
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input.className).toContain('flex');
      expect(input.className).toContain('border');
      expect(input.className).toContain('rounded-md');
    });

    it('should accept custom className', () => {
      render(<Input className="custom-input" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input.className).toContain('custom-input');
    });

    it('should render with label', () => {
      render(
        <div>
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" />
        </div>
      );
      
      const label = screen.getByText('Email');
      const input = screen.getByLabelText('Email');
      expect(label).toBeTruthy();
      expect(input).toBeTruthy();
    });
  });

  describe('Input Types', () => {
    it('should render text input', () => {
      render(<Input type="text" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it('should render email input', () => {
      render(<Input type="email" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.type).toBe('email');
    });

    it('should render password input', () => {
      render(<Input type="password" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('should render number input', () => {
      render(<Input type="number" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('should render date input', () => {
      render(<Input type="date" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.type).toBe('date');
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Input disabled data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
      expect(input.className).toContain('disabled:cursor-not-allowed');
    });

    it('should handle required state', () => {
      render(<Input required data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.required).toBe(true);
    });

    it('should handle readonly state', () => {
      render(<Input readOnly value="Read only value" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });

    it('should show placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should handle user input', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      await userEvent.type(input, 'Hello World');
      
      expect(input.value).toBe('Hello World');
    });

    it('should handle onChange event', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      await userEvent.type(input, 'test');
      
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
    });

    it('should handle onFocus event', async () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      await userEvent.click(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur event', async () => {
      const handleBlur = jest.fn();
      render(
        <>
          <Input onBlur={handleBlur} data-testid="input" />
          <button>Other element</button>
        </>
      );
      
      const input = screen.getByTestId('input');
      await userEvent.click(input);
      await userEvent.tab(); // Move focus away
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle clear input', async () => {
      render(<Input defaultValue="Initial value" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('Initial value');
      
      await userEvent.clear(input);
      expect(input.value).toBe('');
    });
  });

  describe('Value Handling', () => {
    it('should render with default value', () => {
      render(<Input defaultValue="Default text" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('Default text');
    });

    it('should render with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('Controlled value');
    });

    it('should handle empty value', () => {
      render(<Input value="" onChange={() => {}} data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Validation', () => {
    it('should handle maxLength', async () => {
      render(<Input maxLength={5} data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      await userEvent.type(input, '1234567890');
      
      expect(input.value.length).toBeLessThanOrEqual(5);
    });

    it('should handle minLength', () => {
      render(<Input minLength={3} data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.minLength).toBe(3);
    });

    it('should handle pattern validation', () => {
      render(<Input pattern="[0-9]{3}" data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.pattern).toBe('[0-9]{3}');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible name via aria-label', () => {
      render(<Input aria-label="Username input" />);
      
      const input = screen.getByLabelText('Username input');
      expect(input).toBeTruthy();
    });

    it('should be focusable', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input');
      await userEvent.tab();
      
      expect(input).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Input disabled data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should support aria-describedby for error messages', () => {
      render(
        <>
          <Input aria-describedby="error-msg" data-testid="input" />
          <span id="error-msg">This field is required</span>
        </>
      );
      
      const input = screen.getByTestId('input');
      expect(input.getAttribute('aria-describedby')).toBe('error-msg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid typing', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      await userEvent.type(input, 'FastTyping', { delay: 1 });
      
      expect(input.value).toBe('FastTyping');
    });

    it('should handle special characters', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      await userEvent.type(input, '!@#$%^&*()');
      
      expect(input.value).toBe('!@#$%^&*()');
    });

    it('should handle unicode characters', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      await userEvent.type(input, '你好世界');
      
      expect(input.value).toBe('你好世界');
    });

    it('should handle copy-paste', async () => {
      render(<Input data-testid="input" />);
      
      const input = screen.getByTestId('input');
      await userEvent.click(input);
      await userEvent.paste('Pasted content');
      
      expect(input).toHaveValue('Pasted content');
    });
  });
});
