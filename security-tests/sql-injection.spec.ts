import { test, expect } from '@playwright/test';

test.describe('SQL Injection Prevention Testing', () => {
  
  test.describe('API Endpoint SQL Injection Tests', () => {
    test('should prevent SQL injection in transaction search', async ({ page }) => {
      const sqlInjectionPayloads = [
        // Classic injection attempts
        "'; DROP TABLE transactions; --",
        "' OR '1'='1' --",
        "' OR 1=1 --",
        "'; DELETE FROM accounts; --",
        
        // Union-based injections
        "' UNION SELECT * FROM users --",
        "' UNION SELECT password FROM users WHERE email='admin@example.com' --",
        "' UNION SELECT credit_card_number FROM accounts --",
        
        // Boolean-based injections
        "' AND (SELECT COUNT(*) FROM users) > 0 --",
        "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE email='admin@example.com')='a' --",
        
        // Time-based injections
        "'; WAITFOR DELAY '00:00:05' --",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a) --",
        
        // Error-based injections
        "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT password FROM users LIMIT 1), 0x7e)) --",
        "' AND (SELECT * FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a) --",
        
        // Advanced payload variations
        "admin' --",
        "admin' #",
        "admin'/*",
        "' or 1=1#",
        "' or 1=1--",
        "') or '1'='1--",
        "') or ('1'='1--"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const response = await page.request.get(`/api/export/transactions?search=${encodeURIComponent(payload)}`);
        
        // Should not return 500 errors that might indicate SQL injection
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        
        // Should not contain SQL error messages
        const sqlErrorPatterns = [
          /sql syntax/i,
          /mysql/i,
          /postgresql/i,
          /ora-\d+/i,
          /syntax error/i,
          /unclosed quotation mark/i,
          /incorrect syntax near/i,
          /unknown column/i,
          /table.*doesn't exist/i,
          /database.*error/i,
          /sqlstate/i,
          /warning.*mysql/i
        ];
        
        for (const pattern of sqlErrorPatterns) {
          expect(responseText).not.toMatch(pattern);
        }
        
        // Should not return sensitive database information
        expect(responseText).not.toContain('@@version');
        expect(responseText).not.toContain('information_schema');
        expect(responseText).not.toContain('mysql.user');
        expect(responseText).not.toContain('pg_user');
        expect(responseText).not.toMatch(/password.*hash/i);
      }
    });

    test('should prevent SQL injection in account filtering', async ({ page }) => {
      const injectionPayloads = [
        "1' OR '1'='1",
        "1'; DROP TABLE accounts; --",
        "1' UNION SELECT * FROM users --",
        "1' AND (SELECT COUNT(*) FROM accounts) > 0 --"
      ];
      
      for (const payload of injectionPayloads) {
        const response = await page.request.get(`/api/export/accounts?accountId=${encodeURIComponent(payload)}`);
        
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(responseText).not.toMatch(/sql|mysql|postgresql|database.*error/i);
      }
    });

    test('should prevent SQL injection in date range queries', async ({ page }) => {
      const dateInjectionPayloads = [
        "2024-01-01'; DROP TABLE transactions; --",
        "2024-01-01' OR '1'='1' --",
        "2024-01-01' UNION SELECT * FROM users --",
        "''; DELETE FROM accounts; --"
      ];
      
      for (const payload of dateInjectionPayloads) {
        const response = await page.request.get(`/api/export/transactions?startDate=${encodeURIComponent(payload)}`);
        
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(responseText).not.toMatch(/sql|database.*error|syntax.*error/i);
      }
    });

    test('should prevent SQL injection in category filtering', async ({ page }) => {
      const categoryInjectionPayloads = [
        "Groceries'; DROP TABLE categories; --",
        "Groceries' OR '1'='1' --",
        "Groceries' UNION SELECT password FROM users --",
        "'; UPDATE accounts SET balance=999999 WHERE id=1; --"
      ];
      
      for (const payload of categoryInjectionPayloads) {
        const response = await page.request.get(`/api/export/transactions?category=${encodeURIComponent(payload)}`);
        
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(responseText).not.toMatch(/sql|mysql|postgresql|syntax.*error/i);
      }
    });
  });

  test.describe('Form Input SQL Injection Tests', () => {
    test('should prevent SQL injection in search forms', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        const injectionPayloads = [
          "'; DROP TABLE transactions; --",
          "' OR '1'='1' --",
          "test' UNION SELECT * FROM users --"
        ];
        
        for (const payload of injectionPayloads) {
          await searchInput.clear();
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          
          // Wait for any potential error messages
          await page.waitForTimeout(1000);
          
          // Should not show database errors
          const errorMessage = page.locator('text=SQL').or(page.locator('text=database error'));
          const hasError = await errorMessage.isVisible();
          expect(hasError).toBeFalsy();
          
          // Page should still be functional
          await expect(page.locator('text=Transactions')).toBeVisible();
        }
      }
    });

    test('should prevent SQL injection in filter forms', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Look for filter inputs
      const filterInputs = await page.locator('select, input[name*="filter"], input[name*="category"]').all();
      
      for (const input of filterInputs) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'input') {
          await input.fill("' OR '1'='1' --");
        } else if (tagName === 'select') {
          // Try to inject via option value manipulation
          await input.selectOption("' OR '1'='1' --");
        }
        
        // Submit or trigger the filter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Should not cause SQL errors
        const sqlError = page.locator('text=SQL').or(page.locator('text=syntax error'));
        const hasError = await sqlError.isVisible();
        expect(hasError).toBeFalsy();
      }
    });

    test('should prevent SQL injection in account creation', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      const addAccountButton = page.locator('text=Add Account');
      
      if (await addAccountButton.isVisible()) {
        await addAccountButton.click();
        
        // Look for account form inputs
        const accountNameInput = page.locator('input[name*="name"], input[placeholder*="Account"]');
        
        if (await accountNameInput.isVisible()) {
          const injectionPayloads = [
            "Test Account'; DROP TABLE accounts; --",
            "Account' OR '1'='1' --",
            "'; DELETE FROM users; --"
          ];
          
          for (const payload of injectionPayloads) {
            await accountNameInput.clear();
            await accountNameInput.fill(payload);
            
            const submitButton = page.locator('button[type="submit"]');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(1000);
              
              // Should not cause SQL errors
              const errorText = await page.textContent('body');
              expect(errorText).not.toMatch(/sql|database.*error|syntax.*error/i);
            }
          }
        }
      }
    });
  });

  test.describe('Advanced SQL Injection Techniques', () => {
    test('should prevent blind SQL injection attacks', async ({ page }) => {
      const blindInjectionPayloads = [
        // Boolean-based blind injection
        "test' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE email='admin@example.com')='a' --",
        "test' AND (SELECT COUNT(*) FROM accounts WHERE user_id=1) > 0 --",
        
        // Time-based blind injection
        "test'; IF (1=1) WAITFOR DELAY '00:00:05' --",
        "test' AND IF(1=1,SLEEP(5),0) --",
        
        // Error-based injection
        "test' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT password FROM users LIMIT 1),0x7e)) --"
      ];
      
      for (const payload of blindInjectionPayloads) {
        const startTime = Date.now();
        
        const response = await page.request.get(`/api/export/transactions?search=${encodeURIComponent(payload)}`);
        
        const responseTime = Date.now() - startTime;
        
        // Should not take excessively long (indicating time-based injection worked)
        expect(responseTime).toBeLessThan(10000); // Less than 10 seconds
        
        // Should not return database errors
        const responseText = await response.text();
        expect(responseText).not.toMatch(/extractvalue|concat|substring|sleep|waitfor/i);
      }
    });

    test('should prevent second-order SQL injection', async ({ page }) => {
      // Second-order injection: malicious data stored and later executed
      await page.goto('/dashboard/goals');
      
      const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
      
      if (await createGoalButton.isVisible()) {
        await createGoalButton.click();
        
        const goalNameInput = page.locator('input[name*="name"], input[placeholder*="Goal"]');
        
        if (await goalNameInput.isVisible()) {
          // Store potentially malicious data
          const maliciousGoalName = "Emergency Fund'; DROP TABLE goals; --";
          
          await goalNameInput.fill(maliciousGoalName);
          
          const amountInput = page.locator('input[name*="amount"], input[placeholder*="amount"]');
          if (await amountInput.isVisible()) {
            await amountInput.fill('10000');
          }
          
          const submitButton = page.locator('button[type="submit"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Later, when this data is retrieved and used
            await page.goto('/dashboard/goals');
            await page.waitForTimeout(1000);
            
            // Should not cause SQL injection when displaying stored data
            const pageContent = await page.textContent('body');
            expect(pageContent).not.toMatch(/sql|database.*error|table.*doesn't exist/i);
            
            // Goals page should still be functional
            await expect(page.locator('text=Goals')).toBeVisible();
          }
        }
      }
    });

    test('should handle SQL injection in JSON payloads', async ({ page }) => {
      const jsonInjectionPayloads = [
        {
          search: "'; DROP TABLE transactions; --",
          filters: { category: "' OR '1'='1' --" }
        },
        {
          accountData: {
            name: "Test Account'; DELETE FROM accounts; --",
            type: "current' UNION SELECT * FROM users --"
          }
        }
      ];
      
      for (const payload of jsonInjectionPayloads) {
        const response = await page.request.post('/api/export/transactions', {
          data: payload
        });
        
        // Should handle malicious JSON without SQL injection
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(responseText).not.toMatch(/sql|database.*error|syntax.*error/i);
      }
    });

    test('should prevent NoSQL injection if applicable', async ({ page }) => {
      // Test for NoSQL injection patterns (if the app uses MongoDB, etc.)
      const noSqlInjectionPayloads = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.password.match(/.*/)"}',
        '{"$regex": ".*"}',
        '{"$or": [{"password": {"$regex": ".*"}}, {"email": {"$regex": ".*"}}]}'
      ];
      
      for (const payload of noSqlInjectionPayloads) {
        const response = await page.request.get(`/api/export/transactions?search=${encodeURIComponent(payload)}`);
        
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        // Should not reveal MongoDB/NoSQL structure
        expect(responseText).not.toMatch(/\$ne|\$gt|\$where|\$regex|\$or/);
        expect(responseText).not.toMatch(/mongo|nosql|document/i);
      }
    });
  });

  test.describe('Database Query Parameterization Verification', () => {
    test('should use parameterized queries for all database operations', async ({ page }) => {
      // This test verifies that the application properly uses parameterized queries
      // by testing edge cases that would break non-parameterized queries
      
      const edgeCaseInputs = [
        "O'Reilly's Restaurant", // Single quotes
        'Restaurant "The Best" Food', // Double quotes
        "Café & Bistro", // Special characters
        "100% Natural Foods", // Percent signs
        "Test_Account_Name", // Underscores
        "Account[1]", // Square brackets
        "Data\nWith\nNewlines", // Newlines
        "Data\tWith\tTabs", // Tabs
        "Unicode: 测试 账户", // Unicode characters
        "Emoji Test 🏦💳", // Emojis
        ""; DROP TABLE test; --", // SQL command as string
        "\\'; DROP TABLE test; --", // Escaped quotes
        String.fromCharCode(0), // Null character
        "x".repeat(1000) // Very long string
      ];
      
      for (const input of edgeCaseInputs) {
        // Test in search endpoint
        const response = await page.request.get(`/api/export/transactions?search=${encodeURIComponent(input)}`);
        
        // Should handle edge cases gracefully without SQL errors
        expect([200, 400, 401, 404]).toContain(response.status());
        
        if (response.status() !== 401) { // Skip if not authenticated
          const responseText = await response.text();
          expect(responseText).not.toMatch(/sql.*error|syntax.*error|database.*error/i);
        }
      }
    });

    test('should properly escape user input in all contexts', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        // Test various input contexts
        const specialInputs = [
          "'single quotes'",
          '"double quotes"',
          "back`ticks`",
          "percent%signs",
          "under_scores",
          "dash-es",
          "dots.in.text",
          "slashes/and\\backslashes",
          "parentheses(and)brackets[and]{curly}",
          "@symbols#and$others%"
        ];
        
        for (const input of specialInputs) {
          await searchInput.clear();
          await searchInput.fill(input);
          await page.keyboard.press('Enter');
          
          await page.waitForTimeout(500);
          
          // Should not cause errors
          const errorIndicator = page.locator('text=Error').or(page.locator('text=Failed'));
          const hasError = await errorIndicator.isVisible();
          
          if (hasError) {
            // If there's an error, it should be a validation error, not a SQL error
            const errorText = await errorIndicator.textContent();
            expect(errorText?.toLowerCase()).not.toContain('sql');
            expect(errorText?.toLowerCase()).not.toContain('database');
          }
        }
      }
    });

    test('should validate data types to prevent injection', async ({ page }) => {
      // Test type confusion attacks
      const typeConfusionPayloads = [
        { param: 'limit', value: "'; DROP TABLE transactions; --" }, // String where number expected
        { param: 'offset', value: "' OR '1'='1' --" }, // String where number expected
        { param: 'accountId', value: "' UNION SELECT * FROM users --" }, // String where ID expected
        { param: 'amount', value: "'; DELETE FROM accounts; --" } // String where number expected
      ];
      
      for (const { param, value } of typeConfusionPayloads) {
        const response = await page.request.get(`/api/export/transactions?${param}=${encodeURIComponent(value)}`);
        
        // Should validate input types and reject invalid types
        expect([400, 401, 422]).toContain(response.status());
        
        if (response.status() !== 401) {
          const responseText = await response.text();
          expect(responseText).not.toMatch(/sql|database.*error|syntax.*error/i);
        }
      }
    });
  });

  test.describe('Database Error Handling', () => {
    test('should not expose database structure in error messages', async ({ page }) => {
      // Test various malformed requests that might trigger database errors
      const malformedRequests = [
        '/api/export/transactions?invalidParam=value',
        '/api/export/accounts?malformed[]=injection',
        '/api/goals?nested[deep][injection]=attempt'
      ];
      
      for (const request of malformedRequests) {
        const response = await page.request.get(request);
        const responseText = await response.text();
        
        // Should not expose database schema or table names
        const exposedInfoPatterns = [
          /table.*\w+.*doesn't exist/i,
          /column.*\w+.*not found/i,
          /relation.*\w+.*does not exist/i,
          /unknown table/i,
          /unknown column/i,
          /duplicate entry.*for key/i,
          /foreign key constraint/i,
          /check constraint/i,
          /primary key.*violation/i
        ];
        
        for (const pattern of exposedInfoPatterns) {
          expect(responseText).not.toMatch(pattern);
        }
      }
    });

    test('should handle database connection errors securely', async ({ page }) => {
      // This test simulates what should happen if database connection fails
      // In a real scenario, you might temporarily disconnect from database
      
      // Test endpoints that would query the database
      const dbEndpoints = [
        '/api/export/transactions',
        '/api/export/accounts',
        '/api/export/financial-summary'
      ];
      
      for (const endpoint of dbEndpoints) {
        const response = await page.request.get(endpoint);
        const responseText = await response.text();
        
        // Should not expose connection strings or database details
        expect(responseText).not.toMatch(/connection.*refused/i);
        expect(responseText).not.toMatch(/host.*\d+\.\d+\.\d+\.\d+/);
        expect(responseText).not.toMatch(/port.*\d+/);
        expect(responseText).not.toMatch(/database.*\w+.*not found/i);
        expect(responseText).not.toMatch(/authentication.*failed.*user/i);
      }
    });
  });
});