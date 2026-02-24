# Testing Setup Guide

This project now has a comprehensive testing setup using **Vitest** and **React Testing Library** for unit/component tests.

## What's Been Set Up

### 1. Test Configuration
- ✅ Vitest configured in `vitest.config.ts`
- ✅ Jest DOM matchers via `@testing-library/jest-dom`
- ✅ Test setup file in `src/tests/setup.ts`
- ✅ Custom render utility with providers in `src/tests/test-utils.tsx`

### 2. Test Scripts (package.json)
```bash
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
npm run test:ui       # Run tests with UI dashboard
npm run test:coverage # Generate coverage report
```

### 3. Example Tests Created

#### Unit Tests (`src/tests/unit/citationToggle.test.ts`)
- Tests for citation toggle logic using Set data structures
- Tests for citation visibility management
- All 4 tests passing ✅

#### Component Tests (`src/tests/components/ChatComponent.test.tsx`)
- Tests for ChatComponent rendering
- Tests for user interactions
- Example of how to write component tests

## Running Tests

### Quick Start
```bash
# Run all tests once
npm test -- --run

# Run tests in watch mode (auto-rerun on changes)
npm test

# Run with UI
npm run test:ui
```

### Writing New Tests

**File Structure:**
```
src/tests/
├── setup.ts                    # Test configuration
├── test-utils.tsx              # Custom render with providers
├── unit/                       # Unit tests
│   └── citationToggle.test.ts
└── components/                 # Component tests
    └── ChatComponent.test.tsx
```

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import MyComponent from '../../components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText(/some text/i)).toBeInTheDocument()
  })
})
```

## What to Test

### High Priority (Unit Tests - Jest/Vitest)
- ✅ Citation toggle logic (4 tests)
- ✅ Message formatting utilities (20 tests)
- [ ] API response parsing
- [ ] Form validation logic
- [ ] State management functions

### Medium Priority (Component Tests - Jest/Vitest)
- ✅ ChatComponent basic rendering (4 tests)
- ✅ RAGChatComponent file upload (18 tests)
- [ ] GeminiChatComponent UI
- [ ] Dark mode toggle
- [ ] Session manager
- [ ] Error boundaries

### E2E Tests (Playwright) ✅ READY
- ✅ App navigation and tab switching
- ✅ Dark mode toggle functionality
- ✅ RAG chat UI elements
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Manage collections dialog

## Playwright E2E Testing

### Running E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run only Chromium tests
npm run test:e2e:chromium

# Show test report
npm run test:e2e:report
```

### Available E2E Tests

1. **`e2e/app-navigation.spec.ts`**
   - App loads correctly
   - Tab navigation works
   - All tabs are visible

2. **`e2e/dark-mode.spec.ts`**
   - Dark mode toggle works
   - Dark mode persists across tab changes

3. **`e2e/rag-chat.spec.ts`**
   - Welcome message displays
   - PDF upload zone exists
   - Document collection selector works
   - Message input and send button work
   - Manage collections dialog opens/closes

4. **`e2e/responsive-design.spec.ts`**
   - Mobile viewport (375x667)
   - Tablet viewport (768x1024)
   - Desktop viewport (1920x1080)
   - Content centering verification

### Writing New E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('my new feature', async ({ page }) => {
  await page.goto('/')

  // Your test code here
  await expect(page.getByText('Something')).toBeVisible()
})
```

### Test Configuration

Playwright is configured to:
- Automatically start dev server (`npm run dev`)
- Test on Chrome, Firefox, Safari, and mobile browsers
- Capture screenshots on failure
- Record traces on retry
- Run tests in parallel

## Troubleshooting

### "Too many open files" error
Already fixed in `vitest.config.ts` with `pool: 'forks'` and `singleFork: true`.

### Tests timeout
Increase timeout in test file:
```typescript
it('slow test', async () => {
  // test code
}, { timeout: 10000 }) // 10 seconds
```

### Mock API calls
```typescript
import { vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

mockedAxios.post.mockResolvedValue({ data: { message: 'Hello' } })
```

## Coverage Goals

- **Unit tests:** Aim for 70-80% coverage
- **Component tests:** Cover critical user paths
- **E2E tests:** Test 2-3 main user flows

Run `npm run test:coverage` to see current coverage.

## Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
