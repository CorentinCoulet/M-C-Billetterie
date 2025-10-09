import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { render, screen } from '@testing-library/react';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card correctly', () => {
      render(
        <Card data-testid="card">
          <p>Card content</p>
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('Card content');
    });

    it('should apply default styles', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card.className).toContain('bg-card');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('border');
      expect(card.className).toContain('shadow-sm');
    });

    it('should accept custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card.className).toContain('custom-class');
    });

    it('should have data-slot attribute', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card.getAttribute('data-slot')).toBe('card');
    });
  });

  describe('CardHeader', () => {
    it('should render header correctly', () => {
      render(
        <Card>
          <CardHeader data-testid="card-header">
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toBeTruthy();
    });

    it('should apply correct styles', () => {
      render(
        <Card>
          <CardHeader data-testid="card-header">Header</CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header.className).toContain('px-6');
      expect(header.className).toContain('grid');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardHeader data-testid="card-header">Header</CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header.getAttribute('data-slot')).toBe('card-header');
    });
  });

  describe('CardTitle', () => {
    it('should render title correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>My Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByText('My Card Title')).toBeTruthy();
    });

    it('should apply correct styles', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('leading-none');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title.getAttribute('data-slot')).toBe('card-title');
    });
  });

  describe('CardDescription', () => {
    it('should render description correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByText('Card description text')).toBeTruthy();
    });

    it('should apply muted text style', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-desc">
              Description
            </CardDescription>
          </CardHeader>
        </Card>
      );
      
      const description = screen.getByTestId('card-desc');
      expect(description.className).toContain('text-muted-foreground');
      expect(description.className).toContain('text-sm');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-desc">
              Description
            </CardDescription>
          </CardHeader>
        </Card>
      );
      
      const description = screen.getByTestId('card-desc');
      expect(description.getAttribute('data-slot')).toBe('card-description');
    });
  });

  describe('CardAction', () => {
    it('should render action button correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
        </Card>
      );
      
      expect(screen.getByRole('button', { name: /action/i })).toBeTruthy();
    });

    it('should position action correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardAction data-testid="card-action">
              <button>Action</button>
            </CardAction>
          </CardHeader>
        </Card>
      );
      
      const action = screen.getByTestId('card-action');
      expect(action.className).toContain('col-start-2');
      expect(action.className).toContain('row-span-2');
      expect(action.className).toContain('justify-self-end');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardHeader>
            <CardAction data-testid="card-action">Action</CardAction>
          </CardHeader>
        </Card>
      );
      
      const action = screen.getByTestId('card-action');
      expect(action.getAttribute('data-slot')).toBe('card-action');
    });
  });

  describe('CardContent', () => {
    it('should render content correctly', () => {
      render(
        <Card>
          <CardContent>
            <p>Main content here</p>
          </CardContent>
        </Card>
      );
      
      expect(screen.getByText('Main content here')).toBeTruthy();
    });

    it('should apply padding', () => {
      render(
        <Card>
          <CardContent data-testid="card-content">Content</CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content.className).toContain('px-6');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardContent data-testid="card-content">Content</CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content.getAttribute('data-slot')).toBe('card-content');
    });
  });

  describe('CardFooter', () => {
    it('should render footer correctly', () => {
      render(
        <Card>
          <CardFooter>
            <button>Cancel</button>
            <button>Submit</button>
          </CardFooter>
        </Card>
      );
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy();
    });

    it('should apply flex styles', () => {
      render(
        <Card>
          <CardFooter data-testid="card-footer">Footer</CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer.className).toContain('flex');
      expect(footer.className).toContain('items-center');
      expect(footer.className).toContain('px-6');
    });

    it('should have data-slot attribute', () => {
      render(
        <Card>
          <CardFooter data-testid="card-footer">Footer</CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer.getAttribute('data-slot')).toBe('card-footer');
    });
  });

  describe('Complete Card', () => {
    it('should render complete card structure', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Event Card</CardTitle>
            <CardDescription>Description of the event</CardDescription>
            <CardAction>
              <button>Edit</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>Event details go here</p>
          </CardContent>
          <CardFooter>
            <button>Cancel</button>
            <button>Register</button>
          </CardFooter>
        </Card>
      );
      
      // Verify all parts are rendered
      expect(screen.getByText('Event Card')).toBeTruthy();
      expect(screen.getByText('Description of the event')).toBeTruthy();
      expect(screen.getByText('Event details go here')).toBeTruthy();
      expect(screen.getByRole('button', { name: /edit/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /register/i })).toBeTruthy();
    });

    it('should maintain proper structure with all components', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      
      const card = container.querySelector('[data-slot="card"]');
      const header = container.querySelector('[data-slot="card-header"]');
      const title = container.querySelector('[data-slot="card-title"]');
      const description = container.querySelector('[data-slot="card-description"]');
      const content = container.querySelector('[data-slot="card-content"]');
      const footer = container.querySelector('[data-slot="card-footer"]');
      
      expect(card).toBeTruthy();
      expect(header).toBeTruthy();
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(content).toBeTruthy();
      expect(footer).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className for all components', () => {
      render(
        <Card className="custom-card">
          <CardHeader className="custom-header">
            <CardTitle className="custom-title">Title</CardTitle>
            <CardDescription className="custom-desc">Desc</CardDescription>
          </CardHeader>
          <CardContent className="custom-content">Content</CardContent>
          <CardFooter className="custom-footer">Footer</CardFooter>
        </Card>
      );
      
      expect(document.querySelector('.custom-card')).toBeTruthy();
      expect(document.querySelector('.custom-header')).toBeTruthy();
      expect(document.querySelector('.custom-title')).toBeTruthy();
      expect(document.querySelector('.custom-desc')).toBeTruthy();
      expect(document.querySelector('.custom-content')).toBeTruthy();
      expect(document.querySelector('.custom-footer')).toBeTruthy();
    });
  });
});
