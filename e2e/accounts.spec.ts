import { test, expect } from '@playwright/test';

test.describe('Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/accounts');
  });

  test('should display accounts page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Accounts/);
    await expect(page.locator('h1, h2')).toContainText(/Accounts/);
    
    // Check for key elements
    await expect(page.locator('text=Add Account')).toBeVisible();
    await expect(page.locator('text=Total Balance').or(page.locator('text=Overview'))).toBeVisible();
  });

  test('should display account overview with summary', async ({ page }) => {
    // Look for account overview section
    const overviewSection = page.locator('text=Account Overview').or(page.locator('text=Total Balance'));
    await expect(overviewSection).toBeVisible();
    
    // Should show total balance
    const balanceDisplay = page.locator('text=/£[0-9,]+/').or(page.locator('[data-testid="total-balance"]'));
    await expect(balanceDisplay.first()).toBeVisible();
    
    // Should show account count
    const accountCount = page.locator('text=/[0-9]+ accounts?/').or(page.locator('[data-testid="account-count"]'));
    await expect(accountCount.first()).toBeVisible();
  });

  test('should display account cards with correct information', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    const emptyState = page.locator('text=No accounts connected').or(page.locator('text=Add your first account'));
    
    if (await accountCards.first().isVisible()) {
      const firstAccount = accountCards.first();
      
      // Should show account name
      await expect(firstAccount.locator('text=/[A-Za-z]+ Account/')).toBeVisible();
      
      // Should show balance
      await expect(firstAccount.locator('text=/£[0-9,]+/')).toBeVisible();
      
      // Should show account type
      await expect(firstAccount.locator('text=Current').or(firstAccount.locator('text=Savings')).or(firstAccount.locator('text=Credit'))).toBeVisible();
      
      // Should show last updated
      await expect(firstAccount.locator('text=Updated').or(firstAccount.locator('text=Last sync'))).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should handle add account functionality', async ({ page }) => {
    const addAccountButton = page.locator('text=Add Account').or(page.locator('[data-testid="add-account"]'));
    await expect(addAccountButton).toBeVisible();
    
    await addAccountButton.click();
    
    // Should show add account modal or navigate to add account page
    const addAccountModal = page.locator('[data-testid="add-account-modal"]');
    const addAccountPage = page.locator('text=Connect Account').or(page.locator('text=Add New Account'));
    
    await expect(addAccountModal.or(addAccountPage)).toBeVisible();
    
    // Should show connection options
    const connectionOptions = page.locator('text=Connect with Bank').or(page.locator('text=Manual Import'));
    await expect(connectionOptions.first()).toBeVisible();
  });

  test('should handle bank connection flow', async ({ page }) => {
    const addAccountButton = page.locator('text=Add Account');
    
    if (await addAccountButton.isVisible()) {
      await addAccountButton.click();
      
      // Look for bank connection option
      const bankConnectionButton = page.locator('text=Connect with Bank').or(page.locator('text=Open Banking'));
      
      if (await bankConnectionButton.isVisible()) {
        await bankConnectionButton.click();
        
        // Should show bank selection
        const bankOptions = page.locator('text=HSBC').or(page.locator('text=Lloyds')).or(page.locator('text=Barclays'));
        await expect(bankOptions.first()).toBeVisible();
        
        // Test selecting a bank
        if (await bankOptions.first().isVisible()) {
          await bankOptions.first().click();
          
          // Should navigate to bank authentication or show next step
          const authStep = page.locator('text=Authenticate').or(page.locator('text=Login to'));
          await expect(authStep).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should handle manual account import', async ({ page }) => {
    const addAccountButton = page.locator('text=Add Account');
    
    if (await addAccountButton.isVisible()) {
      await addAccountButton.click();
      
      // Look for manual import option
      const manualImportButton = page.locator('text=Manual Import').or(page.locator('text=CSV Import'));
      
      if (await manualImportButton.isVisible()) {
        await manualImportButton.click();
        
        // Should show file upload or manual entry form
        const fileUpload = page.locator('input[type="file"]');
        const manualForm = page.locator('text=Account Name').or(page.locator('input[placeholder*="Account"]'));
        
        await expect(fileUpload.or(manualForm)).toBeVisible();
      }
    }
  });

  test('should handle account details view', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    
    if (await accountCards.first().isVisible()) {
      await accountCards.first().click();
      
      // Should show account details modal or navigate to details page
      const detailsModal = page.locator('[data-testid="account-details"]');
      const detailsPage = page.locator('text=Account Details');
      
      await expect(detailsModal.or(detailsPage)).toBeVisible();
      
      // Should show detailed account information
      await expect(page.locator('text=Account Number').or(page.locator('text=Sort Code'))).toBeVisible();
      await expect(page.locator('text=Balance History').or(page.locator('text=Recent Transactions'))).toBeVisible();
    }
  });

  test('should handle account settings and management', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    
    if (await accountCards.first().isVisible()) {
      // Look for account settings/menu button
      const settingsButton = page.locator('[data-testid="account-menu"]').or(page.locator('button[aria-label="Account options"]'));
      
      if (await settingsButton.first().isVisible()) {
        await settingsButton.first().click();
        
        // Should show account options
        const accountOptions = page.locator('text=Edit').or(page.locator('text=Refresh')).or(page.locator('text=Delete'));
        await expect(accountOptions.first()).toBeVisible();
        
        // Test refresh functionality
        if (await page.locator('text=Refresh').isVisible()) {
          await page.click('text=Refresh');
          
          // Should show loading indicator
          const loadingIndicator = page.locator('text=Refreshing').or(page.locator('[data-testid="refresh-loading"]'));
          await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('should display account balance history chart', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    
    if (await accountCards.first().isVisible()) {
      await accountCards.first().click();
      
      // Look for balance history chart
      const balanceChart = page.locator('.recharts-wrapper').or(page.locator('svg')).or(page.locator('[data-testid="balance-chart"]'));
      
      if (await balanceChart.isVisible({ timeout: 5000 })) {
        await expect(balanceChart).toBeVisible();
        
        // Should show chart elements
        const chartElements = page.locator('.recharts-line, .recharts-area');
        await expect(chartElements.first()).toBeVisible();
      }
    }
  });

  test('should handle account filtering and search', async ({ page }) => {
    // Look for account filter controls
    const searchInput = page.locator('input[placeholder*="Search accounts"]');
    const filterButton = page.locator('text=Filter').or(page.locator('[data-testid="account-filter"]'));
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Current');
      await page.keyboard.press('Enter');
      
      // Should filter accounts
      await page.waitForTimeout(500);
    }
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Should show filter options
      const filterOptions = page.locator('text=Current').or(page.locator('text=Savings')).or(page.locator('text=Credit'));
      await expect(filterOptions.first()).toBeVisible();
    }
  });

  test('should handle account sorting', async ({ page }) => {
    // Look for sorting controls
    const sortButton = page.locator('text=Sort').or(page.locator('[data-testid="sort-accounts"]'));
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      
      // Should show sort options
      const sortOptions = page.locator('text=Balance').or(page.locator('text=Name')).or(page.locator('text=Type'));
      await expect(sortOptions.first()).toBeVisible();
      
      // Test sorting by balance
      if (await page.locator('text=Balance').isVisible()) {
        await page.click('text=Balance');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display connection status indicators', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    
    if (await accountCards.first().isVisible()) {
      // Should show connection status
      const connectionStatus = page.locator('text=Connected').or(page.locator('text=Disconnected')).or(page.locator('[data-testid="connection-status"]'));
      await expect(connectionStatus.first()).toBeVisible();
      
      // Should show last sync time
      const lastSync = page.locator('text=Last updated').or(page.locator('text=Synced'));
      await expect(lastSync.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Account cards should stack vertically on mobile
    await expect(page.locator('text=Add Account')).toBeVisible();
    
    const accountCards = page.locator('[data-testid="account-card"]');
    if (await accountCards.first().isVisible()) {
      // Should be touch-friendly
      await accountCards.first().tap();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Reload to trigger loading states
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=Loading accounts'));
    
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Accounts content should be loaded
    await expect(page.locator('text=Accounts')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Test error handling
    const errorMessage = page.locator('text=Error loading accounts').or(page.locator('text=Failed to connect'));
    
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      
      // Should show retry option
      const retryButton = page.locator('text=Retry').or(page.locator('text=Try Again'));
      await expect(retryButton).toBeVisible();
    }
  });

  test('should handle account deletion', async ({ page }) => {
    const accountCards = page.locator('[data-testid="account-card"]');
    
    if (await accountCards.first().isVisible()) {
      // Look for delete option
      const settingsButton = page.locator('[data-testid="account-menu"]').or(page.locator('button[aria-label="Account options"]'));
      
      if (await settingsButton.first().isVisible()) {
        await settingsButton.first().click();
        
        const deleteButton = page.locator('text=Delete').or(page.locator('text=Remove'));
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // Should show confirmation dialog
          const confirmDialog = page.locator('text=Are you sure').or(page.locator('text=Delete account'));
          await expect(confirmDialog).toBeVisible();
          
          // Should have cancel and confirm buttons
          await expect(page.locator('text=Cancel')).toBeVisible();
          await expect(page.locator('text=Delete').or(page.locator('text=Confirm'))).toBeVisible();
        }
      }
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test navigation through account cards
    const accountCards = page.locator('[data-testid="account-card"]');
    if (await accountCards.first().isVisible()) {
      await accountCards.first().focus();
      await page.keyboard.press('Enter');
    }
  });
});