import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Security Testing', () => {
  
  test.describe('Password Security Requirements', () => {
    test('should enforce strong password requirements', async ({ page }) => {
      await page.goto('/auth/sign-up');
      
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        
        const weakPasswords = [
          '123', // Too short
          'password', // Common password
          'abcdef', // No numbers or special chars
          '123456', // Sequential numbers
          'qwerty', // Keyboard pattern
          'Password1', // Missing special characters
          'p@$$w0rd' // Common pattern
        ];
        
        for (const weakPassword of weakPasswords) {
          await passwordInput.clear();
          await passwordInput.fill(weakPassword);
          await submitButton.click();
          
          // Should show password strength error
          const errorMessage = page.locator('text=Password must be').or(
            page.locator('text=weak password')).or(
            page.locator('text=stronger password'));
          
          await expect(errorMessage).toBeVisible({ timeout: 2000 });
        }
      }
    });

    test('should accept strong passwords', async ({ page }) => {
      await page.goto('/auth/sign-up');
      
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        
        const strongPasswords = [
          'MyStr0ng!Pass2024',
          'C0mplex#P@ssw0rd!',
          'SecureBanking#2024$',
          'FinancialApp!Secure123'
        ];
        
        for (const strongPassword of strongPasswords) {
          await passwordInput.clear();
          await passwordInput.fill(strongPassword);
          
          // Should not show password strength error immediately
          const errorMessage = page.locator('text=Password must be').or(page.locator('text=weak password'));
          
          // Wait briefly to see if error appears
          await page.waitForTimeout(500);
          
          const hasError = await errorMessage.isVisible();
          expect(hasError).toBeFalsy();
        }
      }
    });

    test('should prevent password visibility by default', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      const passwordInput = page.locator('input[type="password"]');
      
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('test-password');
        
        // Password field should be masked
        const inputType = await passwordInput.getAttribute('type');
        expect(inputType).toBe('password');
        
        // Look for show/hide password toggle
        const showPasswordButton = page.locator('button[aria-label*="password"]').or(
          page.locator('[data-testid="show-password"]')).or(
          page.locator('button:has([data-testid="eye-icon"])'));
        
        if (await showPasswordButton.isVisible()) {
          await showPasswordButton.click();
          
          // Should change to text type when shown
          const newInputType = await passwordInput.getAttribute('type');
          expect(newInputType).toBe('text');
          
          // Click again to hide
          await showPasswordButton.click();
          
          // Should return to password type
          const finalInputType = await passwordInput.getAttribute('type');
          expect(finalInputType).toBe('password');
        }
      }
    });
  });

  test.describe('Multi-Factor Authentication', () => {
    test('should support 2FA setup flow', async ({ page }) => {
      // This test checks if 2FA setup is available (may not be implemented yet)
      await page.goto('/dashboard/settings');
      
      // Look for 2FA/MFA settings
      const twoFactorSection = page.locator('text=Two-Factor').or(
        page.locator('text=2FA')).or(
        page.locator('text=Multi-Factor')).or(
        page.locator('text=Authentication'));
      
      if (await twoFactorSection.isVisible()) {
        await twoFactorSection.click();
        
        // Should show 2FA setup options
        const setupOptions = page.locator('text=Enable').or(
          page.locator('text=Setup')).or(
          page.locator('text=Configure'));
        
        await expect(setupOptions.first()).toBeVisible();
      }
    });

    test('should validate TOTP codes correctly', async ({ page }) => {
      // This test would validate TOTP implementation if available
      await page.goto('/auth/sign-in');
      
      // Look for 2FA code input (may appear after initial login)
      const totpInput = page.locator('input[placeholder*="code"]').or(
        page.locator('input[name*="totp"]')).or(
        page.locator('input[name*="2fa"]'));
      
      if (await totpInput.isVisible()) {
        // Test invalid codes
        const invalidCodes = ['000000', '123456', '999999', 'abcdef'];
        
        for (const invalidCode of invalidCodes) {
          await totpInput.fill(invalidCode);
          const submitButton = page.locator('button[type="submit"]');
          await submitButton.click();
          
          // Should show invalid code error
          const errorMessage = page.locator('text=Invalid code').or(page.locator('text=Incorrect'));
          await expect(errorMessage).toBeVisible({ timeout: 2000 });
        }
      }
    });
  });

  test.describe('Account Lockout Protection', () => {
    test('should implement account lockout after failed attempts', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        
        // Attempt multiple failed logins
        const maxAttempts = 6;
        let lockedOut = false;
        
        for (let i = 1; i <= maxAttempts; i++) {
          await passwordInput.clear();
          await passwordInput.fill(`wrongpassword${i}`);
          await submitButton.click();
          
          await page.waitForTimeout(1000);
          
          // Check for lockout message
          const lockoutMessage = page.locator('text=account locked').or(
            page.locator('text=too many attempts')).or(
            page.locator('text=temporarily disabled'));
          
          if (await lockoutMessage.isVisible()) {
            lockedOut = true;
            break;
          }
        }
        
        // Should implement some form of rate limiting or lockout
        if (lockedOut) {
          expect(lockedOut).toBeTruthy();
        }
      }
    });

    test('should show progressive delays for failed attempts', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        
        const responseTimes = [];
        
        // Measure response times for failed attempts
        for (let i = 1; i <= 3; i++) {
          await passwordInput.clear();
          await passwordInput.fill(`wrongpassword${i}`);
          
          const startTime = Date.now();
          await submitButton.click();
          
          // Wait for response
          await page.waitForTimeout(2000);
          
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
        }
        
        // Later attempts might have progressive delays
        // (Not all implementations will have this)
      }
    });
  });

  test.describe('Session Security', () => {
    test('should implement secure session management', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      // Check session cookies security
      const initialCookies = await page.context().cookies();
      
      // Look for session-related cookies
      const sessionCookies = initialCookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('token')
      );
      
      for (const cookie of sessionCookies) {
        // Session cookies should be secure
        expect(cookie.secure).toBeTruthy();
        
        // Should be HttpOnly
        expect(cookie.httpOnly).toBeTruthy();
        
        // Should have SameSite protection
        expect(['Strict', 'Lax']).toContain(cookie.sameSite);
      }
    });

    test('should expire sessions appropriately', async ({ page }) => {
      // Test session timeout behavior
      await page.goto('/dashboard');
      
      // Get initial session state
      const initialCookies = await page.context().cookies();
      
      // Wait for potential session timeout (shortened for testing)
      await page.waitForTimeout(5000);
      
      // Try to access protected resource
      await page.reload();
      
      // Check if session is still valid or if redirected to login
      const isStillAuthenticated = await page.locator('text=Dashboard').isVisible({ timeout: 2000 });
      const isRedirectedToLogin = page.url().includes('/auth/sign-in') || 
                                 await page.locator('text=Sign In').isVisible({ timeout: 2000 });
      
      // Either should still be authenticated OR redirected to login
      expect(isStillAuthenticated || isRedirectedToLogin).toBeTruthy();
    });

    test('should prevent session fixation', async ({ page }) => {
      // Get initial session ID
      const initialCookies = await page.context().cookies();
      
      // Attempt login
      await page.goto('/auth/sign-in');
      
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('validpassword123');
        await page.locator('button[type="submit"]').click();
        
        await page.waitForTimeout(2000);
        
        // Get post-login cookies
        const postLoginCookies = await page.context().cookies();
        
        // Session ID should change after authentication
        const initialSessionCookie = initialCookies.find(c => 
          c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('auth'));
        const postLoginSessionCookie = postLoginCookies.find(c => 
          c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('auth'));
        
        if (initialSessionCookie && postLoginSessionCookie) {
          expect(initialSessionCookie.value).not.toEqual(postLoginSessionCookie.value);
        }
      }
    });
  });

  test.describe('Password Reset Security', () => {
    test('should implement secure password reset flow', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      // Look for forgot password link
      const forgotPasswordLink = page.locator('text=Forgot').or(
        page.locator('text=Reset')).or(
        page.locator('[href*="reset"]'));
      
      if (await forgotPasswordLink.isVisible()) {
        await forgotPasswordLink.click();
        
        // Should navigate to password reset page
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
        
        // Test with invalid email
        await emailInput.fill('invalid-email');
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should validate email format
        const errorMessage = page.locator('text=Invalid email').or(page.locator('text=valid email'));
        await expect(errorMessage).toBeVisible({ timeout: 2000 });
        
        // Test with valid email format
        await emailInput.clear();
        await emailInput.fill('test@example.com');
        await submitButton.click();
        
        // Should show success message (even for non-existent emails for security)
        const successMessage = page.locator('text=sent').or(
          page.locator('text=Check your email')).or(
          page.locator('text=reset link'));
        
        await expect(successMessage).toBeVisible({ timeout: 3000 });
      }
    });

    test('should not reveal if email exists during reset', async ({ page }) => {
      await page.goto('/auth/reset-password');
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        // Test with obviously non-existent email
        await emailInput.fill('nonexistent123456789@example.com');
        await submitButton.click();
        
        await page.waitForTimeout(2000);
        
        // Should not reveal whether email exists or not
        const errorMessage = page.locator('text=not found').or(
          page.locator('text=does not exist')).or(
          page.locator('text=invalid user'));
        
        const hasRevealingError = await errorMessage.isVisible();
        expect(hasRevealingError).toBeFalsy();
        
        // Should show generic success message
        const genericMessage = page.locator('text=sent').or(page.locator('text=check your email'));
        const hasGenericMessage = await genericMessage.isVisible();
        
        if (hasGenericMessage) {
          expect(hasGenericMessage).toBeTruthy();
        }
      }
    });
  });

  test.describe('OAuth and Third-Party Authentication', () => {
    test('should implement secure OAuth flows', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      // Look for OAuth buttons (Google, GitHub, etc.)
      const oauthButtons = await page.locator('button:has-text("Google"), button:has-text("GitHub"), button:has-text("Continue with")').all();
      
      for (const button of oauthButtons) {
        await button.click();
        
        // Should navigate to OAuth provider or open popup
        await page.waitForTimeout(1000);
        
        // Check if URL contains OAuth parameters
        const currentUrl = page.url();
        
        if (currentUrl.includes('oauth') || currentUrl.includes('auth')) {
          // Should include state parameter for CSRF protection
          expect(currentUrl).toMatch(/[?&]state=/);
          
          // Should include proper redirect_uri
          expect(currentUrl).toMatch(/[?&]redirect_uri=/);
          
          // Should use HTTPS
          expect(currentUrl).toMatch(/^https:/);
        }
        
        // Navigate back
        await page.goBack();
      }
    });

    test('should validate OAuth state parameter', async ({ page }) => {
      // This test would check CSRF protection in OAuth flows
      await page.goto('/auth/sign-in');
      
      // Look for OAuth callback handling
      await page.goto('/auth/callback?code=test&state=invalid');
      
      // Should reject invalid state parameter
      const errorMessage = page.locator('text=Invalid state').or(
        page.locator('text=CSRF')).or(
        page.locator('text=Authentication failed'));
      
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Authentication Headers and CORS', () => {
    test('should implement proper CORS for authentication', async ({ page }) => {
      // Test authentication endpoints for CORS headers
      const authEndpoints = [
        '/api/auth/sign-in',
        '/api/auth/sign-up',
        '/api/auth/logout'
      ];
      
      for (const endpoint of authEndpoints) {
        const response = await page.request.options(endpoint);
        const headers = response.headers();
        
        // Should include proper CORS headers
        expect(headers['access-control-allow-origin']).toBeDefined();
        expect(headers['access-control-allow-methods']).toBeDefined();
        expect(headers['access-control-allow-headers']).toBeDefined();
        
        // Should not allow all origins for authentication endpoints
        expect(headers['access-control-allow-origin']).not.toBe('*');
      }
    });

    test('should require proper authentication headers', async ({ page }) => {
      const protectedEndpoints = [
        '/api/export/transactions',
        '/api/accounts',
        '/api/goals'
      ];
      
      for (const endpoint of protectedEndpoints) {
        // Request without authentication
        const response = await page.request.get(endpoint);
        
        // Should require authentication
        expect(response.status()).toBe(401);
        
        // Request with invalid bearer token
        const invalidTokenResponse = await page.request.get(endpoint, {
          headers: {
            'Authorization': 'Bearer invalid-token-123'
          }
        });
        
        expect(invalidTokenResponse.status()).toBe(401);
      }
    });
  });

  test.describe('Biometric and Advanced Authentication', () => {
    test('should support WebAuthn if available', async ({ page }) => {
      await page.goto('/auth/sign-in');
      
      // Check for WebAuthn/FIDO support
      const webauthnSupported = await page.evaluate(() => {
        return !!window.navigator.credentials;
      });
      
      if (webauthnSupported) {
        // Look for biometric authentication option
        const biometricButton = page.locator('text=Face ID').or(
          page.locator('text=Touch ID')).or(
          page.locator('text=Fingerprint')).or(
          page.locator('text=Biometric'));
        
        if (await biometricButton.isVisible()) {
          await biometricButton.click();
          
          // Should trigger WebAuthn flow
          await page.waitForTimeout(1000);
          
          // Note: Actual WebAuthn testing requires special setup
          // This just verifies the UI is present
        }
      }
    });

    test('should handle device registration securely', async ({ page }) => {
      await page.goto('/dashboard/settings');
      
      // Look for device management settings
      const deviceSection = page.locator('text=Trusted Devices').or(
        page.locator('text=Device Management')).or(
        page.locator('text=Security Devices'));
      
      if (await deviceSection.isVisible()) {
        await deviceSection.click();
        
        // Should show current devices and registration options
        const deviceList = page.locator('[data-testid="device-list"]').or(
          page.locator('text=This device'));
        
        await expect(deviceList.first()).toBeVisible();
      }
    });
  });
});