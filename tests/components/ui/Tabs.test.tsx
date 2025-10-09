import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Tabs Component', () => {
  describe('Rendering', () => {
    it('should render tabs correctly', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Tab 1')).toBeTruthy();
      expect(screen.getByText('Tab 2')).toBeTruthy();
    });

    it('should show default tab content', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">First Content</TabsContent>
          <TabsContent value="tab2">Second Content</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('First Content')).toBeTruthy();
      expect(screen.queryByText('Second Content')).toBeFalsy();
    });

    it('should render tab list', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toBeTruthy();
    });
  });

  describe('Tab Switching', () => {
    it('should switch tabs on click', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Content 1')).toBeTruthy();
      
      const tab2 = screen.getByText('Tab 2');
      await userEvent.click(tab2);
      
      expect(await screen.findByText('Content 2')).toBeTruthy();
      expect(screen.queryByText('Content 1')).toBeFalsy();
    });

    it('should switch tabs with keyboard navigation', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );
      
      const tab1 = screen.getByText('Tab 1');
      tab1.focus();
      
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByText('Tab 2')).toHaveFocus();
      
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByText('Tab 3')).toHaveFocus();
      
      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.getByText('Tab 2')).toHaveFocus();
    });

    it('should activate tab on Enter key', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      const tab2 = screen.getByText('Tab 2');
      tab2.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(await screen.findByText('Content 2')).toBeTruthy();
    });
  });

  describe('TabsList', () => {
    it('should render tabs list with proper structure', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList.children.length).toBe(2);
    });

    it('should have proper ARIA role', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeTruthy();
    });

    it('should apply list styles', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList.className).toContain('inline-flex');
    });
  });

  describe('TabsTrigger', () => {
    it('should have role tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab = screen.getByRole('tab');
      expect(tab).toBeTruthy();
    });

    it('should have aria-selected on active tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active Tab</TabsTrigger>
            <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const activeTab = screen.getByText('Active Tab');
      const inactiveTab = screen.getByText('Inactive Tab');
      
      expect(activeTab.getAttribute('aria-selected')).toBe('true');
      expect(inactiveTab.getAttribute('aria-selected')).toBe('false');
    });

    it('should be focusable', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab = screen.getByText('Tab 1');
      await userEvent.tab();
      
      expect(tab).toHaveFocus();
    });

    it('should have disabled state', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Disabled Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const disabledTab = screen.getByText('Disabled Tab');
      expect(disabledTab).toBeDisabled();
    });
  });

  describe('TabsContent', () => {
    it('should have role tabpanel', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toBeTruthy();
    });

    it('should hide inactive content', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Visible Content</TabsContent>
          <TabsContent value="tab2">Hidden Content</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Visible Content')).toBeTruthy();
      expect(screen.queryByText('Hidden Content')).toBeFalsy();
    });

    it('should show content when tab is active', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      const tab2 = screen.getByText('Tab 2');
      await userEvent.click(tab2);
      
      expect(await screen.findByText('Content 2')).toBeVisible();
    });
  });

  describe('Controlled Component', () => {
    it('should work as controlled component', () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Content 1')).toBeTruthy();
      
      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Content 2')).toBeTruthy();
    });

    it('should call onValueChange callback', async () => {
      const handleChange = jest.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab2 = screen.getByText('Tab 2');
      await userEvent.click(tab2);
      
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Use Cases', () => {
    it('should work for settings tabs', () => {
      render(
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="general">General Settings</TabsContent>
          <TabsContent value="security">Security Settings</TabsContent>
          <TabsContent value="notifications">Notification Settings</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('General')).toBeTruthy();
      expect(screen.getByText('Security')).toBeTruthy();
      expect(screen.getByText('Notifications')).toBeTruthy();
    });

    it('should work for dashboard tabs', () => {
      render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview Dashboard</TabsContent>
          <TabsContent value="analytics">Analytics Dashboard</TabsContent>
          <TabsContent value="reports">Reports Dashboard</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Overview Dashboard')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      
      const tab = screen.getByRole('tab');
      const tabPanel = screen.getByRole('tabpanel');
      
      expect(tab.getAttribute('aria-controls')).toBeTruthy();
      expect(tabPanel.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('should support keyboard navigation with Home/End', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab1 = screen.getByText('Tab 1');
      tab1.focus();
      
      await userEvent.keyboard('{End}');
      expect(screen.getByText('Tab 3')).toHaveFocus();
      
      await userEvent.keyboard('{Home}');
      expect(screen.getByText('Tab 1')).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should have list styling', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList.className).toMatch(/inline-flex|flex/);
    });

    it('should highlight active tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="active-tab">Active</TabsTrigger>
            <TabsTrigger value="tab2">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const activeTab = screen.getByTestId('active-tab');
      expect(activeTab.getAttribute('data-state')).toBe('active');
    });

    it('should have proper spacing', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      // TabsList uses padding (p-[3px]) for spacing
      expect(tabsList.className).toContain('p-[3px]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle many tabs', () => {
      const tabs = Array.from({ length: 20 }, (_, i) => (
        <TabsTrigger key={i} value={`tab${i}`}>
          Tab {i}
        </TabsTrigger>
      ));
      
      render(
        <Tabs defaultValue="tab0">
          <TabsList>{tabs}</TabsList>
        </Tabs>
      );
      
      expect(screen.getByText('Tab 0')).toBeTruthy();
      expect(screen.getByText('Tab 19')).toBeTruthy();
    });

    it('should handle tab with long content', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">{longContent}</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText(longContent)).toBeTruthy();
    });

    it('should handle rapid tab switching', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );
      
      await userEvent.click(screen.getByText('Tab 2'));
      await userEvent.click(screen.getByText('Tab 3'));
      await userEvent.click(screen.getByText('Tab 1'));
      
      expect(screen.getByText('Content 1')).toBeVisible();
    });
  });
});
