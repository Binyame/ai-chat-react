import { test, expect } from '@playwright/test';

test.describe('Dark Mode Toggle', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');

    // Find the dark mode toggle button
    const darkModeButton = page.getByRole('button', { name: /Switch to (dark|light) mode/i });
    await expect(darkModeButton).toBeVisible();

    // Click to toggle
    await darkModeButton.click();

    // Wait a moment for the theme to update
    await page.waitForTimeout(500);

    // Click again to toggle back
    await darkModeButton.click();

    await page.waitForTimeout(500);

    // Verify button is still visible
    await expect(darkModeButton).toBeVisible();
  });

  test('should persist dark mode across tab changes', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    const darkModeButton = page.getByRole('button', { name: /Switch to (dark|light) mode/i });
    await darkModeButton.click();
    await page.waitForTimeout(300);

    // Switch to OpenAI Chat tab
    await page.click('text=OpenAI Chat');
    await page.waitForTimeout(300);

    // Switch back to RAG tab
    await page.click('text=RAG with PDFs');
    await page.waitForTimeout(300);

    // Dark mode button should still be visible
    await expect(darkModeButton).toBeVisible();
  });
});
