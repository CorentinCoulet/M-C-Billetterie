# E2E Tests with Playwright 🎭

This folder contains the End-to-End (E2E) tests for the ticketing application, using Playwright.

## 📋 Table of Contents

- [Test Structure](#test-structure)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Fixtures and Helpers](#fixtures-and-helpers)
- [Best Practices](#best-practices)
- [Debugging](#debugging)

## 📁 Test Structure

```
tests/e2e/
├── fixtures.ts              # Reusable fixtures and helpers
├── critical-flows.spec.ts   # Critical flow tests (purchase, validation)
├── auth.spec.ts             # Authentication tests
└── README.md                # This file
```

## 🚀 Installation

Playwright dependencies are already installed. To install browsers:

```bash
yarn playwright install
```

To install a specific browser:

```bash
yarn playwright install chromium
yarn playwright install firefox
yarn playwright install webkit
```

## ▶️ Running Tests

### All E2E Tests

```bash
yarn test:e2e
```

### Tests with Interactive UI

```bash
yarn test:e2e:ui
```

### Tests in Headed Mode (see browser)

```bash
yarn test:e2e:headed
```

### Tests on a Specific Browser

```bash
yarn test:e2e:chromium   # Chrome/Chromium only
yarn test:e2e --project=firefox
yarn test:e2e --project=webkit
```

### A Specific Test File

```bash
yarn test:e2e critical-flows.spec.ts
yarn test:e2e auth.spec.ts
```

### Interactive Debug Mode

```bash
yarn test:e2e:debug
```

### View HTML Report

```bash
yarn test:e2e:report
```

## ✍️ Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('my feature', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('h1')).toHaveText('Success');
});
```

### With Custom Fixtures

```typescript
import { test, expect } from './fixtures';

test('buy a ticket', async ({ page, auth, events, testUser }) => {
  // Auto login with fixture
  await auth.registerAndLogin(testUser);
  
  // Use helpers
  const eventId = await events.selectFirstEvent();
  await events.buyTicket();
  
  // Assertions
  await expect(page).toHaveURL(/\/success/);
});
```

## 🛠️ Fixtures and Helpers

### AuthHelpers

```typescript
// Registration and login
await auth.registerAndLogin(testUser);

// Simple login
await auth.login('email@example.com', 'password');

// Logout
await auth.logout();

// Check if logged in
const isLoggedIn = await auth.isLoggedIn();
```

### EventHelpers

```typescript
// Navigate to events
await events.goToEvents();

// Select first event
const eventId = await events.selectFirstEvent();

// Buy a ticket
await events.buyTicket();
```

### TicketHelpers

```typescript
// Go to tickets page
await tickets.goToTickets();

// Count tickets
const count = await tickets.getTicketCount();

// Check for QR code presence
const hasQR = await tickets.hasQRCode(0);
```

### PaymentHelpers

```typescript
// Fill Stripe test card
await payment.fillTestCard();

// Submit payment
await payment.submitPayment();
```

### TestUtils

```typescript
import { TestUtils } from './fixtures';

// Generate unique test user
const user = TestUtils.generateTestUser();

// Wait for page to stabilize
await TestUtils.waitForStableNavigation(page);

// Screenshot with annotations
await TestUtils.takeAnnotatedScreenshot(page, 'step-1', [
  { text: 'Click here', x: 100, y: 200 }
]);
```

## ✅ Best Practices

### 1. Use Stable Selectors

```typescript
// ✅ GOOD - data-testid
await page.click('[data-testid="buy-button"]');

// ✅ GOOD - role + name
await page.click('button:has-text("Buy")');

// ❌ BAD - fragile CSS class
await page.click('.btn-primary-v2');
```

### 2. Wait Explicitly

```typescript
// ✅ GOOD
await expect(page.locator('.ticket')).toBeVisible({ timeout: 10000 });

// ❌ BAD - fixed timeout
await page.waitForTimeout(5000);
```

### 3. Isolate Tests

```typescript
test.beforeEach(async ({ page }) => {
  // Each test starts clean
  await page.goto('/');
});

// Use unique data
const timestamp = Date.now();
const email = `test-${timestamp}@example.com`;
```

### 4. Use test.step for Clarity

```typescript
test('complete flow', async ({ page }) => {
  await test.step('Registration', async () => {
    // ...
  });
  
  await test.step('Purchase', async () => {
    // ...
  });
});
```

### 5. Handle Errors

```typescript
// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Console error:', msg.text());
  }
});

// Capture failed requests
page.on('requestfailed', request => {
  console.error('Failed request:', request.url());
});
```

## 🐛 Debugging

### 1. Interactive Debug Mode

```bash
yarn test:e2e:debug
```

### 2. See Tests Running

```bash
yarn test:e2e:headed
```

### 3. UI Mode (recommended)

```bash
yarn test:e2e:ui
```

### 4. Screenshots and Traces

```typescript
// Automatic screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full trace (automatically enabled on failure)
// See in playwright-report/
```

### 5. Pause in a Test

```typescript
await page.pause(); // Opens Playwright inspector
```

### 6. Debug Logs

```bash
DEBUG=pw:api yarn test:e2e
```

## 🎯 Critical Tests to Write

### ✅ Already Implemented

- ✅ Registration → Login → Purchase → Ticket Reception
- ✅ Authentication (login, logout, forgot password)
- ✅ Auth security (rate limiting, XSS, session)

### 🔜 To Implement

- [ ] QR code validation by organizer
- [ ] Order refund
- [ ] Multi-event management
- [ ] Multiple shopping cart
- [ ] Email notifications
- [ ] User profile
- [ ] Organizer dashboard

## 📊 Reports

Test reports are generated in:
- `playwright-report/` - Interactive HTML report
- `playwright-report/results.json` - JSON results

To view the report:

```bash
yarn test:e2e:report
```

## 🔧 Configuration

Configuration is in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit + Mobile
- **Base URL**: `http://localhost:3000`
- **Retry**: 2 times on CI, 0 locally
- **Traces**: Enabled on failure
- **Screenshots**: On failure only
- **Video**: Kept on failure

## 🚨 Troubleshooting

### "Browser not installed" Error

```bash
yarn playwright install
```

### Test Timeout

Increase timeout in test:

```typescript
test('my test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Flaky Tests

- Use explicit waits with `expect().toBeVisible()`
- Avoid `waitForTimeout()`
- Add `waitForLoadState('networkidle')`

### Dev Server Won't Start

Check if port 3000 is free:

```bash
netstat -ano | findstr :3000
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [Selectors](https://playwright.dev/docs/selectors)

---

**Note**: These E2E tests are designed to validate critical application flows. They complement existing unit and integration tests.
