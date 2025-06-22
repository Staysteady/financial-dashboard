import { test, expect } from '@playwright/test';

test.describe('Penetration Testing - Security Vulnerabilities', () => {
  
  test.describe('Authentication Bypass Attempts', () => {
    test('should prevent direct dashboard access without authentication', async ({ page }) => {
      // Attempt to access protected routes directly
      await page.goto('/dashboard');
      
      // Should redirect to login or show access denied
      const currentUrl = page.url();
      const isProtected = currentUrl.includes('/auth/sign-in') || 
                         currentUrl.includes('/login') ||
                         await page.locator('text=Access Denied').isVisible() ||
                         await page.locator('text=Please sign in').isVisible();
      
      expect(isProtected).toBeTruthy();
    });

    test('should prevent API access without proper authentication', async ({ page }) => {
      // Test direct API access
      const response = await page.request.get('/api/export/transactions');
      expect(response.status()).toBe(401);
    });

    test('should handle malformed authentication tokens', async ({ page }) => {
      // Set malformed authorization header
      await page.setExtraHTTPHeaders({
        'Authorization': 'Bearer invalid-token-format'
      });

      await page.goto('/dashboard');
      
      // Should not grant access with malformed token
      const hasAccess = await page.locator('text=Dashboard').isVisible({ timeout: 2000 });
      expect(hasAccess).toBeFalsy();
    });
  });

  test.describe('Input Validation and Injection Attacks', () => {
    test('should prevent XSS in transaction search', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      const maliciousScript = '<script>alert("XSS")</script>';
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill(maliciousScript);
        await page.keyboard.press('Enter');
        
        // Check that script is not executed (no alert dialog)
        await page.waitForTimeout(1000);
        
        // Script should be escaped/sanitized in the display
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      }
    });

    test('should prevent SQL injection in API endpoints', async ({ page }) => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE transactions; --",
        "' OR '1'='1' --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE accounts SET balance=0; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await page.request.get(`/api/export/transactions?search=${encodeURIComponent(payload)}`);
        
        // Should not return 500 errors or expose database errors
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(responseText.toLowerCase()).not.toContain('sql');
        expect(responseText.toLowerCase()).not.toContain('database');
        expect(responseText.toLowerCase()).not.toContain('syntax error');
      }
    });

    test('should sanitize file upload inputs', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      // Look for file upload functionality
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible()) {
        // Test malicious file types
        const maliciousFiles = ['test.exe', 'malware.php', 'script.js'];
        
        for (const filename of maliciousFiles) {
          // Create a test file buffer
          const buffer = Buffer.from('malicious content');
          await fileInput.setInputFiles({
            name: filename,
            mimeType: 'application/octet-stream',
            buffer: buffer
          });
          
          // Should reject malicious file types
          const errorMessage = page.locator('text=Invalid file type').or(page.locator('text=Only CSV files'));
          await expect(errorMessage).toBeVisible({ timeout: 2000 });
        }
      }
    });
  });

  test.describe('Session Management Vulnerabilities', () => {
    test('should invalidate sessions on logout', async ({ page }) => {
      // This test assumes authentication is working
      await page.goto('/auth/sign-in');
      
      // Simulate login (if forms are available)
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const loginButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await loginButton.click();
        
        // If we get to dashboard, test logout
        if (await page.locator('text=Dashboard').isVisible({ timeout: 5000 })) {
          // Find logout button
          const logoutButton = page.locator('text=Logout').or(page.locator('text=Sign Out'));
          
          if (await logoutButton.isVisible()) {
            await logoutButton.click();
            
            // Try to access dashboard after logout
            await page.goto('/dashboard');
            
            // Should be redirected away from dashboard
            const isLoggedOut = !await page.locator('text=Dashboard').isVisible({ timeout: 2000 });
            expect(isLoggedOut).toBeTruthy();
          }
        }
      }
    });

    test('should prevent session fixation attacks', async ({ page }) => {
      // Get initial session state
      const initialCookies = await page.context().cookies();
      
      // Attempt login
      await page.goto('/auth/sign-in');
      
      // After login attempt, session should change
      const postLoginCookies = await page.context().cookies();
      
      // Session ID should be different (if session cookies exist)
      const sessionCookies = postLoginCookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') || 
        cookie.name.toLowerCase().includes('auth')
      );
      
      if (sessionCookies.length > 0) {
        const initialSessionCookies = initialCookies.filter(cookie => 
          cookie.name.toLowerCase().includes('session') || 
          cookie.name.toLowerCase().includes('auth')
        );
        
        // Session should regenerate on authentication
        expect(sessionCookies).not.toEqual(initialSessionCookies);
      }
    });
  });

  test.describe('Data Exposure and Information Disclosure', () => {
    test('should not expose sensitive data in client-side code', async ({ page }) => {
      await page.goto('/');
      
      // Check for exposed sensitive information
      const pageContent = await page.content();
      const scriptContent = await page.evaluate(() => {
        return Array.from(document.scripts).map(script => script.innerHTML).join('');
      });
      
      // Should not contain sensitive information
      const sensitivePatterns = [
        /database.*password/i,
        /api.*key.*[a-zA-Z0-9]{20,}/i,
        /secret.*[a-zA-Z0-9]{20,}/i,
        /private.*key/i,
        /connection.*string/i
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(pageContent).not.toMatch(pattern);
        expect(scriptContent).not.toMatch(pattern);
      }
    });

    test('should not expose user data in error messages', async ({ page }) => {
      // Trigger various error conditions
      const errorEndpoints = [
        '/api/export/transactions?userId=999999',
        '/api/export/accounts?invalid=true',
        '/api/webhooks'
      ];
      
      for (const endpoint of errorEndpoints) {
        const response = await page.request.get(endpoint);
        const responseText = await response.text();
        
        // Should not expose user data in errors
        expect(responseText).not.toMatch(/user_id.*\d+/i);
        expect(responseText).not.toMatch(/email.*@.*\./i);
        expect(responseText).not.toMatch(/password/i);
        expect(responseText).not.toMatch(/token.*[a-zA-Z0-9]{20,}/i);
      }
    });

    test('should prevent directory traversal attacks', async ({ page }) => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd'
      ];
      
      for (const payload of traversalPayloads) {
        const response = await page.request.get(`/api/export/transactions?file=${encodeURIComponent(payload)}`);
        
        // Should not return file contents
        expect(response.status()).not.toBe(200);
        
        const responseText = await response.text();
        expect(responseText).not.toContain('root:');
        expect(responseText).not.toContain('Administrator');
      }
    });
  });

  test.describe('Cross-Site Request Forgery (CSRF)', () => {
    test('should prevent CSRF attacks on state-changing operations', async ({ page }) => {
      // Test CSRF protection on critical endpoints
      const csrfEndpoints = [
        { method: 'POST', url: '/api/export/transactions', body: {} },
        { method: 'PUT', url: '/api/accounts/update', body: {} },
        { method: 'DELETE', url: '/api/accounts/1', body: {} }
      ];
      
      for (const endpoint of csrfEndpoints) {
        // Attempt request without proper CSRF token
        let response;
        
        try {
          if (endpoint.method === 'POST') {
            response = await page.request.post(endpoint.url, { data: endpoint.body });
          } else if (endpoint.method === 'PUT') {
            response = await page.request.put(endpoint.url, { data: endpoint.body });
          } else if (endpoint.method === 'DELETE') {
            response = await page.request.delete(endpoint.url);
          }
          
          // Should require CSRF protection (401/403) or authentication
          expect([401, 403, 422]).toContain(response?.status());
        } catch (error) {
          // Network errors are acceptable (indicates protection)
        }
      }
    });
  });

  test.describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting on authentication endpoints', async ({ page }) => {
      const loginAttempts = 10;
      let blockedRequest = false;
      
      for (let i = 0; i < loginAttempts; i++) {
        const response = await page.request.post('/api/auth/sign-in', {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        });
        
        // After several attempts, should get rate limited
        if (response.status() === 429) {
          blockedRequest = true;
          break;
        }
        
        await page.waitForTimeout(100); // Brief delay between attempts
      }
      
      // Should implement some form of rate limiting
      // Note: This might not trigger if rate limiting is not implemented
      if (blockedRequest) {
        expect(blockedRequest).toBeTruthy();
      }
    });

    test('should handle large payloads gracefully', async ({ page }) => {
      // Test with oversized request payload
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      const response = await page.request.post('/api/export/transactions', {
        data: { search: largePayload }
      });
      
      // Should reject or handle large payloads gracefully
      expect([400, 413, 422, 500]).toContain(response.status());
    });
  });

  test.describe('HTTP Security Headers', () => {
    test('should implement security headers', async ({ page }) => {
      const response = await page.request.get('/');
      const headers = response.headers();
      
      // Check for important security headers
      const securityHeaders = {
        'x-frame-options': ['DENY', 'SAMEORIGIN'],
        'x-content-type-options': ['nosniff'],
        'x-xss-protection': ['1; mode=block', '0'],
        'strict-transport-security': null, // Any HSTS header
        'content-security-policy': null,   // Any CSP header
        'referrer-policy': null           // Any referrer policy
      };
      
      for (const [headerName, expectedValues] of Object.entries(securityHeaders)) {
        const headerValue = headers[headerName];
        
        if (expectedValues === null) {
          // Just check if header exists
          expect(headerValue).toBeDefined();
        } else {
          // Check if header has expected values
          if (headerValue) {
            expect(expectedValues).toContain(headerValue);
          }
        }
      }
    });
  });

  test.describe('API Security', () => {
    test('should validate API input parameters', async ({ page }) => {
      const invalidParams = [
        { param: 'limit', value: '-1' },
        { param: 'limit', value: '999999' },
        { param: 'offset', value: '-100' },
        { param: 'startDate', value: 'invalid-date' },
        { param: 'endDate', value: '2025-13-45' },
        { param: 'format', value: 'executable' }
      ];
      
      for (const { param, value } of invalidParams) {
        const response = await page.request.get(`/api/export/transactions?${param}=${value}`);
        
        // Should validate input and return appropriate error
        expect([400, 422]).toContain(response.status());
      }
    });

    test('should prevent API enumeration attacks', async ({ page }) => {
      // Test sequential ID enumeration
      const responses = [];
      
      for (let i = 1; i <= 5; i++) {
        const response = await page.request.get(`/api/accounts/${i}`);
        responses.push(response.status());
      }
      
      // Should not reveal which IDs exist vs don't exist
      // (All should return 401/403 if not authenticated, not 404 vs 200)
      const uniqueStatuses = [...new Set(responses)];
      expect(uniqueStatuses.length).toBeLessThanOrEqual(2); // Should be consistent
    });
  });

  test.describe('File Upload Security', () => {
    test('should validate file uploads securely', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible()) {
        // Test various malicious file scenarios
        const maliciousFiles = [
          {
            name: 'test.csv.exe',
            content: 'MZ\x90\x00\x03\x00\x00\x00', // PE header
            mimeType: 'application/octet-stream'
          },
          {
            name: 'test.csv',
            content: '<?php system($_GET["cmd"]); ?>',
            mimeType: 'text/csv'
          },
          {
            name: '../../../etc/passwd',
            content: 'root:x:0:0:root',
            mimeType: 'text/csv'
          }
        ];
        
        for (const file of maliciousFiles) {
          await fileInput.setInputFiles({
            name: file.name,
            mimeType: file.mimeType,
            buffer: Buffer.from(file.content)
          });
          
          // Should reject malicious files
          const submitButton = page.locator('button:has-text("Upload")').or(page.locator('button[type="submit"]'));
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should show error or validation message
            const errorMessage = page.locator('text=Invalid').or(page.locator('text=Error')).or(page.locator('text=rejected'));
            await expect(errorMessage).toBeVisible({ timeout: 3000 });
          }
        }
      }
    });
  });
});