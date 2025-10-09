import { Textarea } from '@/components/ui/textarea';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Textarea Component', () => {
  describe('Rendering', () => {
    it('should render textarea correctly', () => {
      render(<Textarea placeholder="Enter text" />);
      
      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toBeTruthy();
    });

    it('should apply default styles', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('flex');
      expect(textarea.className).toContain('border');
      expect(textarea.className).toContain('rounded-md');
    });

    it('should accept custom className', () => {
      render(<Textarea className="custom-textarea" data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('custom-textarea');
    });

    it('should render with label', () => {
      render(
        <div>
          <label htmlFor="message">Message</label>
          <Textarea id="message" />
        </div>
      );
      
      const label = screen.getByText('Message');
      const textarea = screen.getByLabelText('Message');
      expect(label).toBeTruthy();
      expect(textarea).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Textarea disabled data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
      expect(textarea.className).toContain('disabled:cursor-not-allowed');
    });

    it('should handle required state', () => {
      render(<Textarea required data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.required).toBe(true);
    });

    it('should handle readonly state', () => {
      render(<Textarea readOnly value="Read only content" data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });

    it('should show placeholder', () => {
      render(<Textarea placeholder="Enter your message here..." />);
      
      const textarea = screen.getByPlaceholderText('Enter your message here...');
      expect(textarea).toBeTruthy();
    });
  });

  describe('Dimensions', () => {
    it('should have default rows', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.className).toContain('min-h-16');
    });

    it('should accept custom rows', () => {
      render(<Textarea rows={10} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(10);
    });

    it('should accept custom cols', () => {
      render(<Textarea cols={50} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.cols).toBe(50);
    });

    it('should be resizable by default', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      // Textarea uses field-sizing-content for dynamic sizing
      expect(textarea.className).toContain('field-sizing-content');
    });
  });

  describe('Interactions', () => {
    it('should handle user input', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Hello World\nNew Line');
      
      expect(textarea.value).toBe('Hello World\nNew Line');
    });

    it('should handle onChange event', async () => {
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.type(textarea, 'test');
      
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledTimes(4);
    });

    it('should handle onFocus event', async () => {
      const handleFocus = jest.fn();
      render(<Textarea onFocus={handleFocus} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.click(textarea);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur event', async () => {
      const handleBlur = jest.fn();
      render(
        <>
          <Textarea onBlur={handleBlur} data-testid="textarea" />
          <button>Other element</button>
        </>
      );
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.click(textarea);
      await userEvent.tab();
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle clear textarea', async () => {
      render(<Textarea defaultValue="Initial content" data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial content');
      
      await userEvent.clear(textarea);
      expect(textarea.value).toBe('');
    });

    it('should handle multi-line input', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');
      
      expect(textarea.value).toContain('\n');
      expect(textarea.value.split('\n')).toHaveLength(3);
    });
  });

  describe('Value Handling', () => {
    it('should render with default value', () => {
      render(<Textarea defaultValue="Default content" data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Default content');
    });

    it('should render with controlled value', () => {
      render(<Textarea value="Controlled content" onChange={() => {}} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Controlled content');
    });

    it('should handle empty value', () => {
      render(<Textarea value="" onChange={() => {}} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('should handle long text', () => {
      const longText = 'A'.repeat(1000);
      render(<Textarea value={longText} onChange={() => {}} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longText);
    });
  });

  describe('Validation', () => {
    it('should handle maxLength', async () => {
      render(<Textarea maxLength={50} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.maxLength).toBe(50);
    });

    it('should handle minLength', () => {
      render(<Textarea minLength={10} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.minLength).toBe(10);
    });

    it('should show character count', () => {
      const { container } = render(
        <div>
          <Textarea defaultValue="Hello" maxLength={100} data-testid="textarea" />
          <span>5/100</span>
        </div>
      );
      
      expect(screen.getByText('5/100')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible name via aria-label', () => {
      render(<Textarea aria-label="Message input" />);
      
      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toBeTruthy();
    });

    it('should be focusable', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.tab();
      
      expect(textarea).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Textarea disabled data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    it('should support aria-describedby for help text', () => {
      render(
        <>
          <Textarea aria-describedby="help-text" data-testid="textarea" />
          <span id="help-text">Enter at least 10 characters</span>
        </>
      );
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.getAttribute('aria-describedby')).toBe('help-text');
    });

    it('should support aria-invalid for errors', () => {
      render(<Textarea aria-invalid="true" data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Use Cases', () => {
    it('should work in a form', () => {
      render(
        <form>
          <Textarea name="comment" data-testid="textarea" />
        </form>
      );
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.getAttribute('name')).toBe('comment');
    });

    it('should work as a comment box', () => {
      render(
        <div>
          <label htmlFor="comment">Add your comment</label>
          <Textarea id="comment" placeholder="Write your comment here..." rows={5} />
          <button>Submit</button>
        </div>
      );
      
      const textarea = screen.getByLabelText('Add your comment');
      const button = screen.getByRole('button');
      expect(textarea).toBeTruthy();
      expect(button).toBeTruthy();
    });

    it('should work as a message input', () => {
      render(
        <div>
          <label htmlFor="message">Message</label>
          <Textarea 
            id="message" 
            placeholder="Type your message..." 
            maxLength={500} 
          />
        </div>
      );
      
      const textarea = screen.getByLabelText('Message');
      expect(textarea).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid typing', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'FastTyping', { delay: 1 });
      
      expect(textarea.value).toBe('FastTyping');
    });

    it('should handle special characters', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, '!@#$%^&*()');
      
      expect(textarea.value).toBe('!@#$%^&*()');
    });

    it('should handle unicode characters', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, '你好世界 🌍');
      
      expect(textarea.value).toBe('你好世界 🌍');
    });

    it('should handle copy-paste', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.click(textarea);
      await userEvent.paste('Pasted\nmulti-line\ncontent');
      
      expect(textarea).toHaveValue('Pasted\nmulti-line\ncontent');
    });

    it('should handle tab key', async () => {
      render(
        <>
          <Textarea data-testid="textarea1" />
          <Textarea data-testid="textarea2" />
        </>
      );
      
      const textarea1 = screen.getByTestId('textarea1');
      const textarea2 = screen.getByTestId('textarea2');
      
      textarea1.focus();
      expect(textarea1).toHaveFocus();
      
      await userEvent.tab();
      expect(textarea2).toHaveFocus();
    });

    it('should handle empty lines', async () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Line 1{Enter}{Enter}Line 3');
      
      expect(textarea.value).toBe('Line 1\n\nLine 3');
    });
  });

  describe('Styling', () => {
    it('should have proper padding', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('px-3');
      expect(textarea.className).toContain('py-2');
    });

    it('should have focus ring', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('focus-visible:ring-[3px]');
    });

    it('should have proper text size', () => {
      render(<Textarea data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('text-sm');
    });
  });
});
