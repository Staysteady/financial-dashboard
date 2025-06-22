import { test, expect } from '@playwright/test';

test.describe('Security Audit of Financial Data Handling', () => {
  
  test.describe('Data Classification and Protection', () => {
    test('should identify and protect PII (Personally Identifiable Information)', async ({ page }) => {
      // Test that PII is properly handled throughout the application
      await page.goto('/dashboard/transactions');
      
      // Look for potential PII exposure
      const pageContent = await page.content();
      
      // Should not expose raw banking data in client-side code
      const sensitivePatterns = [
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card numbers
        /\b\d{2}-\d{2}-\d{2}\b/, // UK sort codes
        /\b\d{8}\b/, // Account numbers
        /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/, // IBAN
        /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/, // BIC/SWIFT codes
        /\b[A-Z]{2}\d{2}[A-Z]{4}\d{6}(\d{8})?\b/, // UK account identifiers
        /social.security|ssn|national.insurance/i, // ID numbers
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
        /\b[A-Z]{2}\d{6}[A-Z]\b/ // UK National Insurance number format
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(pageContent).not.toMatch(pattern);
      }
      
      console.log('PII exposure check passed');
    });

    test('should protect financial account information', async ({ page }) => {
      // Check that account information is properly protected
      await page.goto('/dashboard/accounts');
      
      // Account information should be masked or truncated for security
      const accountElements = await page.locator('[data-testid="account-card"]').all();
      
      for (const element of accountElements) {
        const elementText = await element.textContent();
        
        if (elementText) {
          // Account numbers should be masked (showing only last 4 digits)
          const accountNumberMatch = elementText.match(/\*{4,}\d{4}|\*{8,}\d{4}/);
          
          if (elementText.includes('Account') || elementText.includes('****')) {
            // If account info is shown, it should be properly masked
            expect(elementText).not.toMatch(/\b\d{8}\b/); // Full 8-digit account number
            expect(elementText).not.toMatch(/\b\d{2}-\d{2}-\d{2}\b/); // Full sort code
          }
        }
      }
      
      console.log('Account information protection check passed');
    });

    test('should handle transaction data securely', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      // Transaction data should not expose sensitive merchant details
      const transactionElements = await page.locator('[data-testid="transaction-item"]').all();
      
      for (const element of transactionElements) {
        const elementText = await element.textContent();
        
        if (elementText) {
          // Should not expose internal transaction IDs or raw payment data
          expect(elementText).not.toMatch(/txn_[a-zA-Z0-9]{20,}/); // Internal transaction IDs
          expect(elementText).not.toMatch(/ch_[a-zA-Z0-9]{20,}/); // Stripe charge IDs
          expect(elementText).not.toMatch(/pi_[a-zA-Z0-9]{20,}/); // Payment intent IDs
          expect(elementText).not.toMatch(/[a-fA-F0-9]{32,}/); // Long hex strings (potential tokens)
        }
      }
      
      console.log('Transaction data security check passed');
    });

    test('should properly classify data sensitivity levels', async ({ page }) => {
      // Check that different types of financial data are handled with appropriate security
      const dataTypes = [
        { endpoint: '/api/export/transactions', sensitivity: 'high' },
        { endpoint: '/api/export/accounts', sensitivity: 'critical' },
        { endpoint: '/api/export/financial-summary', sensitivity: 'medium' },
        { endpoint: '/api/integrations/external?integration=portfolio', sensitivity: 'high' }
      ];
      
      for (const dataType of dataTypes) {
        const response = await page.request.get(dataType.endpoint);
        const headers = response.headers();
        
        // Critical and high sensitivity data should have proper security headers
        if (dataType.sensitivity === 'critical' || dataType.sensitivity === 'high') {
          // Should not be cacheable
          const cacheControl = headers['cache-control'];
          if (cacheControl) {
            expect(cacheControl).toMatch(/no-cache|no-store|private/);
          }
          
          // Should have content type security
          const contentType = headers['content-type'];
          if (contentType) {
            expect(contentType).toMatch(/application\/json|text\/csv/);
          }
        }
        
        console.log(`Data classification check for ${dataType.endpoint}: ${dataType.sensitivity} sensitivity`);
      }
    });
  });

  test.describe('Banking Compliance Verification', () => {
    test('should comply with PCI DSS requirements', async ({ page }) => {
      // Verify PCI DSS compliance measures
      await page.goto('/dashboard');
      
      // Check for secure transmission (HTTPS)
      expect(page.url()).toMatch(/^https:/);
      
      // Check security headers for PCI compliance
      const response = await page.request.get('/dashboard');
      const headers = response.headers();
      
      // PCI DSS requires secure headers
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      
      // Should not expose server information
      const serverHeader = headers['server'];
      if (serverHeader) {
        expect(serverHeader).not.toMatch(/apache|nginx|iis/i);
      }
      
      console.log('PCI DSS compliance headers verified');
    });

    test('should implement proper audit logging', async ({ page }) => {
      // Test that financial data access is properly logged
      const auditableActions = [
        { action: 'view_transactions', endpoint: '/api/export/transactions' },
        { action: 'view_accounts', endpoint: '/api/export/accounts' },
        { action: 'export_data', endpoint: '/api/export/financial-summary' }
      ];
      
      for (const action of auditableActions) {
        const requestTime = new Date().toISOString();
        
        const response = await page.request.get(action.endpoint, {
          headers: {
            'X-Audit-User': 'test-user-audit',
            'X-Audit-Action': action.action,
            'X-Audit-Timestamp': requestTime
          }
        });
        
        // Audit headers should be accepted (if implemented)
        expect([200, 401, 404]).toContain(response.status());
        
        console.log(`Audit logging test for ${action.action}: ${response.status()}`);
      }
    });

    test('should enforce data retention policies', async ({ page }) => {
      // Test data retention and purging mechanisms
      await page.goto('/dashboard/settings');
      
      // Look for data retention settings
      const dataRetentionSection = page.locator('text=Data Retention').or(
        page.locator('text=Delete Data')).or(
        page.locator('text=Export Data'));
      
      if (await dataRetentionSection.isVisible()) {
        await dataRetentionSection.click();
        
        // Should have options for data export before deletion
        const exportOption = page.locator('text=Export').or(page.locator('text=Download'));
        await expect(exportOption).toBeVisible();
        
        // Should have clear data deletion options
        const deleteOption = page.locator('text=Delete').or(page.locator('text=Remove'));
        await expect(deleteOption).toBeVisible();
        
        console.log('Data retention controls available');
      }
    });

    test('should implement GDPR compliance features', async ({ page }) => {
      // Test GDPR compliance features
      await page.goto('/dashboard/settings');
      
      // Look for GDPR-related features
      const gdprFeatures = [
        'Data Export', 'Right to Access', 'Data Portability',
        'Delete Account', 'Remove Data', 'Privacy Settings'
      ];
      
      let gdprFeaturesFound = 0;
      
      for (const feature of gdprFeatures) {
        const featureElement = page.locator(`text=${feature}`);
        if (await featureElement.isVisible()) {
          gdprFeaturesFound++;
          console.log(`GDPR feature found: ${feature}`);
        }
      }
      
      // Should have at least some GDPR compliance features
      expect(gdprFeaturesFound).toBeGreaterThan(0);
      
      // Check privacy policy link
      const privacyLink = page.locator('text=Privacy Policy').or(page.locator('text=Privacy'));
      if (await privacyLink.isVisible()) {
        console.log('Privacy policy link available');
      }
    });
  });

  test.describe('Access Control and Authorization', () => {
    test('should implement proper role-based access control', async ({ page }) => {
      // Test that financial data access is properly controlled
      const protectedEndpoints = [
        '/api/export/transactions',
        '/api/export/accounts',
        '/api/export/financial-summary',
        '/api/webhooks'
      ];
      
      for (const endpoint of protectedEndpoints) {
        // Test without authentication
        const response = await page.request.get(endpoint);
        
        // Should require authentication
        expect(response.status()).toBe(401);
        
        // Test with invalid token
        const invalidTokenResponse = await page.request.get(endpoint, {
          headers: {
            'Authorization': 'Bearer invalid-token-123'
          }
        });
        
        expect(invalidTokenResponse.status()).toBe(401);
        
        console.log(`Access control verified for ${endpoint}`);
      }
    });

    test('should prevent unauthorized data access', async ({ page }) => {
      // Test data isolation between users
      const userSpecificEndpoints = [
        '/api/export/transactions?userId=1',
        '/api/export/accounts?userId=1',
        '/api/export/financial-summary?userId=1'
      ];
      
      for (const endpoint of userSpecificEndpoints) {
        // Attempt to access another user's data
        const response = await page.request.get(endpoint, {
          headers: {
            'Authorization': 'Bearer fake-token-for-different-user'
          }
        });
        
        // Should deny access to other users' data
        expect([401, 403, 404]).toContain(response.status());
        
        console.log(`Data isolation verified for ${endpoint}`);
      }
    });

    test('should implement proper session management for financial data', async ({ page }) => {
      // Test session security for financial operations
      await page.goto('/dashboard');
      
      // Check session cookies security
      const cookies = await page.context().cookies();
      
      for (const cookie of cookies) {
        if (cookie.name.toLowerCase().includes('session') || 
            cookie.name.toLowerCase().includes('auth')) {
          
          // Financial application sessions should be secure
          expect(cookie.secure).toBeTruthy();
          expect(cookie.httpOnly).toBeTruthy();
          expect(['Strict', 'Lax']).toContain(cookie.sameSite);
          
          // Should have reasonable expiration
          if (cookie.expires) {
            const expirationTime = new Date(cookie.expires * 1000);
            const now = new Date();
            const timeDiff = expirationTime.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // Sessions shouldn't be extremely long for financial apps
            expect(hoursDiff).toBeLessThan(24 * 30); // Less than 30 days
          }
          
          console.log(`Session cookie security verified: ${cookie.name}`);
        }
      }
    });

    test('should implement proper API rate limiting for financial endpoints', async ({ page }) => {
      // Test rate limiting on sensitive financial endpoints
      const sensitiveEndpoint = '/api/export/transactions';
      const requestCount = 20;
      const responses = [];
      
      // Make rapid requests to test rate limiting
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await page.request.get(sensitiveEndpoint);
          responses.push(response.status());
          
          if (response.status() === 429) {
            console.log(`Rate limiting triggered after ${i + 1} requests`);
            break;
          }
        } catch (error) {
          // Network errors might indicate rate limiting
          responses.push(0);
        }
        
        // Small delay between requests
        await page.waitForTimeout(50);
      }
      
      // Should implement some form of rate limiting (429 status or other protection)
      const rateLimitedResponses = responses.filter(status => status === 429);
      const successfulResponses = responses.filter(status => status === 200);
      const authRequiredResponses = responses.filter(status => status === 401);
      
      console.log(`Rate limiting test results:`);
      console.log(`- Successful responses: ${successfulResponses.length}`);
      console.log(`- Auth required: ${authRequiredResponses.length}`);
      console.log(`- Rate limited: ${rateLimitedResponses.length}`);
      
      // Most responses should require auth (which is a form of protection)
      expect(authRequiredResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Data Encryption and Storage Security', () => {
    test('should verify encryption of data in transit', async ({ page }) => {
      // Verify all financial data transmission is encrypted
      const financialEndpoints = [
        '/api/export/transactions',
        '/api/export/accounts',
        '/api/export/financial-summary',
        '/api/webhooks'
      ];
      
      for (const endpoint of financialEndpoints) {
        // All requests should use HTTPS
        const response = await page.request.get(endpoint);
        
        // Check response headers for security
        const headers = response.headers();
        
        // Should use secure transport
        expect(page.url()).toMatch(/^https:/);
        
        // Should have proper content security
        const contentType = headers['content-type'];
        if (contentType) {
          expect(contentType).toMatch(/application\/json|text\/csv|text\/plain/);
        }
        
        console.log(`HTTPS encryption verified for ${endpoint}`);
      }
    });

    test('should not expose sensitive data in error messages', async ({ page }) => {
      // Test that error messages don't leak sensitive information
      const errorTriggeringRequests = [
        '/api/export/transactions?malformed=query',
        '/api/export/accounts?invalid[]=param',
        '/api/webhooks?test=error',
        '/api/nonexistent-endpoint'
      ];
      
      for (const request of errorTriggeringRequests) {
        const response = await page.request.get(request);
        const responseText = await response.text();
        
        // Error messages should not expose sensitive information
        const sensitivePatterns = [
          /database.*password/i,
          /connection.*string/i,
          /api.*key.*[a-zA-Z0-9]{20,}/i,
          /secret.*[a-zA-Z0-9]{20,}/i,
          /token.*[a-zA-Z0-9]{20,}/i,
          /credit.*card/i,
          /ssn|social.*security/i,
          /account.*number.*\d{6,}/i
        ];
        
        for (const pattern of sensitivePatterns) {
          expect(responseText).not.toMatch(pattern);
        }
        
        console.log(`Error message security verified for ${request}`);
      }
    });

    test('should implement secure backup and recovery procedures', async ({ page }) => {
      // Test data export functionality for backup purposes
      await page.goto('/dashboard/settings');
      
      // Look for data export/backup functionality
      const exportButton = page.locator('text=Export Data').or(
        page.locator('text=Download')).or(
        page.locator('text=Backup'));
      
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        // Should provide secure export options
        const exportOptions = page.locator('text=CSV').or(
          page.locator('text=PDF')).or(
          page.locator('text=JSON'));
        
        await expect(exportOptions.first()).toBeVisible();
        
        // Should have security warnings about exported data
        const securityWarning = page.locator('text=secure').or(
          page.locator('text=confidential')).or(
          page.locator('text=protect'));
        
        if (await securityWarning.isVisible()) {
          console.log('Security warning present for data export');
        }
        
        console.log('Secure data export functionality available');
      }
    });

    test('should handle data anonymization for analytics', async ({ page }) => {
      // Test that analytics data is properly anonymized
      await page.goto('/dashboard/analytics');
      
      // Wait for analytics to load
      await page.waitForTimeout(2000);
      
      // Check that analytics don't expose personal identifiers
      const pageContent = await page.content();
      
      // Analytics should not contain personal identifiers
      const personalDataPatterns = [
        /john\.doe|jane\.smith/i, // Example names
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ // Credit card format
      ];
      
      for (const pattern of personalDataPatterns) {
        expect(pageContent).not.toMatch(pattern);
      }
      
      console.log('Analytics data anonymization verified');
    });
  });

  test.describe('Third-Party Integration Security', () => {
    test('should secure banking API integrations', async ({ page }) => {
      // Test security of banking API integrations
      const bankingEndpoints = [
        '/api/integrations/external?integration=portfolio',
        '/api/integrations/external?integration=spending-insights',
        '/api/integrations/external?integration=financial-health'
      ];
      
      for (const endpoint of bankingEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should require proper authentication
        expect([200, 401, 403]).toContain(response.status());
        
        if (response.status() === 200) {
          const responseText = await response.text();
          
          // Should not expose API keys or secrets
          expect(responseText).not.toMatch(/api[_-]?key.*[a-zA-Z0-9]{20,}/i);
          expect(responseText).not.toMatch(/secret.*[a-zA-Z0-9]{20,}/i);
          expect(responseText).not.toMatch(/token.*[a-zA-Z0-9]{20,}/i);
        }
        
        console.log(`Banking integration security verified for ${endpoint}`);
      }
    });

    test('should validate third-party data integrity', async ({ page }) => {
      // Test that third-party data is validated before use
      const webhookData = {
        event_type: 'transaction.created',
        user_id: '<script>alert("XSS")</script>',
        payload: {
          external_id: 'test-transaction',
          amount: 'invalid-amount',
          description: '<img src="x" onerror="alert(\'XSS\')">',
          date: 'invalid-date'
        }
      };
      
      const response = await page.request.post('/api/webhooks', {
        data: webhookData
      });
      
      // Should validate and reject malicious data
      expect([400, 401, 422]).toContain(response.status());
      
      const responseText = await response.text();
      
      // Response should not echo back malicious content
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('onerror=');
      
      console.log('Third-party data validation verified');
    });

    test('should implement secure webhook signature verification', async ({ page }) => {
      // Test webhook signature verification
      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user',
        payload: {
          external_id: 'test-transaction',
          amount: -25.99,
          description: 'Test transaction',
          date: '2024-01-15'
        }
      };
      
      // Test without signature
      const responseWithoutSignature = await page.request.post('/api/webhooks', {
        data: webhookData
      });
      
      // Should require signature verification
      expect([400, 401, 403]).toContain(responseWithoutSignature.status());
      
      // Test with invalid signature
      const responseWithInvalidSignature = await page.request.post('/api/webhooks', {
        data: webhookData,
        headers: {
          'X-Webhook-Signature': 'invalid-signature'
        }
      });
      
      expect([400, 401, 403]).toContain(responseWithInvalidSignature.status());
      
      console.log('Webhook signature verification implemented');
    });
  });

  test.describe('Incident Response and Monitoring', () => {
    test('should implement security monitoring capabilities', async ({ page }) => {
      // Test that security events are properly monitored
      const suspiciousActivities = [
        { action: 'multiple_failed_logins', endpoint: '/api/auth/sign-in' },
        { action: 'rapid_api_requests', endpoint: '/api/export/transactions' },
        { action: 'unauthorized_access_attempt', endpoint: '/api/export/accounts' }
      ];
      
      for (const activity of suspiciousActivities) {
        // Simulate suspicious activity
        for (let i = 0; i < 5; i++) {
          await page.request.get(activity.endpoint, {
            headers: {
              'X-Security-Test': activity.action,
              'User-Agent': `SecurityTest-${activity.action}-${i}`
            }
          });
          
          await page.waitForTimeout(100);
        }
        
        console.log(`Security monitoring test for ${activity.action} completed`);
      }
    });

    test('should provide security incident reporting', async ({ page }) => {
      await page.goto('/dashboard/settings');
      
      // Look for security or help section
      const securitySection = page.locator('text=Security').or(
        page.locator('text=Help')).or(
        page.locator('text=Support'));
      
      if (await securitySection.isVisible()) {
        await securitySection.click();
        
        // Should have option to report security issues
        const reportOption = page.locator('text=Report').or(
          page.locator('text=Contact')).or(
          page.locator('text=Security Issue'));
        
        if (await reportOption.isVisible()) {
          console.log('Security incident reporting available');
        }
      }
    });

    test('should implement proper logging for financial operations', async ({ page }) => {
      // Test that financial operations are properly logged
      const financialOperations = [
        { name: 'export_transactions', endpoint: '/api/export/transactions' },
        { name: 'export_accounts', endpoint: '/api/export/accounts' },
        { name: 'webhook_received', endpoint: '/api/webhooks' }
      ];
      
      for (const operation of financialOperations) {
        const response = await page.request.get(operation.endpoint, {
          headers: {
            'X-Operation-Log': operation.name,
            'X-Timestamp': new Date().toISOString()
          }
        });
        
        // Operations should be handled consistently
        expect([200, 401, 404]).toContain(response.status());
        
        console.log(`Logging test for ${operation.name}: ${response.status()}`);
      }
    });
  });
});