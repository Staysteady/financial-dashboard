import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation and Features', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real scenario, you'd want to set up authenticated state
    // For now, we'll test the dashboard directly since auth middleware is disabled
    await page.goto('/dashboard');
  });

  test('should display main dashboard correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/);
    
    // Check main navigation
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Accounts')).toBeVisible();
    await expect(page.locator('text=Transactions')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Goals')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
    
    // Check dashboard widgets
    await expect(page.locator('text=Account Overview')).toBeVisible();
    await expect(page.locator('text=Recent Transactions')).toBeVisible();
    await expect(page.locator('text=Spending Analysis')).toBeVisible();
    await expect(page.locator('text=Financial Health')).toBeVisible();
  });

  test('should navigate to accounts page', async ({ page }) => {
    await page.click('text=Accounts');
    await expect(page).toHaveURL('/dashboard/accounts');
    
    // Check accounts page elements
    await expect(page.locator('h1, h2')).toContainText(/Accounts/);
    await expect(page.locator('text=Add Account')).toBeVisible();
    
    // Should show account cards or empty state
    const accountCards = page.locator('[data-testid="account-card"]');
    const emptyState = page.locator('text=No accounts connected');
    await expect(accountCards.first().or(emptyState)).toBeVisible();
  });

  test('should navigate to transactions page', async ({ page }) => {
    await page.click('text=Transactions');
    await expect(page).toHaveURL('/dashboard/transactions');
    
    // Check transactions page elements
    await expect(page.locator('h1, h2')).toContainText(/Transactions/);
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Should show transaction filters
    await expect(page.locator('text=Filter')).toBeVisible();
    await expect(page.locator('text=Date Range')).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.click('text=Analytics');
    await expect(page).toHaveURL('/dashboard/analytics');
    
    // Check analytics page elements
    await expect(page.locator('h1, h2')).toContainText(/Analytics/);
    
    // Should show charts and analysis
    await expect(page.locator('text=Spending Analysis')).toBeVisible();
    await expect(page.locator('text=Category Breakdown')).toBeVisible();
    await expect(page.locator('text=Monthly Trends')).toBeVisible();
  });

  test('should navigate to goals page', async ({ page }) => {
    await page.click('text=Goals');
    await expect(page).toHaveURL('/dashboard/goals');
    
    // Check goals page elements
    await expect(page.locator('h1, h2')).toContainText(/Goals/);
    await expect(page.locator('text=Add Goal')).toBeVisible();
    
    // Should show goals or empty state
    const goalCards = page.locator('[data-testid="goal-card"]');
    const emptyState = page.locator('text=No financial goals');
    await expect(goalCards.first().or(emptyState)).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.click('text=Settings');
    await expect(page).toHaveURL('/dashboard/settings');
    
    // Check settings page elements
    await expect(page.locator('h1, h2')).toContainText(/Settings/);
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Preferences')).toBeVisible();
    await expect(page.locator('text=Security')).toBeVisible();
  });

  test('should display account overview widget with data', async ({ page }) => {
    // Check for account overview section
    const accountOverview = page.locator('text=Account Overview').locator('..');
    await expect(accountOverview).toBeVisible();
    
    // Should show total balance or placeholder
    await expect(page.locator('text=Total Balance').or(page.locator('text=£'))).toBeVisible();
    
    // Should show account count or cards
    const accountCount = page.locator('text=accounts').or(page.locator('[data-testid="account-card"]'));
    await expect(accountCount.first()).toBeVisible();
  });

  test('should display recent transactions widget', async ({ page }) => {
    const recentTransactions = page.locator('text=Recent Transactions').locator('..');
    await expect(recentTransactions).toBeVisible();
    
    // Should show transactions or empty state
    const transactionItems = page.locator('[data-testid="transaction-item"]');
    const emptyState = page.locator('text=No recent transactions');
    await expect(transactionItems.first().or(emptyState)).toBeVisible();
  });

  test('should display spending analysis chart', async ({ page }) => {
    const spendingAnalysis = page.locator('text=Spending Analysis').locator('..');
    await expect(spendingAnalysis).toBeVisible();
    
    // Check for chart elements (Recharts creates SVG elements)
    const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check that navigation adapts
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Check that widgets are still accessible
    await expect(page.locator('text=Account Overview')).toBeVisible();
    await expect(page.locator('text=Recent Transactions')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile navigation might be collapsed
    const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(page.locator('button[aria-label="Menu"]'));
    
    // If mobile menu exists, test it
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Accounts')).toBeVisible();
    } else {
      // Otherwise check that navigation is still accessible
      await expect(page.locator('text=Dashboard')).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Navigate to a page that might have loading states
    await page.click('text=Analytics');
    
    // Look for skeleton loaders or loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=Loading'));
    
    // If loading indicator appears, wait for it to disappear
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Content should be loaded
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation through dashboard
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key on navigation items
    await page.focus('text=Accounts');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/dashboard/accounts');
  });

  test('should display error states gracefully', async ({ page }) => {
    // This test assumes error boundaries are implemented
    // Navigate to a page that might trigger an error state
    await page.goto('/dashboard/nonexistent');
    
    // Should show 404 or error page
    const errorMessage = page.locator('text=404').or(page.locator('text=Page not found')).or(page.locator('text=Error'));
    await expect(errorMessage).toBeVisible();
  });

  test('should maintain navigation state on page refresh', async ({ page }) => {
    // Navigate to a specific page
    await page.click('text=Transactions');
    await expect(page).toHaveURL('/dashboard/transactions');
    
    // Refresh the page
    await page.reload();
    
    // Should stay on the same page
    await expect(page).toHaveURL('/dashboard/transactions');
    await expect(page.locator('text=Transactions')).toBeVisible();
  });
});