import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';

/**
 * Fixtures and helpers for Playwright E2E tests
 */

/**
 * Test user type
 */
export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Authentication helpers
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Creates a new user and logs them in
   */
  async registerAndLogin(user: TestUser): Promise<void> {
    // Registration
    await this.page.goto('/register');
    await this.page.fill('[name="name"]', user.name);
    await this.page.fill('[name="email"]', user.email);
    await this.page.fill('[name="password"]', user.password);
    await this.page.fill('[name="confirmPassword"]', user.password);
    await this.page.click('button[type="submit"]');

    // Wait for redirect
    await this.page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });

    // If redirected to login, log in
    if (this.page.url().includes('/login')) {
      await this.login(user.email, user.password);
    }
  }

  /**
   * Logs in an existing user
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  /**
   * Logs out the current user
   */
  async logout(): Promise<void> {
    const logoutButton = this.page.locator(
      'button:has-text("Logout"), button:has-text("Déconnexion"), [data-testid="logout-button"]'
    );
    await logoutButton.click();
    await this.page.waitForURL(/\/(login|$)/, { timeout: 10000 });
  }

  /**
   * Checks if the user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    return this.page.url().includes('/dashboard');
  }
}

/**
 * Event helpers
 */
export class EventHelpers {
  constructor(private page: Page) {}

  /**
   * Navigates to the events list
   */
  async goToEvents(): Promise<void> {
    await this.page.goto('/events');
    await this.page.waitForSelector('.event-card, [data-testid="event-card"]', { timeout: 10000 });
  }

  /**
   * Selects and opens the first available event
   */
  async selectFirstEvent(): Promise<string> {
    await this.goToEvents();
    const firstEvent = this.page.locator('.event-card, [data-testid="event-card"]').first();
    await firstEvent.click();
    await this.page.waitForURL(/\/events\/[^/]+/, { timeout: 10000 });
    
    // Extract event ID from URL
    const url = this.page.url();
    const match = url.match(/\/events\/([^/?]+)/);
    return match ? match[1] : '';
  }

  /**
   * Buys a ticket for the current event
   */
  async buyTicket(): Promise<void> {
    const buyButton = this.page.locator(
      'button:has-text("Acheter"), button:has-text("Buy"), [data-testid="buy-ticket"]'
    ).first();
    
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();
    await this.page.waitForURL(/\/(checkout|payment|order)/, { timeout: 15000 });
  }
}

/**
 * Ticket helpers
 */
export class TicketHelpers {
  constructor(private page: Page) {}

  /**
   * Navigates to the tickets page
   */
  async goToTickets(): Promise<void> {
    await this.page.goto('/tickets');
    await this.page.waitForSelector('.ticket-item, [data-testid="ticket-card"]', { timeout: 10000 });
  }

  /**
   * Gets the number of user's tickets
   */
  async getTicketCount(): Promise<number> {
    await this.goToTickets();
    const tickets = await this.page.locator('.ticket-item, [data-testid="ticket-card"]').count();
    return tickets;
  }

  /**
   * Checks if a ticket contains a QR code
   */
  async hasQRCode(ticketIndex: number = 0): Promise<boolean> {
    await this.goToTickets();
    const ticket = this.page.locator('.ticket-item, [data-testid="ticket-card"]').nth(ticketIndex);
    const qrCode = ticket.locator('img[alt*="QR"], canvas, [data-testid="qr-code"]');
    return await qrCode.isVisible();
  }
}

/**
 * Payment helpers
 */
export class PaymentHelpers {
  constructor(private page: Page) {}

  /**
   * Fills the Stripe payment form with a test card
   */
  async fillTestCard(): Promise<void> {
    // Wait for Stripe iframe to load
    const stripeFrame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    
    // Stripe test card: 4242 4242 4242 4242
    await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('[name="exp-date"]').fill('12/34');
    await stripeFrame.locator('[name="cvc"]').fill('123');
    await stripeFrame.locator('[name="postal"]').fill('12345');
  }

  /**
   * Submits the payment
   */
  async submitPayment(): Promise<void> {
    await this.page.click('button:has-text("Pay"), button:has-text("Payer"), [data-testid="submit-payment"]');
    
    // Wait for payment confirmation
    await this.page.waitForURL(/\/(success|confirmation|tickets)/, { timeout: 30000 });
  }
}

/**
 * General utilities
 */
export class TestUtils {
  /**
   * Generates a unique test user
   */
  static generateTestUser(): TestUser {
    const timestamp = Date.now();
    return {
      email: `test-${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: `Test User ${timestamp}`,
    };
  }

  /**
   * Waits for navigation to complete and stabilize
   */
  static async waitForStableNavigation(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small delay for animations
  }

  /**
   * Takes an annotated screenshot
   */
  static async takeAnnotatedScreenshot(
    page: Page,
    name: string,
    annotations?: { text: string; x: number; y: number }[]
  ): Promise<void> {
    if (annotations) {
      // Add annotations to the page
      for (const annotation of annotations) {
        await page.evaluate(
          ({ text, x, y }) => {
            const div = document.createElement('div');
            div.textContent = text;
            div.style.position = 'fixed';
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.backgroundColor = 'yellow';
            div.style.padding = '5px';
            div.style.border = '2px solid red';
            div.style.zIndex = '10000';
            document.body.appendChild(div);
          },
          annotation
        );
      }
    }

    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}

/**
 * Test extension with custom fixtures
 */
type CustomFixtures = {
  auth: AuthHelpers;
  events: EventHelpers;
  tickets: TicketHelpers;
  payment: PaymentHelpers;
  testUser: TestUser;
};

export const test = base.extend<CustomFixtures>({
  auth: async ({ page }, use) => {
    await use(new AuthHelpers(page));
  },
  events: async ({ page }, use) => {
    await use(new EventHelpers(page));
  },
  tickets: async ({ page }, use) => {
    await use(new TicketHelpers(page));
  },
  payment: async ({ page }, use) => {
    await use(new PaymentHelpers(page));
  },
  testUser: async ({}, use) => {
    await use(TestUtils.generateTestUser());
  },
});

export { expect };

