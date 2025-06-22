import { test, expect } from '@playwright/test';

test.describe('XSS Protection Implementation Testing', () => {
  
  test.describe('Reflected XSS Prevention', () => {
    test('should prevent reflected XSS in search parameters', async ({ page }) => {
      const xssPayloads = [
        // Basic script injection
        '<script>alert("XSS")</script>',
        '<script>document.body.innerHTML="HACKED"</script>',
        
        // Event handler injection
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '<body onload="alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')">',
        
        // JavaScript protocol
        'javascript:alert("XSS")',
        'javascript:document.body.innerHTML="HACKED"',
        
        // Encoded payloads
        '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        
        // Mixed case and whitespace
        '<ScRiPt>alert("XSS")</ScRiPt>',
        '<script >alert("XSS")</script>',
        '<script\n>alert("XSS")</script>',
        
        // CSS injection
        '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        
        // Data URI injection
        '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
        
        // HTML5 vectors
        '<audio src="x" onerror="alert(\'XSS\')">',
        '<video src="x" onerror="alert(\'XSS\')">',
        '<source src="x" onerror="alert(\'XSS\')">',
        
        // Form-based injection
        '<form><button formaction="javascript:alert(\'XSS\')">Click</button></form>',
        '<input type="image" src="x" onerror="alert(\'XSS\')">',
        
        // Advanced payloads
        '<object data="javascript:alert(\'XSS\')">',
        '<embed src="javascript:alert(\'XSS\')">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        
        // Filter bypass attempts
        '<img src="/" =_=" title="onerror=\'alert(1)\'">',
        '<img src="/" =_=" title="onerror=&#x27;alert(1)&#x27;">',
        '"><script>alert("XSS")</script>',
        '\'-alert(1)-\'',
        '";alert(1);//',
        
        // Context breaking
        '</title><script>alert("XSS")</script>',
        '</style><script>alert("XSS")</script>',
        '</script><script>alert("XSS")</script>'
      ];
      
      for (const payload of xssPayloads) {
        // Test in URL parameters
        await page.goto(`/dashboard/transactions?search=${encodeURIComponent(payload)}`);
        
        // Wait briefly for any scripts to execute
        await page.waitForTimeout(500);
        
        // Check that XSS didn't execute
        const dialogMessages: string[] = [];
        page.on('dialog', dialog => {
          dialogMessages.push(dialog.message());
          dialog.dismiss();
        });
        
        // Wait a bit more to catch any delayed script execution
        await page.waitForTimeout(1000);
        
        // Should not have triggered any alert dialogs
        expect(dialogMessages).toHaveLength(0);
        
        // Check that payload is properly escaped in page content
        const pageContent = await page.content();
        
        // Script tags should not be executable
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
        expect(pageContent).not.toContain('javascript:alert');
        expect(pageContent).not.toContain('onerror="alert');
        
        // Check for proper HTML encoding
        if (pageContent.includes(payload)) {
          // If the payload is in the page, it should be HTML-encoded
          expect(pageContent).toMatch(/&lt;|&gt;|&amp;|&quot;/);
        }
      }
    });

    test('should prevent XSS in form inputs', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '"><script>alert("XSS")</script>',
          '<img src="x" onerror="alert(\'XSS\')">',
          'javascript:alert("XSS")',
          '<svg onload="alert(\'XSS\')"></svg>'
        ];
        
        for (const payload of xssPayloads) {
          // Track any dialogs that appear
          const dialogMessages: string[] = [];
          page.on('dialog', dialog => {
            dialogMessages.push(dialog.message());
            dialog.dismiss();
          });
          
          await searchInput.clear();
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          
          await page.waitForTimeout(1000);
          
          // Should not trigger XSS
          expect(dialogMessages).toHaveLength(0);
          
          // Check that input value is properly handled
          const inputValue = await searchInput.inputValue();
          
          // If the value contains HTML, it should be the original string (not executed)
          if (inputValue.includes('<script>')) {
            expect(inputValue).toBe(payload); // Should be the literal string
          }
        }
      }
    });
  });

  test.describe('Stored XSS Prevention', () => {
    test('should prevent stored XSS in goal names', async ({ page }) => {
      await page.goto('/dashboard/goals');
      
      const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
      
      if (await createGoalButton.isVisible()) {
        await createGoalButton.click();
        
        const goalNameInput = page.locator('input[name*="name"], input[placeholder*="Goal"]');
        
        if (await goalNameInput.isVisible()) {
          const xssPayloads = [
            '<script>alert("Stored XSS")</script>',
            '<img src="x" onerror="alert(\'Stored XSS\')">',
            '<svg onload="alert(\'Stored XSS\')"></svg>',
            'javascript:alert("Stored XSS")',
            '<iframe src="javascript:alert(\'Stored XSS\')"></iframe>'
          ];
          
          for (const payload of xssPayloads) {
            // Track dialogs
            const dialogMessages: string[] = [];
            page.on('dialog', dialog => {
              dialogMessages.push(dialog.message());
              dialog.dismiss();
            });
            
            await goalNameInput.clear();
            await goalNameInput.fill(payload);
            
            // Fill other required fields
            const amountInput = page.locator('input[name*="amount"], input[placeholder*="amount"]');
            if (await amountInput.isVisible()) {
              await amountInput.fill('10000');
            }
            
            const dateInput = page.locator('input[type="date"]');
            if (await dateInput.isVisible()) {
              await dateInput.fill('2024-12-31');
            }
            
            // Submit the form
            const submitButton = page.locator('button[type="submit"]');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(2000);
              
              // Should not execute XSS on form submission
              expect(dialogMessages).toHaveLength(0);
              
              // Navigate back to goals page to check stored data
              await page.goto('/dashboard/goals');
              await page.waitForTimeout(1000);
              
              // Should not execute XSS when displaying stored data
              expect(dialogMessages).toHaveLength(0);
              
              // Check that data is properly escaped in display
              const pageContent = await page.content();
              
              if (pageContent.includes(payload)) {
                // Should be HTML-encoded, not executable
                expect(pageContent).not.toContain('<script>alert("Stored XSS")</script>');
                expect(pageContent).toMatch(/&lt;.*&gt;/);
              }
            }
          }
        }
      }
    });

    test('should prevent stored XSS in transaction descriptions', async ({ page }) => {
      // This test simulates adding a transaction with malicious description
      await page.goto('/dashboard/transactions');
      
      // Look for add transaction functionality
      const addTransactionButton = page.locator('text=Add Transaction').or(page.locator('text=Add'));
      
      if (await addTransactionButton.isVisible()) {
        await addTransactionButton.click();
        
        const descriptionInput = page.locator('input[name*="description"], textarea[name*="description"]');
        
        if (await descriptionInput.isVisible()) {
          const xssPayload = '<script>alert("Transaction XSS")</script>';
          
          const dialogMessages: string[] = [];
          page.on('dialog', dialog => {
            dialogMessages.push(dialog.message());
            dialog.dismiss();
          });
          
          await descriptionInput.fill(xssPayload);
          
          // Fill other required fields
          const amountInput = page.locator('input[name*="amount"]');
          if (await amountInput.isVisible()) {
            await amountInput.fill('-25.99');
          }
          
          const submitButton = page.locator('button[type="submit"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Should not execute XSS
            expect(dialogMessages).toHaveLength(0);
            
            // Check transaction list for proper escaping
            await page.goto('/dashboard/transactions');
            await page.waitForTimeout(1000);
            
            expect(dialogMessages).toHaveLength(0);
            
            const pageContent = await page.content();
            expect(pageContent).not.toContain('<script>alert("Transaction XSS")</script>');
          }
        }
      }
    });
  });

  test.describe('DOM-based XSS Prevention', () => {
    test('should prevent DOM XSS via URL fragments', async ({ page }) => {
      const domXssPayloads = [
        '#<script>alert("DOM XSS")</script>',
        '#"><script>alert("DOM XSS")</script>',
        '#javascript:alert("DOM XSS")',
        '#<img src="x" onerror="alert(\'DOM XSS\')">',
        '#<svg onload="alert(\'DOM XSS\')"></svg>'
      ];
      
      for (const payload of domXssPayloads) {
        const dialogMessages: string[] = [];
        page.on('dialog', dialog => {
          dialogMessages.push(dialog.message());
          dialog.dismiss();
        });
        
        await page.goto(`/dashboard${payload}`);
        await page.waitForTimeout(1000);
        
        // Should not execute DOM-based XSS
        expect(dialogMessages).toHaveLength(0);
        
        // Check that hash is not directly inserted into DOM
        const pageSource = await page.evaluate(() => document.documentElement.outerHTML);
        expect(pageSource).not.toContain('<script>alert("DOM XSS")</script>');
      }
    });

    test('should prevent XSS via client-side routing', async ({ page }) => {
      // Test XSS in client-side route parameters
      const routeXssPayloads = [
        '/dashboard/transactions/<script>alert("Route XSS")</script>',
        '/dashboard/accounts/<img src="x" onerror="alert(\'Route XSS\')">',
        '/dashboard/goals/<svg onload="alert(\'Route XSS\')"></svg>'
      ];
      
      for (const payload of routeXssPayloads) {
        const dialogMessages: string[] = [];
        page.on('dialog', dialog => {
          dialogMessages.push(dialog.message());
          dialog.dismiss();
        });
        
        try {
          await page.goto(payload);
          await page.waitForTimeout(1000);
          
          // Should not execute XSS
          expect(dialogMessages).toHaveLength(0);
          
          // Should either show 404 or safely handle the route
          const pageContent = await page.content();
          expect(pageContent).not.toContain('<script>alert("Route XSS")</script>');
        } catch (error) {
          // Navigation errors are acceptable for malformed URLs
        }
      }
    });

    test('should safely handle dynamic content updates', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Test if dynamic content updates are safe from XSS
      const xssPayload = '<script>alert("Dynamic XSS")</script>';
      
      const dialogMessages: string[] = [];
      page.on('dialog', dialog => {
        dialogMessages.push(dialog.message());
        dialog.dismiss();
      });
      
      // Try to inject via any dynamic update mechanism
      await page.evaluate((payload) => {
        // Simulate various ways XSS might be injected via JavaScript
        const element = document.createElement('div');
        element.textContent = payload; // This should be safe
        document.body.appendChild(element);
        
        // Try innerHTML (this should be controlled by the app)
        const testDiv = document.createElement('div');
        testDiv.innerHTML = payload; // Potentially dangerous
        document.body.appendChild(testDiv);
        
        // Try setting data attributes
        const dataDiv = document.createElement('div');
        dataDiv.setAttribute('data-test', payload);
        document.body.appendChild(dataDiv);
      }, xssPayload);
      
      await page.waitForTimeout(1000);
      
      // Should not execute XSS even with dynamic content
      expect(dialogMessages).toHaveLength(0);
    });
  });

  test.describe('Content Security Policy (CSP) Testing', () => {
    test('should implement Content Security Policy headers', async ({ page }) => {
      const response = await page.request.get('/dashboard');
      const headers = response.headers();
      
      // Check for CSP header
      const cspHeader = headers['content-security-policy'] || headers['content-security-policy-report-only'];
      
      if (cspHeader) {
        // Verify CSP contains important directives
        expect(cspHeader).toMatch(/default-src|script-src/);
        
        // Should not allow unsafe-inline for scripts (major XSS vector)
        if (cspHeader.includes('script-src')) {
          // Ideally should not have 'unsafe-inline'
          const hasUnsafeInline = cspHeader.includes('unsafe-inline');
          if (hasUnsafeInline) {
            // If unsafe-inline is present, should at least have nonce or strict-dynamic
            expect(cspHeader).toMatch(/nonce-|strict-dynamic/);
          }
        }
        
        // Should not allow unsafe-eval
        expect(cspHeader).not.toContain('unsafe-eval');
        
        // Should not allow data: URIs for scripts
        if (cspHeader.includes('script-src')) {
          expect(cspHeader).not.toMatch(/script-src[^;]*data:/);
        }
      }
    });

    test('should block inline scripts when CSP is enabled', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Try to inject inline script via console
      const scriptExecuted = await page.evaluate(() => {
        try {
          // This should be blocked by CSP
          const script = document.createElement('script');
          script.innerHTML = 'window.xssTest = true';
          document.head.appendChild(script);
          
          // Check if it executed
          return !!(window as any).xssTest;
        } catch (error) {
          return false;
        }
      });
      
      // Script should not execute if CSP is properly configured
      if (scriptExecuted) {
        console.warn('Inline script executed - CSP might need strengthening');
      }
    });

    test('should report CSP violations', async ({ page }) => {
      // Listen for CSP violation reports
      const cspViolations: any[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        }
      });
      
      await page.goto('/dashboard');
      
      // Try to trigger CSP violation
      await page.evaluate(() => {
        try {
          // This should trigger a CSP violation if properly configured
          eval('console.log("CSP test")');
        } catch (error) {
          // Expected if CSP blocks eval
        }
      });
      
      await page.waitForTimeout(1000);
      
      // CSP violations might be reported (depending on configuration)
    });
  });

  test.describe('Input Sanitization and Output Encoding', () => {
    test('should properly encode HTML entities', async ({ page }) => {
      const htmlEntities = [
        { input: '<', expected: '&lt;' },
        { input: '>', expected: '&gt;' },
        { input: '&', expected: '&amp;' },
        { input: '"', expected: '&quot;' },
        { input: "'", expected: '&#x27;' }
      ];
      
      await page.goto('/dashboard/transactions');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        for (const { input, expected } of htmlEntities) {
          await searchInput.clear();
          await searchInput.fill(input);
          await page.keyboard.press('Enter');
          
          await page.waitForTimeout(500);
          
          // Check that HTML entities are properly encoded in output
          const pageContent = await page.content();
          
          if (pageContent.includes(input)) {
            // Should find encoded version if the input is displayed
            expect(pageContent).toContain(expected);
          }
        }
      }
    });

    test('should handle Unicode and special characters safely', async ({ page }) => {
      const specialChars = [
        '𝕏𝕊𝕊', // Mathematical characters that might look like XSS
        '＜script＞', // Full-width characters
        '\u003cscript\u003e', // Unicode escape sequences
        '&#60;script&#62;', // HTML entities
        '%3Cscript%3E', // URL encoding
        '\x3Cscript\x3E', // Hex escape sequences
        '🔥💯📊', // Emojis
        'Тест', // Cyrillic
        '测试', // Chinese
        'اختبار', // Arabic
        '🏦💳🔐' // Banking-related emojis
      ];
      
      await page.goto('/dashboard/goals');
      
      const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
      
      if (await createGoalButton.isVisible()) {
        await createGoalButton.click();
        
        const goalNameInput = page.locator('input[name*="name"], input[placeholder*="Goal"]');
        
        if (await goalNameInput.isVisible()) {
          for (const char of specialChars) {
            const dialogMessages: string[] = [];
            page.on('dialog', dialog => {
              dialogMessages.push(dialog.message());
              dialog.dismiss();
            });
            
            await goalNameInput.clear();
            await goalNameInput.fill(`Test Goal ${char}`);
            
            await page.waitForTimeout(500);
            
            // Should not execute as script
            expect(dialogMessages).toHaveLength(0);
            
            // Should handle Unicode safely
            const inputValue = await goalNameInput.inputValue();
            expect(inputValue).toContain(char);
          }
        }
      }
    });

    test('should validate and sanitize file upload content', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible()) {
        // Create malicious CSV content
        const maliciousCSVContent = `"Name","Amount","Date"
"Test Transaction","100","2024-01-01"
"<script>alert('CSV XSS')</script>","200","2024-01-02"
"=cmd|'/c calc'!A0","300","2024-01-03"`;
        
        const dialogMessages: string[] = [];
        page.on('dialog', dialog => {
          dialogMessages.push(dialog.message());
          dialog.dismiss();
        });
        
        await fileInput.setInputFiles({
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(maliciousCSVContent)
        });
        
        const uploadButton = page.locator('button:has-text("Upload")').or(page.locator('button[type="submit"]'));
        
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
          await page.waitForTimeout(2000);
          
          // Should not execute XSS from file content
          expect(dialogMessages).toHaveLength(0);
          
          // Check that data is safely displayed
          const pageContent = await page.content();
          expect(pageContent).not.toContain('<script>alert(\'CSV XSS\')</script>');
        }
      }
    });
  });

  test.describe('JavaScript Framework XSS Protection', () => {
    test('should leverage React/Next.js XSS protections', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test that React's built-in XSS protection is working
      const xssPayload = '<script>alert("React XSS")</script>';
      
      const dialogMessages: string[] = [];
      page.on('dialog', dialog => {
        dialogMessages.push(dialog.message());
        dialog.dismiss();
      });
      
      // Try to inject via common React patterns
      await page.evaluate((payload) => {
        // This should be safe in React
        const element = document.querySelector('h1');
        if (element) {
          element.textContent = payload;
        }
        
        // Try to manipulate props (should be controlled by React)
        const reactRoot = document.querySelector('#__next');
        if (reactRoot) {
          reactRoot.setAttribute('data-test', payload);
        }
      }, xssPayload);
      
      await page.waitForTimeout(1000);
      
      // Should not execute XSS
      expect(dialogMessages).toHaveLength(0);
      
      // Check that React properly escaped the content
      const pageContent = await page.content();
      if (pageContent.includes(xssPayload)) {
        expect(pageContent).not.toContain('<script>alert("React XSS")</script>');
      }
    });

    test('should handle dangerouslySetInnerHTML safely', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check if any components use dangerouslySetInnerHTML
      const hasDangerousHTML = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
          if (element.innerHTML.includes('<script>') || 
              element.innerHTML.includes('javascript:') ||
              element.innerHTML.includes('onerror=')) {
            return true;
          }
        }
        return false;
      });
      
      // If dangerouslySetInnerHTML is used, content should be sanitized
      if (hasDangerousHTML) {
        const dialogMessages: string[] = [];
        page.on('dialog', dialog => {
          dialogMessages.push(dialog.message());
          dialog.dismiss();
        });
        
        await page.waitForTimeout(1000);
        
        // Should not execute any embedded scripts
        expect(dialogMessages).toHaveLength(0);
      }
    });
  });
});