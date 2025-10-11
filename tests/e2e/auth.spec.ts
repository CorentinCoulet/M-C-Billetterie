import { expect, test } from '@playwright/test';

/**
 * E2E tests for authentication
 * Covers: registration, login, logout, password recovery
 */

test.describe('Authentication', () => {
  const timestamp = Date.now();
  const testEmail = `auth-test-${timestamp}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Auth Test User';

  test('registration with valid data', async ({ page }) => {
    await page.goto('/register');

    // Fill form
    await page.fill('[name="name"]', testName);
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', testPassword);
    await page.fill('[name="confirmPassword"]', testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect (dashboard or login)
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
    
    // If redirected to dashboard, verify user is logged in
    if (page.url().includes('/dashboard')) {
      const userName = page.locator('text=' + testName);
      await expect(userName).toBeVisible({ timeout: 5000 });
    }
  });

  test('registration with existing email shows error', async ({ page }) => {
    // Use email that already exists (from previous test)
    await page.goto('/register');

    await page.fill('[name="name"]', 'Another User');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', testPassword);
    await page.fill('[name="confirmPassword"]', testPassword);

    await page.click('button[type="submit"]');

    // Verify error message
    const errorMessage = page.locator('text=/already exists|déjà utilisé|taken/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('registration with non-matching passwords', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="name"]', testName);
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', testPassword);
    await page.fill('[name="confirmPassword"]', 'DifferentPassword123!');

    await page.click('button[type="submit"]');

    // Verify error message
    const errorMessage = page.locator('text=/password.*match|mots de passe.*correspondent/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Use existing test account or previously created one
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', testPassword);

    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('login with invalid email', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', testPassword);

    await page.click('button[type="submit"]');

    // Verify validation error message
    const errorMessage = page.locator('text=/invalid.*email|email.*invalide/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('login with incorrect password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]');

    // Verify error message
    const errorMessage = page.locator('text=/invalid.*credentials|identifiants.*invalides/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('logout works correctly', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Find and click logout button
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Déconnexion"), [data-testid="logout-button"]'
    );
    await logoutButton.click();

    // Verify redirect to home page or login
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });

    // Verify we can no longer access dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('forgot password sends reset email', async ({ page }) => {
    await page.goto('/login');

    // Click "Forgot password"
    const forgotPasswordLink = page.locator('a:has-text("Forgot password"), a:has-text("Mot de passe oublié")');
    await forgotPasswordLink.click();

    // Fill email
    await page.fill('[name="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Verify confirmation message
    const successMessage = page.locator('text=/email.*sent|email.*envoyé|check.*email/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('accessing protected page without auth redirects to login', async ({ page }) => {
    // Try to access various protected pages
    const protectedPages = ['/dashboard', '/tickets', '/orders'];

    for (const pagePath of protectedPages) {
      await page.goto(pagePath);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });

  test('password change requires old password', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Go to password change page
    await page.goto('/dashboard/settings'); // or /profile/security

    // Try to change without old password
    await page.fill('[name="newPassword"]', 'NewPassword123!');
    await page.fill('[name="confirmPassword"]', 'NewPassword123!');
    await page.click('button:has-text("Change password"), button:has-text("Changer")');

    // Verify error message
    const errorMessage = page.locator('text=/current.*password|ancien.*mot de passe/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Security tests for authentication
 */
test.describe('Authentication Security', () => {
  test('multiple failed login attempts trigger rate limiting', async ({ page }) => {
    await page.goto('/login');

    // Try to login 6 times with wrong password
    for (let i = 0; i < 6; i++) {
      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', `WrongPassword${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Verify rate limiting message
    const rateLimitMessage = page.locator('text=/too many.*attempts|trop.*tentatives|blocked/i');
    await expect(rateLimitMessage).toBeVisible({ timeout: 5000 });
  });

  test('XSS in form fields is escaped', async ({ page }) => {
    await page.goto('/register');

    const xssPayload = '<script>alert("XSS")</script>';
    
    await page.fill('[name="name"]', xssPayload);
    await page.fill('[name="email"]', 'xss-test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');

    await page.click('button[type="submit"]');

    // Verify no JavaScript alert is triggered
    page.on('dialog', async dialog => {
      test.fail(); // Test should fail if dialog appears
      await dialog.dismiss();
    });

    await page.waitForTimeout(2000);
  });

  test('session expires after inactivity', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Simulate long period of inactivity (by modifying cookie/localStorage)
    // Note: This test requires adjusting session duration for testing
    await page.evaluate(() => {
      // Modify JWT token expiration date
      const storage = localStorage.getItem('auth-token');
      if (storage) {
        const token = JSON.parse(storage);
        token.expiresAt = Date.now() - 1000; // Expire token
        localStorage.setItem('auth-token', JSON.stringify(token));
      }
    });

    // Refresh page
    await page.reload();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
