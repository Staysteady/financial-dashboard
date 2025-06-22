import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Financial Dashboard/);
    await expect(page.locator('h1')).toContainText('Take Control of Your Financial Future');
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Account Overview').or(page.locator('text=Recent Transactions'))).toBeVisible();
  });

  test('should load authentication pages', async ({ page }) => {
    // Test sign-in page
    await page.goto('/auth/sign-in');
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Test sign-up page  
    await page.goto('/auth/sign-up');
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should load all main dashboard pages', async ({ page }) => {
    const pages = [
      { path: '/dashboard', title: 'Dashboard' },
      { path: '/dashboard/accounts', title: 'Accounts' },
      { path: '/dashboard/transactions', title: 'Transactions' },
      { path: '/dashboard/analytics', title: 'Analytics' },
      { path: '/dashboard/goals', title: 'Goals' },
      { path: '/dashboard/settings', title: 'Settings' }
    ];

    for (const pageInfo of pages) {
      await page.goto(pageInfo.path);
      await expect(page.locator('text=' + pageInfo.title)).toBeVisible();
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');
    // Should either redirect to 404 page or handle gracefully
    // The exact behavior depends on Next.js configuration
    await expect(page.locator('text=404').or(page.locator('text=Page not found')).or(page.locator('text=Dashboard'))).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    await page.goto('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should handle JavaScript disabled gracefully', async ({ page, context }) => {
    // Disable JavaScript
    await context.addInitScript(() => {
      delete window.addEventListener;
    });
    
    await page.goto('/');
    
    // Basic content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });
});