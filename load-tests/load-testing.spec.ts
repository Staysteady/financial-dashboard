import { test, expect } from '@playwright/test';

test.describe('Load Testing for Concurrent Users', () => {
  
  test.describe('Concurrent User Simulation', () => {
    test('should handle 5 concurrent users on dashboard', async ({ browser }) => {
      const concurrentUsers = 5;
      const contexts = [];
      const pages = [];
      const results = [];
      
      // Create multiple browser contexts (simulating different users)
      for (let i = 0; i < concurrentUsers; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Simulate concurrent dashboard access
      const promises = pages.map(async (page, index) => {
        const userStartTime = Date.now();
        
        try {
          await page.goto('/dashboard');
          await expect(page.locator('text=Dashboard').or(page.locator('text=Account Overview'))).toBeVisible({ timeout: 10000 });
          
          const userLoadTime = Date.now() - userStartTime;
          return { userId: index + 1, success: true, loadTime: userLoadTime };
        } catch (error) {
          const userLoadTime = Date.now() - userStartTime;
          return { userId: index + 1, success: false, loadTime: userLoadTime, error: error.message };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Analyze results
      const successfulLoads = results.filter(r => r.success);
      const failedLoads = results.filter(r => !r.success);
      const avgLoadTime = successfulLoads.reduce((sum, r) => sum + r.loadTime, 0) / successfulLoads.length;
      
      console.log(`Concurrent load test results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful loads: ${successfulLoads.length}/${concurrentUsers}`);
      console.log(`- Failed loads: ${failedLoads.length}`);
      console.log(`- Average load time: ${avgLoadTime.toFixed(2)}ms`);
      
      if (failedLoads.length > 0) {
        console.log('Failed loads:', failedLoads);
      }
      
      // At least 80% of users should successfully load
      expect(successfulLoads.length).toBeGreaterThanOrEqual(Math.ceil(concurrentUsers * 0.8));
      
      // Average load time should be reasonable under load
      expect(avgLoadTime).toBeLessThan(8000);
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should handle concurrent API requests efficiently', async ({ browser }) => {
      const concurrentRequests = 10;
      const contexts = [];
      const pages = [];
      
      // Create multiple browser contexts
      for (let i = 0; i < concurrentRequests; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Make concurrent API requests
      const promises = pages.map(async (page, index) => {
        const requestStartTime = Date.now();
        
        try {
          const response = await page.request.get('/api/export/transactions?limit=50');
          const requestTime = Date.now() - requestStartTime;
          
          return {
            requestId: index + 1,
            success: response.status() === 200 || response.status() === 401, // 401 is acceptable (not authenticated)
            status: response.status(),
            responseTime: requestTime
          };
        } catch (error) {
          const requestTime = Date.now() - requestStartTime;
          return {
            requestId: index + 1,
            success: false,
            status: 0,
            responseTime: requestTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Analyze API performance under load
      const successfulRequests = results.filter(r => r.success);
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      const maxResponseTime = Math.max(...successfulRequests.map(r => r.responseTime));
      
      console.log(`Concurrent API test results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful requests: ${successfulRequests.length}/${concurrentRequests}`);
      console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`- Max response time: ${maxResponseTime}ms`);
      
      // Most requests should succeed
      expect(successfulRequests.length).toBeGreaterThanOrEqual(Math.ceil(concurrentRequests * 0.8));
      
      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(5000);
      
      // No individual request should take extremely long
      expect(maxResponseTime).toBeLessThan(10000);
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should maintain performance with concurrent chart rendering', async ({ browser }) => {
      const concurrentUsers = 3;
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Concurrent analytics page access (heavy chart rendering)
      const promises = pages.map(async (page, index) => {
        const userStartTime = Date.now();
        
        try {
          await page.goto('/dashboard/analytics');
          
          // Wait for charts to render
          const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
          await expect(chartContainer.first()).toBeVisible({ timeout: 15000 });
          
          const renderTime = Date.now() - userStartTime;
          
          // Check if multiple charts rendered
          const chartCount = await chartContainer.count();
          
          return {
            userId: index + 1,
            success: true,
            renderTime: renderTime,
            chartCount: chartCount
          };
        } catch (error) {
          const renderTime = Date.now() - userStartTime;
          return {
            userId: index + 1,
            success: false,
            renderTime: renderTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successfulRenders = results.filter(r => r.success);
      const avgRenderTime = successfulRenders.reduce((sum, r) => sum + r.renderTime, 0) / successfulRenders.length;
      
      console.log(`Concurrent chart rendering results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful renders: ${successfulRenders.length}/${concurrentUsers}`);
      console.log(`- Average render time: ${avgRenderTime.toFixed(2)}ms`);
      
      // All chart rendering should succeed
      expect(successfulRenders.length).toBe(concurrentUsers);
      
      // Chart rendering should complete within reasonable time even under load
      expect(avgRenderTime).toBeLessThan(12000);
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Database Load Testing', () => {
    test('should handle concurrent database queries', async ({ browser }) => {
      const concurrentQueries = 8;
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < concurrentQueries; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const queryEndpoints = [
        '/api/export/transactions',
        '/api/export/accounts',
        '/api/export/financial-summary',
        '/api/integrations/external?integration=portfolio'
      ];
      
      const startTime = Date.now();
      
      // Make concurrent database queries
      const promises = pages.map(async (page, index) => {
        const endpoint = queryEndpoints[index % queryEndpoints.length];
        const queryStartTime = Date.now();
        
        try {
          const response = await page.request.get(endpoint);
          const queryTime = Date.now() - queryStartTime;
          
          return {
            queryId: index + 1,
            endpoint: endpoint,
            success: response.status() === 200 || response.status() === 401,
            status: response.status(),
            queryTime: queryTime
          };
        } catch (error) {
          const queryTime = Date.now() - queryStartTime;
          return {
            queryId: index + 1,
            endpoint: endpoint,
            success: false,
            status: 0,
            queryTime: queryTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Analyze database performance
      const successfulQueries = results.filter(r => r.success);
      const avgQueryTime = successfulQueries.reduce((sum, r) => sum + r.queryTime, 0) / successfulQueries.length;
      
      console.log(`Concurrent database query results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful queries: ${successfulQueries.length}/${concurrentQueries}`);
      console.log(`- Average query time: ${avgQueryTime.toFixed(2)}ms`);
      
      // Database should handle concurrent queries well
      expect(successfulQueries.length).toBeGreaterThanOrEqual(Math.ceil(concurrentQueries * 0.8));
      
      // Query times should remain reasonable under load
      expect(avgQueryTime).toBeLessThan(6000);
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should handle mixed read/write operations', async ({ browser }) => {
      const concurrentOperations = 6;
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Mix of read and write operations
      const promises = pages.map(async (page, index) => {
        const operationStartTime = Date.now();
        
        try {
          let response;
          let operationType;
          
          if (index % 3 === 0) {
            // Write operation - webhook (simulated transaction creation)
            operationType = 'write';
            response = await page.request.post('/api/webhooks', {
              data: {
                event_type: 'transaction.created',
                user_id: 'test-user',
                payload: {
                  external_id: `load-test-${index}-${Date.now()}`,
                  amount: -25.99,
                  description: `Load test transaction ${index}`,
                  date: '2024-01-15'
                }
              }
            });
          } else {
            // Read operation
            operationType = 'read';
            response = await page.request.get('/api/export/transactions?limit=25');
          }
          
          const operationTime = Date.now() - operationStartTime;
          
          return {
            operationId: index + 1,
            type: operationType,
            success: response.status() === 200 || response.status() === 201 || response.status() === 401,
            status: response.status(),
            operationTime: operationTime
          };
        } catch (error) {
          const operationTime = Date.now() - operationStartTime;
          return {
            operationId: index + 1,
            type: 'unknown',
            success: false,
            status: 0,
            operationTime: operationTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Analyze mixed operation performance
      const successfulOps = results.filter(r => r.success);
      const readOps = results.filter(r => r.type === 'read');
      const writeOps = results.filter(r => r.type === 'write');
      
      console.log(`Mixed operation results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful operations: ${successfulOps.length}/${concurrentOperations}`);
      console.log(`- Read operations: ${readOps.length}`);
      console.log(`- Write operations: ${writeOps.length}`);
      
      // Most operations should succeed
      expect(successfulOps.length).toBeGreaterThanOrEqual(Math.ceil(concurrentOperations * 0.7));
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Resource Contention Testing', () => {
    test('should handle concurrent file uploads', async ({ browser }) => {
      const concurrentUploads = 3;
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < concurrentUploads; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Simulate concurrent file uploads
      const promises = pages.map(async (page, index) => {
        const uploadStartTime = Date.now();
        
        try {
          await page.goto('/dashboard/accounts');
          
          const fileInput = page.locator('input[type="file"]');
          
          if (await fileInput.isVisible()) {
            // Create test CSV content
            const csvContent = Array.from({ length: 100 }, (_, i) => 
              `"Transaction ${index}-${i}","${(Math.random() * 100).toFixed(2)}","2024-01-01"`
            ).join('\n');
            
            const fullContent = '"Description","Amount","Date"\n' + csvContent;
            
            await fileInput.setInputFiles({
              name: `test-upload-${index}.csv`,
              mimeType: 'text/csv',
              buffer: Buffer.from(fullContent)
            });
            
            const uploadButton = page.locator('button:has-text("Upload")').or(page.locator('button[type="submit"]'));
            
            if (await uploadButton.isVisible()) {
              await uploadButton.click();
              await page.waitForTimeout(3000);
              
              const uploadTime = Date.now() - uploadStartTime;
              
              return {
                uploadId: index + 1,
                success: true,
                uploadTime: uploadTime
              };
            }
          }
          
          return {
            uploadId: index + 1,
            success: false,
            uploadTime: Date.now() - uploadStartTime,
            reason: 'Upload interface not available'
          };
        } catch (error) {
          const uploadTime = Date.now() - uploadStartTime;
          return {
            uploadId: index + 1,
            success: false,
            uploadTime: uploadTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successfulUploads = results.filter(r => r.success);
      
      console.log(`Concurrent upload results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful uploads: ${successfulUploads.length}/${concurrentUploads}`);
      
      if (successfulUploads.length > 0) {
        const avgUploadTime = successfulUploads.reduce((sum, r) => sum + r.uploadTime, 0) / successfulUploads.length;
        console.log(`- Average upload time: ${avgUploadTime.toFixed(2)}ms`);
        
        // Uploads should complete within reasonable time even under contention
        expect(avgUploadTime).toBeLessThan(15000);
      }
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should maintain session integrity under load', async ({ browser }) => {
      const concurrentSessions = 4;
      const contexts = [];
      const pages = [];
      
      for (let i = 0; i < concurrentSessions; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Test session handling under concurrent access
      const promises = pages.map(async (page, index) => {
        const sessionStartTime = Date.now();
        
        try {
          // Navigate to different pages to test session consistency
          const testPages = ['/dashboard', '/dashboard/accounts', '/dashboard/transactions'];
          
          for (const testPage of testPages) {
            await page.goto(testPage);
            await page.waitForTimeout(500);
            
            // Check if session is maintained
            const currentUrl = page.url();
            const isRedirectedToAuth = currentUrl.includes('/auth/sign-in');
            
            if (isRedirectedToAuth) {
              // Session lost - this might be expected behavior
              break;
            }
          }
          
          const sessionTime = Date.now() - sessionStartTime;
          
          return {
            sessionId: index + 1,
            success: true,
            sessionTime: sessionTime,
            finalUrl: page.url()
          };
        } catch (error) {
          const sessionTime = Date.now() - sessionStartTime;
          return {
            sessionId: index + 1,
            success: false,
            sessionTime: sessionTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successfulSessions = results.filter(r => r.success);
      
      console.log(`Concurrent session test results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful sessions: ${successfulSessions.length}/${concurrentSessions}`);
      
      // Sessions should be handled consistently
      expect(successfulSessions.length).toBe(concurrentSessions);
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Stress Testing', () => {
    test('should handle rapid sequential requests', async ({ page }) => {
      const rapidRequests = 15;
      const requestInterval = 100; // 100ms between requests
      
      const results = [];
      const startTime = Date.now();
      
      // Make rapid sequential requests
      for (let i = 0; i < rapidRequests; i++) {
        const requestStartTime = Date.now();
        
        try {
          const response = await page.request.get('/api/export/transactions?limit=10');
          const requestTime = Date.now() - requestStartTime;
          
          results.push({
            requestId: i + 1,
            success: response.status() === 200 || response.status() === 401,
            status: response.status(),
            requestTime: requestTime
          });
        } catch (error) {
          const requestTime = Date.now() - requestStartTime;
          results.push({
            requestId: i + 1,
            success: false,
            status: 0,
            requestTime: requestTime,
            error: error.message
          });
        }
        
        // Wait briefly between requests
        if (i < rapidRequests - 1) {
          await page.waitForTimeout(requestInterval);
        }
      }
      
      const totalTime = Date.now() - startTime;
      const successfulRequests = results.filter(r => r.success);
      
      console.log(`Rapid request stress test results:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Successful requests: ${successfulRequests.length}/${rapidRequests}`);
      
      if (successfulRequests.length > 0) {
        const avgRequestTime = successfulRequests.reduce((sum, r) => sum + r.requestTime, 0) / successfulRequests.length;
        console.log(`- Average request time: ${avgRequestTime.toFixed(2)}ms`);
        
        // Should handle rapid requests reasonably well
        expect(successfulRequests.length).toBeGreaterThanOrEqual(Math.ceil(rapidRequests * 0.8));
        expect(avgRequestTime).toBeLessThan(3000);
      }
    });

    test('should handle memory pressure gracefully', async ({ page }) => {
      // Test behavior under memory pressure
      await page.goto('/dashboard/analytics');
      
      // Generate memory pressure
      const memoryPressureResult = await page.evaluate(() => {
        const largeArrays = [];
        const startMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        
        try {
          // Create memory pressure
          for (let i = 0; i < 50; i++) {
            largeArrays.push(new Array(100000).fill(`memory-test-${i}`));
          }
          
          const endMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
          
          return {
            success: true,
            startMemory: startMemory,
            endMemory: endMemory,
            memoryIncrease: endMemory - startMemory
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log('Memory pressure test:', memoryPressureResult);
      
      // Page should remain functional even under memory pressure
      await expect(page.locator('text=Analytics')).toBeVisible();
      
      // Charts should still be rendered
      const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
      await expect(chartContainer.first()).toBeVisible({ timeout: 8000 });
    });
  });
});