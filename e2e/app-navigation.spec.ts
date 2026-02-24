import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check that the app header is visible
    await expect(page.getByText('AI Chat Application')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/');

    // Click on OpenAI Chat tab
    await page.click('text=OpenAI Chat');
    await expect(page.getByText('Direct chat with')).toBeVisible();
    // Use getByRole to target the alert specifically (avoids duplicate text in welcome message)
    await expect(page.getByRole('alert').getByText('GPT-3.5 Turbo')).toBeVisible();

    // Click on Gemini Chat tab
    await page.click('text=Gemini Chat');
    await expect(page.getByText('Connected to')).toBeVisible();

    // Click on RAG with PDFs tab
    await page.click('text=RAG with PDFs');
    await expect(page.getByText('Upload PDFs and ask questions')).toBeVisible();
  });

  test('should have all three tabs visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('tab', { name: /RAG with PDFs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /OpenAI Chat/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Gemini Chat/i })).toBeVisible();
  });
});
