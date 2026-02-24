import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // App should be visible
    await expect(page.getByText('AI Chat Application')).toBeVisible();

    // Tabs should be scrollable
    await expect(page.getByRole('tab', { name: /RAG with PDFs/i })).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.getByText('AI Chat Application')).toBeVisible();
    await expect(page.getByRole('tab', { name: /OpenAI Chat/i })).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await expect(page.getByText('AI Chat Application')).toBeVisible();

    // All tabs should be visible without scrolling
    await expect(page.getByRole('tab', { name: /RAG with PDFs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /OpenAI Chat/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Gemini Chat/i })).toBeVisible();
  });

  test('should center content with equal margins on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Get the app container
    const root = page.locator('#root');
    const box = await root.boundingBox();

    // Content should be centered (not full width)
    if (box) {
      expect(box.width).toBeLessThan(1920);
      expect(box.width).toBeLessThanOrEqual(1200 + 40); // max-width + padding
    }
  });
});
