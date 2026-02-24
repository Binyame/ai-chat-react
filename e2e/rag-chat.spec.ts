import { test, expect } from '@playwright/test';

test.describe('RAG Chat Flow', () => {
  test('should display welcome message on RAG tab', async ({ page }) => {
    await page.goto('/');

    // RAG tab should be active by default
    await expect(page.getByText('Welcome to RAG Chat')).toBeVisible();
    await expect(page.getByText('Upload PDF documents and ask questions')).toBeVisible();
  });

  test('should have PDF upload zone', async ({ page }) => {
    await page.goto('/');

    // Check for upload zone
    await expect(page.getByText('Drop PDF here or click to browse')).toBeVisible();
    await expect(page.getByText('Supports PDF files up to 50MB')).toBeVisible();
  });

  test('should have document collection selector', async ({ page }) => {
    await page.goto('/');

    // Check for namespace selector
    const selector = page.getByLabel('Document Collection');
    await expect(selector).toBeVisible();

    // Check for manage button
    await expect(page.getByRole('button', { name: /Manage Collections/i })).toBeVisible();
  });

  test('should have message input and send button', async ({ page }) => {
    await page.goto('/');

    // Check for input field
    const input = page.getByPlaceholder('Ask a question about your documents...');
    await expect(input).toBeVisible();

    // Check for send button (should be disabled when input is empty)
    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toBeDisabled();
  });

  test('should enable send button when text is entered', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Ask a question about your documents...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    // Type in input
    await input.fill('What is machine learning?');

    // Send button should now be enabled
    await expect(sendButton).toBeEnabled();

    // Clear input
    await input.clear();

    // Send button should be disabled again
    await expect(sendButton).toBeDisabled();
  });

  test('should open manage collections dialog', async ({ page }) => {
    await page.goto('/');

    // Click manage collections button
    await page.click('button:has-text("Manage Collections")');

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Manage Document Collections')).toBeVisible();

    // Close dialog
    await page.click('button:has-text("Close")');

    // Dialog should be hidden
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
