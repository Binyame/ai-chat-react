# Playwright E2E Testing - Quick Reference

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Test Files

- **app-navigation.spec.ts** - Tab switching and navigation
- **dark-mode.spec.ts** - Dark mode toggle functionality
- **rag-chat.spec.ts** - RAG chat interface elements
- **responsive-design.spec.ts** - Mobile/tablet/desktop layouts

## Useful Commands

```bash
# Run specific test file
npx playwright test e2e/rag-chat.spec.ts

# Run tests in Chrome only
npm run test:e2e:chromium

# Debug a test
npx playwright test --debug

# View HTML report
npm run test:e2e:report

# Update snapshots
npx playwright test --update-snapshots
```

## Configuration

Tests are configured in `playwright.config.ts`:
- Auto-starts dev server on port 5173
- Tests Chrome, Firefox, Safari
- Mobile viewports: Pixel 5, iPhone 12
- Screenshots on failure
- Traces on retry

## Writing Tests

```typescript
import { test, expect } from '@playwright/test'

test('my test', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Hello')).toBeVisible()
})
```

## Debugging Tips

1. Use `--headed` to see browser
2. Use `--debug` to step through tests
3. Use `page.pause()` to pause execution
4. Check `playwright-report/` for screenshots
