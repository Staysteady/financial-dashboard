import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Financial Dashboard/);
    await expect(page.locator('h1')).toContainText('Take Control of Your Financial Future');
    
    // Check for key elements
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('text=Get Started')).toBeVisible();
    await expect(page.locator('text=Real-time Account Monitoring')).toBeVisible();
    await expect(page.locator('text=Advanced Financial Analytics')).toBeVisible();
    await expect(page.locator('text=Secure Banking Integration')).toBeVisible();
  });

  test('should navigate to sign-in page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/sign-in');
    await expect(page.locator('h1')).toContainText('Sign In');
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
  });

  test('should navigate to sign-up page', async ({ page }) => {
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/auth/sign-up');
    await expect(page.locator('h1')).toContainText('Create Account');
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Already have an account?')).toBeVisible();
  });

  test('should validate sign-in form', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    
    // Test valid email but no password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('should validate sign-up form', async ({ page }) => {
    await page.goto('/auth/sign-up');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    
    // Test password requirements
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('should handle sign-in attempt with invalid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on sign-in page and show error
    await expect(page).toHaveURL('/auth/sign-in');
    // Note: Actual error message depends on Supabase implementation
  });

  test('should navigate between sign-in and sign-up pages', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Go to sign-up
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/auth/sign-up');
    await expect(page.locator('h1')).toContainText('Create Account');
    
    // Go back to sign-in
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/auth/sign-in');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should display proper loading states', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Fill form with valid data
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click submit and check for loading state
    await page.click('button[type="submit"]');
    
    // The button should show loading state or be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/sign-in');
    
    // Check that form is still visible and usable
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test form interaction on mobile
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });
});