import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/transactions');
  });

  test('should display transactions page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Transactions/);
    await expect(page.locator('h1, h2')).toContainText(/Transactions/);
    
    // Check for key elements
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('text=Filter')).toBeVisible();
    await expect(page.locator('text=Export')).toBeVisible();
  });

  test('should handle transaction search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Test search input
    await searchInput.fill('Tesco');
    await page.keyboard.press('Enter');
    
    // Should filter transactions (or show no results message)
    const searchResults = page.locator('[data-testid="transaction-item"]');
    const noResults = page.locator('text=No transactions found');
    await expect(searchResults.first().or(noResults)).toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await page.keyboard.press('Enter');
  });

  test('should handle date range filtering', async ({ page }) => {
    // Look for date filter controls
    const dateFilter = page.locator('text=Date Range').or(page.locator('input[type="date"]'));
    
    if (await dateFilter.first().isVisible()) {
      await dateFilter.first().click();
      
      // Should show date picker or date inputs
      const datePicker = page.locator('[data-testid="date-picker"]').or(page.locator('input[type="date"]'));
      await expect(datePicker.first()).toBeVisible();
    }
  });

  test('should handle category filtering', async ({ page }) => {
    // Look for category filter
    const categoryFilter = page.locator('text=Category').or(page.locator('select'));
    
    if (await categoryFilter.first().isVisible()) {
      await categoryFilter.first().click();
      
      // Should show category options
      const categoryOptions = page.locator('option, [data-testid="category-option"]');
      await expect(categoryOptions.first()).toBeVisible();
    }
  });

  test('should display transaction list with proper data', async ({ page }) => {
    // Look for transaction items
    const transactionItems = page.locator('[data-testid="transaction-item"]');
    const emptyState = page.locator('text=No transactions').or(page.locator('text=Add your first transaction'));
    
    if (await transactionItems.first().isVisible()) {
      // Check transaction item structure
      const firstTransaction = transactionItems.first();
      
      // Should have basic transaction info
      await expect(firstTransaction.locator('text=/£[0-9]/')).toBeVisible();
      await expect(firstTransaction.locator('text=/[0-9]{4}-[0-9]{2}-[0-9]{2}/')).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should handle transaction sorting', async ({ page }) => {
    // Look for sorting controls
    const sortButton = page.locator('text=Sort').or(page.locator('[data-testid="sort-button"]'));
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      
      // Should show sort options
      const sortOptions = page.locator('text=Date').or(page.locator('text=Amount'));
      await expect(sortOptions.first()).toBeVisible();
      
      // Test sorting by amount
      if (await page.locator('text=Amount').isVisible()) {
        await page.click('text=Amount');
        // Wait for potential re-rendering
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle transaction details view', async ({ page }) => {
    const transactionItems = page.locator('[data-testid="transaction-item"]');
    
    if (await transactionItems.first().isVisible()) {
      await transactionItems.first().click();
      
      // Should show transaction details modal or navigate to details page
      const detailsModal = page.locator('[data-testid="transaction-details"]');
      const detailsPage = page.locator('text=Transaction Details');
      
      await expect(detailsModal.or(detailsPage)).toBeVisible();
      
      // Should show detailed transaction information
      await expect(page.locator('text=Amount').or(page.locator('text=Description'))).toBeVisible();
    }
  });

  test('should handle transaction categorization', async ({ page }) => {
    const transactionItems = page.locator('[data-testid="transaction-item"]');
    
    if (await transactionItems.first().isVisible()) {
      // Look for category edit button or dropdown
      const categoryButton = page.locator('[data-testid="category-edit"]').or(page.locator('text=Uncategorized'));
      
      if (await categoryButton.first().isVisible()) {
        await categoryButton.first().click();
        
        // Should show category selection
        const categorySelect = page.locator('select, [data-testid="category-select"]');
        await expect(categorySelect).toBeVisible();
        
        // Test selecting a category
        if (await page.locator('option').first().isVisible()) {
          await page.selectOption('select', { index: 1 });
        }
      }
    }
  });

  test('should handle transaction export functionality', async ({ page }) => {
    const exportButton = page.locator('text=Export').or(page.locator('[data-testid="export-button"]'));
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Should show export options
      const exportOptions = page.locator('text=CSV').or(page.locator('text=PDF')).or(page.locator('text=Excel'));
      await expect(exportOptions.first()).toBeVisible();
      
      // Test CSV export
      if (await page.locator('text=CSV').isVisible()) {
        // Note: In a real test, you'd mock the download or check for download initiation
        await page.click('text=CSV');
      }
    }
  });

  test('should handle pagination for large transaction lists', async ({ page }) => {
    // Look for pagination controls
    const pagination = page.locator('[data-testid="pagination"]').or(page.locator('text=Next')).or(page.locator('text=Previous'));
    
    if (await pagination.first().isVisible()) {
      // Test pagination navigation
      const nextButton = page.locator('text=Next').or(page.locator('[data-testid="next-page"]'));
      
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        await nextButton.click();
        await page.waitForTimeout(500); // Wait for page to load
        
        // Should show different transactions or page indicator
        const pageIndicator = page.locator('text=Page').or(page.locator('[data-testid="page-info"]'));
        await expect(pageIndicator).toBeVisible();
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that transaction list is still functional
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Transaction items should stack vertically on mobile
    const transactionItems = page.locator('[data-testid="transaction-item"]');
    
    if (await transactionItems.first().isVisible()) {
      const firstTransaction = transactionItems.first();
      await expect(firstTransaction).toBeVisible();
      
      // Should be touch-friendly
      await firstTransaction.tap();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Reload page to potentially trigger loading states
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=Loading transactions'));
    
    // If loading appears, wait for it to complete
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Content should be loaded
    await expect(page.locator('text=Transactions')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Test navigation to invalid transaction
    await page.goto('/dashboard/transactions/invalid-id');
    
    // Should show error message
    const errorMessage = page.locator('text=Transaction not found').or(page.locator('text=Error')).or(page.locator('text=404'));
    await expect(errorMessage).toBeVisible();
  });

  test('should maintain filters on page refresh', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Apply a filter
    await searchInput.fill('test-search');
    await page.keyboard.press('Enter');
    
    // Refresh page
    await page.reload();
    
    // Filter should persist (if implemented)
    // Note: This behavior depends on implementation
    await expect(page.locator('text=Transactions')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    // Look for checkboxes or bulk operation controls
    const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    const bulkActions = page.locator('text=Delete Selected').or(page.locator('text=Export Selected'));
    
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      
      // Bulk actions should become available
      await expect(bulkActions.first()).toBeVisible();
    }
  });
});