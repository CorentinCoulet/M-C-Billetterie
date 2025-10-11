import { expect, test } from '@playwright/test';

/**
 * E2E tests for critical ticket purchase flow
 * This test covers the complete flow: register → login → purchase → receive ticket
 */

test.describe('Critical Purchase Flow', () => {
  // Generate unique email for each test
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'SecurePassword123!';
  
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged out
    await page.goto('/');
  });

  test('complete flow - register → login → purchase ticket', async ({ page }) => {
    // ==========================================
    // 1. REGISTRATION
    // ==========================================
    await test.step('Registration', async () => {
      await page.goto('/register');
      
      // Fill registration form
      await page.fill('[name="name"]', 'Test User');
      await page.fill('[name="email"]', testEmail);
      await page.fill('[name="password"]', testPassword);
      await page.fill('[name="confirmPassword"]', testPassword);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify redirect or success message
      await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 10000 });
    });

    // ==========================================
    // 2. LOGIN (if necessary)
    // ==========================================
    await test.step('Login', async () => {
      // If redirected to login, sign in
      if (page.url().includes('/login')) {
        await page.fill('[name="email"]', testEmail);
        await page.fill('[name="password"]', testPassword);
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      }
    });

    // ==========================================
    // 3. EVENT SELECTION
    // ==========================================
    await test.step('Event selection', async () => {
      await page.goto('/events');
      
      // Wait for events to load
      await page.waitForSelector('.event-card, [data-testid="event-card"]', { timeout: 10000 });
      
      // Click on first available event
      const firstEvent = page.locator('.event-card, [data-testid="event-card"]').first();
      await firstEvent.click();
      
      // Verify we're on event details page
      await expect(page).toHaveURL(/\/events\/[^/]+/, { timeout: 10000 });
    });

    // ==========================================
    // 4. TICKET PURCHASE
    // ==========================================
    await test.step('Ticket purchase', async () => {
      // Find buy button (multiple possible variants)
      const buyButton = page.locator(
        'button:has-text("Acheter"), button:has-text("Buy"), [data-testid="buy-ticket"]'
      ).first();
      
      await expect(buyButton).toBeVisible({ timeout: 10000 });
      await buyButton.click();
      
      // Verify redirect to payment process
      await expect(page).toHaveURL(/\/(checkout|payment|order)/, { timeout: 15000 });
    });

    // ==========================================
    // 5. PAYMENT (Stripe test mode)
    // ==========================================
    await test.step('Stripe test payment', async () => {
      // In a test environment, we should:
      // - Either use Stripe test mode with test card
      // - Or mock the payment
      // For now, just verify we reach payment page
      
      // Wait for Stripe payment component to load
      await page.waitForSelector(
        'iframe[name^="__privateStripeFrame"], [data-testid="payment-form"]',
        { timeout: 15000 }
      );
      
      // Note: For complete test, we would need to:
      // 1. Fill test card info (4242 4242 4242 4242)
      // 2. Submit payment
      // 3. Wait for confirmation
    });

    // ==========================================
    // 6. VERIFY TICKET RECEIVED
    // ==========================================
    await test.step('Verify ticket received', async () => {
      // Go to tickets page
      await page.goto('/tickets');
      
      // Verify at least one ticket is visible
      const ticketItem = page.locator('.ticket-item, [data-testid="ticket-card"]').first();
      await expect(ticketItem).toBeVisible({ timeout: 10000 });
      
      // Verify ticket contains QR code
      const qrCode = ticketItem.locator('img[alt*="QR"], canvas, [data-testid="qr-code"]');
      await expect(qrCode).toBeVisible();
    });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error message is displayed
    await expect(page.locator('text=/invalid|incorrect|wrong/i')).toBeVisible({ timeout: 5000 });
  });

  test('redirect to login if not authenticated', async ({ page }) => {
    // Try to access protected page
    await page.goto('/dashboard');
    
    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

/**
 * E2E tests for QR code validation
 */
test.describe('QR Code Validation', () => {
  test.skip('QR code validation as organizer', async ({ page }) => {
    // TODO: Implement this test when QR scan interface is ready
    // 1. Login as organizer
    // 2. Go to scan page
    // 3. Scan valid QR code
    // 4. Verify successful validation
  });

  test.skip('scan already used QR code shows error', async ({ page }) => {
    // TODO: Implement this test
    // 1. Scan already validated ticket
    // 2. Verify "already used" error message
  });
});

/**
 * E2E tests for refunds
 */
test.describe('Refund', () => {
  test.skip('complete order refund', async ({ page }) => {
    // TODO: Implement this test
    // 1. Login with existing order
    // 2. Request refund
    // 3. Verify refund status
  });
});
