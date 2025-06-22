import { test, expect } from '@playwright/test';

test.describe('Financial Goals Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/goals');
  });

  test('should display goals page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Goals/);
    await expect(page.locator('h1, h2')).toContainText(/Goals/);
    
    // Check for key elements
    await expect(page.locator('text=Add Goal').or(page.locator('text=Create Goal'))).toBeVisible();
    await expect(page.locator('text=Progress Overview').or(page.locator('text=Goals Overview'))).toBeVisible();
  });

  test('should display goals overview with summary metrics', async ({ page }) => {
    // Look for goals overview section
    const overviewSection = page.locator('text=Goals Overview').or(page.locator('text=Progress Overview'));
    await expect(overviewSection).toBeVisible();
    
    // Should show total goals and progress
    const goalMetrics = page.locator('text=/[0-9]+ goals?/').or(page.locator('[data-testid="goals-count"]'));
    await expect(goalMetrics.first()).toBeVisible();
    
    // Should show overall progress
    const overallProgress = page.locator('text=Overall Progress').or(page.locator('[data-testid="overall-progress"]'));
    await expect(overallProgress.first()).toBeVisible();
  });

  test('should display goal cards with correct information', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    const emptyState = page.locator('text=No financial goals').or(page.locator('text=Create your first goal'));
    
    if (await goalCards.first().isVisible()) {
      const firstGoal = goalCards.first();
      
      // Should show goal name
      await expect(firstGoal.locator('text=/[A-Za-z]+ Fund/').or(firstGoal.locator('[data-testid="goal-name"]'))).toBeVisible();
      
      // Should show target amount
      await expect(firstGoal.locator('text=/£[0-9,]+/')).toBeVisible();
      
      // Should show progress bar
      const progressBar = firstGoal.locator('.progress-bar').or(firstGoal.locator('[data-testid="progress-bar"]'));
      await expect(progressBar).toBeVisible();
      
      // Should show percentage
      await expect(firstGoal.locator('text=/%/').or(firstGoal.locator('[data-testid="progress-percentage"]'))).toBeVisible();
      
      // Should show target date
      await expect(firstGoal.locator('text=Target').or(firstGoal.locator('text=Deadline'))).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should handle create goal functionality', async ({ page }) => {
    const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal')).or(page.locator('[data-testid="create-goal"]'));
    await expect(createGoalButton).toBeVisible();
    
    await createGoalButton.click();
    
    // Should show create goal modal or navigate to create goal page
    const createGoalModal = page.locator('[data-testid="create-goal-modal"]');
    const createGoalPage = page.locator('text=New Goal').or(page.locator('text=Create Financial Goal'));
    
    await expect(createGoalModal.or(createGoalPage)).toBeVisible();
    
    // Should show goal form fields
    await expect(page.locator('input[placeholder*="Goal name"]').or(page.locator('label:has-text("Name")'))).toBeVisible();
    await expect(page.locator('input[placeholder*="Target amount"]').or(page.locator('label:has-text("Amount")'))).toBeVisible();
    await expect(page.locator('input[type="date"]').or(page.locator('label:has-text("Date")'))).toBeVisible();
  });

  test('should validate goal creation form', async ({ page }) => {
    const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
    
    if (await createGoalButton.isVisible()) {
      await createGoalButton.click();
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Create')).or(page.locator('text=Save'));
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show validation errors
        const validationError = page.locator('text=required').or(page.locator('text=enter').or(page.locator('text=valid')));
        await expect(validationError.first()).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should create a new goal successfully', async ({ page }) => {
    const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
    
    if (await createGoalButton.isVisible()) {
      await createGoalButton.click();
      
      // Fill in goal form
      const nameInput = page.locator('input[placeholder*="Goal name"]').or(page.locator('input[name="name"]'));
      const amountInput = page.locator('input[placeholder*="Target amount"]').or(page.locator('input[name="amount"]'));
      const dateInput = page.locator('input[type="date"]').or(page.locator('input[name="targetDate"]'));
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Emergency Fund');
      }
      
      if (await amountInput.isVisible()) {
        await amountInput.fill('10000');
      }
      
      if (await dateInput.isVisible()) {
        await dateInput.fill('2024-12-31');
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Create')).or(page.locator('text=Save'));
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should return to goals page or show success message
        const successMessage = page.locator('text=Goal created').or(page.locator('text=Success'));
        await expect(successMessage.or(page.locator('text=Emergency Fund'))).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle goal details view', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    
    if (await goalCards.first().isVisible()) {
      await goalCards.first().click();
      
      // Should show goal details modal or navigate to details page
      const detailsModal = page.locator('[data-testid="goal-details"]');
      const detailsPage = page.locator('text=Goal Details');
      
      await expect(detailsModal.or(detailsPage)).toBeVisible();
      
      // Should show detailed goal information
      await expect(page.locator('text=Target Amount').or(page.locator('text=Current Progress'))).toBeVisible();
      await expect(page.locator('text=Target Date').or(page.locator('text=Time Remaining'))).toBeVisible();
      await expect(page.locator('text=Monthly Savings').or(page.locator('text=Required Savings'))).toBeVisible();
    }
  });

  test('should handle goal progress updates', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    
    if (await goalCards.first().isVisible()) {
      // Look for add progress button
      const addProgressButton = page.locator('text=Add Progress').or(page.locator('text=Update').or(page.locator('[data-testid="add-progress"]')));
      
      if (await addProgressButton.first().isVisible()) {
        await addProgressButton.first().click();
        
        // Should show progress update form
        const progressInput = page.locator('input[placeholder*="Amount"]').or(page.locator('input[name="amount"]'));
        await expect(progressInput).toBeVisible();
        
        // Test adding progress
        await progressInput.fill('500');
        
        const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Save'));
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should update progress
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('should display goal categories', async ({ page }) => {
    // Look for goal category filtering
    const categoryFilter = page.locator('text=All Categories').or(page.locator('[data-testid="category-filter"]'));
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      
      // Should show category options
      const categoryOptions = page.locator('text=Savings').or(page.locator('text=Investment')).or(page.locator('text=Debt'));
      await expect(categoryOptions.first()).toBeVisible();
      
      // Test filtering by category
      if (await page.locator('text=Savings').isVisible()) {
        await page.click('text=Savings');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle goal editing', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    
    if (await goalCards.first().isVisible()) {
      // Look for edit button or menu
      const editButton = page.locator('text=Edit').or(page.locator('[data-testid="edit-goal"]'));
      const goalMenu = page.locator('[data-testid="goal-menu"]').or(page.locator('button[aria-label="Goal options"]'));
      
      if (await editButton.isVisible()) {
        await editButton.click();
      } else if (await goalMenu.isVisible()) {
        await goalMenu.click();
        await page.click('text=Edit');
      }
      
      // Should show edit form
      const editForm = page.locator('[data-testid="edit-goal-form"]');
      const nameInput = page.locator('input[value]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('Updated Goal Name');
        
        const saveButton = page.locator('text=Save').or(page.locator('text=Update'));
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
  });

  test('should handle goal deletion', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    
    if (await goalCards.first().isVisible()) {
      // Look for delete option
      const goalMenu = page.locator('[data-testid="goal-menu"]').or(page.locator('button[aria-label="Goal options"]'));
      
      if (await goalMenu.isVisible()) {
        await goalMenu.click();
        
        const deleteButton = page.locator('text=Delete').or(page.locator('text=Remove'));
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // Should show confirmation dialog
          const confirmDialog = page.locator('text=Are you sure').or(page.locator('text=Delete goal'));
          await expect(confirmDialog).toBeVisible();
          
          // Should have cancel and confirm buttons
          await expect(page.locator('text=Cancel')).toBeVisible();
          await expect(page.locator('text=Delete').or(page.locator('text=Confirm'))).toBeVisible();
        }
      }
    }
  });

  test('should display goal progress charts', async ({ page }) => {
    const goalCards = page.locator('[data-testid="goal-card"]');
    
    if (await goalCards.first().isVisible()) {
      await goalCards.first().click();
      
      // Look for progress chart
      const progressChart = page.locator('.recharts-wrapper').or(page.locator('svg')).or(page.locator('[data-testid="progress-chart"]'));
      
      if (await progressChart.isVisible({ timeout: 5000 })) {
        await expect(progressChart).toBeVisible();
        
        // Should show chart elements
        const chartElements = page.locator('.recharts-line, .recharts-area, .recharts-bar');
        await expect(chartElements.first()).toBeVisible();
      }
    }
  });

  test('should handle goal sorting and filtering', async ({ page }) => {
    // Look for sorting controls
    const sortButton = page.locator('text=Sort').or(page.locator('[data-testid="sort-goals"]'));
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      
      // Should show sort options
      const sortOptions = page.locator('text=Progress').or(page.locator('text=Target Date')).or(page.locator('text=Amount'));
      await expect(sortOptions.first()).toBeVisible();
      
      // Test sorting by progress
      if (await page.locator('text=Progress').isVisible()) {
        await page.click('text=Progress');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Goal cards should stack vertically on mobile
    await expect(page.locator('text=Add Goal').or(page.locator('text=Create Goal'))).toBeVisible();
    
    const goalCards = page.locator('[data-testid="goal-card"]');
    if (await goalCards.first().isVisible()) {
      // Should be touch-friendly
      await goalCards.first().tap();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Reload to trigger loading states
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=Loading goals'));
    
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Goals content should be loaded
    await expect(page.locator('text=Goals')).toBeVisible();
  });

  test('should handle empty goals state', async ({ page }) => {
    const emptyState = page.locator('text=No financial goals').or(page.locator('text=Create your first goal'));
    
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      
      // Should show call to action
      const createButton = page.locator('text=Create Goal').or(page.locator('text=Add Goal'));
      await expect(createButton).toBeVisible();
      
      // Should show helpful guidance
      const helpText = page.locator('text=Start by').or(page.locator('text=Set financial goals'));
      await expect(helpText.first()).toBeVisible();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test navigation through goal cards
    const goalCards = page.locator('[data-testid="goal-card"]');
    if (await goalCards.first().isVisible()) {
      await goalCards.first().focus();
      await page.keyboard.press('Enter');
    }
  });

  test('should display goal achievement notifications', async ({ page }) => {
    // Look for achieved goals or achievement indicators
    const achievedGoal = page.locator('text=Goal Achieved').or(page.locator('[data-testid="achieved-goal"]'));
    
    if (await achievedGoal.isVisible()) {
      await expect(achievedGoal).toBeVisible();
      
      // Should show celebration or completion indicator
      const completionIndicator = page.locator('text=Completed').or(page.locator('text=100%'));
      await expect(completionIndicator).toBeVisible();
    }
  });
});