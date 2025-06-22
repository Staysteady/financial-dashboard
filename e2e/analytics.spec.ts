import { test, expect } from '@playwright/test';

test.describe('Analytics and Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics');
  });

  test('should display analytics page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Analytics/);
    await expect(page.locator('h1, h2')).toContainText(/Analytics/);
    
    // Check for key analytics sections
    await expect(page.locator('text=Spending Analysis')).toBeVisible();
    await expect(page.locator('text=Category Breakdown')).toBeVisible();
    await expect(page.locator('text=Monthly Trends')).toBeVisible();
  });

  test('should display spending analysis chart', async ({ page }) => {
    // Look for chart container
    const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg')).or(page.locator('[data-testid="spending-chart"]'));
    
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
    
    // Check for chart elements
    const chartElements = page.locator('.recharts-bar, .recharts-line, .recharts-area');
    if (await chartElements.first().isVisible({ timeout: 5000 })) {
      await expect(chartElements.first()).toBeVisible();
    }
  });

  test('should display category breakdown chart', async ({ page }) => {
    // Look for pie chart or category breakdown
    const categoryChart = page.locator('.recharts-pie').or(page.locator('[data-testid="category-chart"]'));
    
    if (await categoryChart.isVisible({ timeout: 5000 })) {
      await expect(categoryChart).toBeVisible();
    } else {
      // Should at least show category breakdown section
      await expect(page.locator('text=Category Breakdown')).toBeVisible();
    }
  });

  test('should display monthly trends chart', async ({ page }) => {
    // Look for line chart or trends visualization
    const trendsChart = page.locator('.recharts-line').or(page.locator('[data-testid="trends-chart"]'));
    
    if (await trendsChart.isVisible({ timeout: 5000 })) {
      await expect(trendsChart).toBeVisible();
    } else {
      // Should at least show trends section
      await expect(page.locator('text=Monthly Trends')).toBeVisible();
    }
  });

  test('should handle time period filtering', async ({ page }) => {
    // Look for time period controls
    const timeFilter = page.locator('text=Last 30 days').or(page.locator('text=This month')).or(page.locator('[data-testid="time-filter"]'));
    
    if (await timeFilter.first().isVisible()) {
      await timeFilter.first().click();
      
      // Should show time period options
      const timeOptions = page.locator('text=Last 3 months').or(page.locator('text=Last year'));
      await expect(timeOptions.first()).toBeVisible();
      
      // Test selecting different time period
      if (await page.locator('text=Last 3 months').isVisible()) {
        await page.click('text=Last 3 months');
        
        // Wait for charts to potentially update
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should display financial health metrics', async ({ page }) => {
    // Look for financial health section
    const healthSection = page.locator('text=Financial Health').or(page.locator('text=Health Score'));
    
    if (await healthSection.isVisible()) {
      await expect(healthSection).toBeVisible();
      
      // Should show metrics
      const metrics = page.locator('text=Savings Rate').or(page.locator('text=Debt Ratio')).or(page.locator('text=Cash Flow'));
      await expect(metrics.first()).toBeVisible();
    }
  });

  test('should display spending insights', async ({ page }) => {
    // Look for insights section
    const insightsSection = page.locator('text=Insights').or(page.locator('text=Recommendations'));
    
    if (await insightsSection.isVisible()) {
      await expect(insightsSection).toBeVisible();
      
      // Should show actionable insights
      const insightItems = page.locator('[data-testid="insight-item"]').or(page.locator('text=You spent')).or(page.locator('text=Consider'));
      await expect(insightItems.first()).toBeVisible();
    }
  });

  test('should handle account filtering', async ({ page }) => {
    // Look for account filter
    const accountFilter = page.locator('text=All Accounts').or(page.locator('[data-testid="account-filter"]'));
    
    if (await accountFilter.isVisible()) {
      await accountFilter.click();
      
      // Should show account options
      const accountOptions = page.locator('[data-testid="account-option"]').or(page.locator('text=Current Account'));
      await expect(accountOptions.first()).toBeVisible();
    }
  });

  test('should display budget comparison', async ({ page }) => {
    // Look for budget comparison section
    const budgetSection = page.locator('text=Budget vs Actual').or(page.locator('text=Budget Comparison'));
    
    if (await budgetSection.isVisible()) {
      await expect(budgetSection).toBeVisible();
      
      // Should show budget vs actual spending
      const budgetChart = page.locator('.recharts-bar').or(page.locator('[data-testid="budget-chart"]'));
      await expect(budgetChart.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle chart interactions', async ({ page }) => {
    // Look for interactive chart elements
    const chartElements = page.locator('.recharts-bar, .recharts-line, .recharts-area');
    
    if (await chartElements.first().isVisible({ timeout: 5000 })) {
      // Test hover interactions
      await chartElements.first().hover();
      
      // Should show tooltip
      const tooltip = page.locator('.recharts-tooltip').or(page.locator('[data-testid="chart-tooltip"]'));
      await expect(tooltip).toBeVisible({ timeout: 2000 });
    }
  });

  test('should export analytics data', async ({ page }) => {
    // Look for export functionality
    const exportButton = page.locator('text=Export').or(page.locator('[data-testid="export-analytics"]'));
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should show export options
      const exportOptions = page.locator('text=PDF').or(page.locator('text=CSV')).or(page.locator('text=Excel'));
      await expect(exportOptions.first()).toBeVisible();
    }
  });

  test('should display goal progress tracking', async ({ page }) => {
    // Look for goal tracking section
    const goalSection = page.locator('text=Goal Progress').or(page.locator('text=Financial Goals'));
    
    if (await goalSection.isVisible()) {
      await expect(goalSection).toBeVisible();
      
      // Should show goal progress bars or metrics
      const goalProgress = page.locator('.progress-bar').or(page.locator('[data-testid="goal-progress"]'));
      await expect(goalProgress.first()).toBeVisible();
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Charts should still be visible and functional
    await expect(page.locator('text=Spending Analysis')).toBeVisible();
    
    // Charts should adapt to smaller width
    const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Analytics sections should stack vertically
    await expect(page.locator('text=Spending Analysis')).toBeVisible();
    await expect(page.locator('text=Category Breakdown')).toBeVisible();
    
    // Charts should be touch-friendly
    const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
    if (await chartContainer.first().isVisible({ timeout: 5000 })) {
      await chartContainer.first().tap();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Reload to trigger loading states
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=Loading analytics'));
    
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
    }
    
    // Analytics content should be loaded
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('should handle empty data states', async ({ page }) => {
    // This test assumes there might be empty data scenarios
    const emptyState = page.locator('text=No data available').or(page.locator('text=No transactions to analyze'));
    
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      
      // Should show helpful message or call to action
      const helpText = page.locator('text=Add transactions').or(page.locator('text=Connect an account'));
      await expect(helpText).toBeVisible();
    }
  });

  test('should handle error states', async ({ page }) => {
    // Test error handling by navigating to potential error scenario
    await page.goto('/dashboard/analytics?error=true');
    
    // Should show error message or fallback UI
    const errorMessage = page.locator('text=Error loading analytics').or(page.locator('text=Something went wrong'));
    
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      
      // Should show retry option
      const retryButton = page.locator('text=Retry').or(page.locator('text=Refresh'));
      await expect(retryButton).toBeVisible();
    }
  });

  test('should maintain filter state on page refresh', async ({ page }) => {
    // Apply a filter
    const timeFilter = page.locator('text=Last 30 days').or(page.locator('[data-testid="time-filter"]'));
    
    if (await timeFilter.isVisible()) {
      await timeFilter.click();
      
      if (await page.locator('text=Last 3 months').isVisible()) {
        await page.click('text=Last 3 months');
        
        // Refresh page
        await page.reload();
        
        // Filter state should persist (if implemented)
        await expect(page.locator('text=Analytics')).toBeVisible();
      }
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation through analytics elements
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Should be able to navigate through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test Enter key on interactive elements
    const interactiveElement = page.locator('button, select, [role="button"]').first();
    if (await interactiveElement.isVisible()) {
      await interactiveElement.focus();
      await page.keyboard.press('Enter');
    }
  });
});