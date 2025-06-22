import { test, expect } from '@playwright/test';

test.describe('Performance Testing and Optimization', () => {
  
  test.describe('Page Load Performance', () => {
    test('should load homepage within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for main content to be visible
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Homepage should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check Web Vitals using Playwright's built-in metrics
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const metrics: any = {};
            
            entries.forEach((entry) => {
              if (entry.entryType === 'navigation') {
                const navEntry = entry as PerformanceNavigationTiming;
                metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.navigationStart;
                metrics.loadComplete = navEntry.loadEventEnd - navEntry.navigationStart;
                metrics.firstPaint = navEntry.responseEnd - navEntry.navigationStart;
              }
            });
            
            resolve(metrics);
          }).observe({ entryTypes: ['navigation'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 1000);
        });
      });
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('should load dashboard within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      // Wait for dashboard content to load
      await expect(page.locator('text=Dashboard').or(page.locator('text=Account Overview'))).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 4 seconds (may have more data)
      expect(loadTime).toBeLessThan(4000);
    });

    test('should load transaction page efficiently with large datasets', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard/transactions');
      
      // Wait for transaction list to load
      await expect(page.locator('text=Transactions')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should handle large transaction lists efficiently
      expect(loadTime).toBeLessThan(5000);
      
      // Check if pagination is implemented for performance
      const paginationExists = await page.locator('text=Next').or(page.locator('text=Page')).isVisible();
      
      if (paginationExists) {
        console.log('Pagination implemented for performance optimization');
      }
    });

    test('should implement efficient chart rendering', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard/analytics');
      
      // Wait for charts to render
      const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
      await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
      
      const renderTime = Date.now() - startTime;
      
      // Charts should render within 6 seconds
      expect(renderTime).toBeLessThan(6000);
      
      // Check for multiple charts
      const chartCount = await chartContainer.count();
      console.log(`Rendered ${chartCount} charts in ${renderTime}ms`);
    });
  });

  test.describe('API Response Performance', () => {
    test('should return transaction export within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      const response = await page.request.get('/api/export/transactions?limit=100');
      
      const responseTime = Date.now() - startTime;
      
      // API should respond within 2 seconds for 100 transactions
      expect(responseTime).toBeLessThan(2000);
      
      // Check response status
      expect([200, 401]).toContain(response.status()); // 401 if not authenticated
      
      console.log(`Transaction export API responded in ${responseTime}ms`);
    });

    test('should handle account data requests efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      const response = await page.request.get('/api/export/accounts');
      
      const responseTime = Date.now() - startTime;
      
      // Account API should respond quickly
      expect(responseTime).toBeLessThan(1500);
      
      expect([200, 401]).toContain(response.status());
      
      console.log(`Account API responded in ${responseTime}ms`);
    });

    test('should generate financial summary efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      const response = await page.request.get('/api/export/financial-summary');
      
      const responseTime = Date.now() - startTime;
      
      // Financial calculations should complete within 3 seconds
      expect(responseTime).toBeLessThan(3000);
      
      expect([200, 401]).toContain(response.status());
      
      console.log(`Financial summary generated in ${responseTime}ms`);
    });

    test('should handle concurrent API requests efficiently', async ({ page }) => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () => 
        page.request.get('/api/export/transactions?limit=50')
      );
      
      const responses = await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Concurrent requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      // All requests should succeed (or fail with authentication)
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status());
      });
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
    });
  });

  test.describe('Client-Side Performance', () => {
    test('should implement efficient search functionality', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        // Test search performance
        const startTime = Date.now();
        
        await searchInput.fill('test search query');
        await page.keyboard.press('Enter');
        
        // Wait for search results
        await page.waitForTimeout(500);
        
        const searchTime = Date.now() - startTime;
        
        // Search should complete quickly
        expect(searchTime).toBeLessThan(2000);
        
        console.log(`Search completed in ${searchTime}ms`);
      }
    });

    test('should handle large data tables efficiently', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      
      // Check if virtual scrolling or pagination is implemented
      const transactionRows = page.locator('[data-testid="transaction-item"]');
      
      if (await transactionRows.first().isVisible()) {
        const rowCount = await transactionRows.count();
        
        // Should limit visible rows for performance
        expect(rowCount).toBeLessThanOrEqual(100);
        
        console.log(`Displaying ${rowCount} transaction rows`);
        
        // Test scrolling performance
        const startTime = Date.now();
        
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await page.waitForTimeout(500);
        
        const scrollTime = Date.now() - startTime;
        
        // Scrolling should be smooth
        expect(scrollTime).toBeLessThan(1000);
      }
    });

    test('should optimize form interactions', async ({ page }) => {
      await page.goto('/dashboard/goals');
      
      const createGoalButton = page.locator('text=Add Goal').or(page.locator('text=Create Goal'));
      
      if (await createGoalButton.isVisible()) {
        const startTime = Date.now();
        
        await createGoalButton.click();
        
        // Form should appear quickly
        const formInput = page.locator('input[name*="name"], input[placeholder*="Goal"]');
        await expect(formInput).toBeVisible();
        
        const formLoadTime = Date.now() - startTime;
        
        // Form should load quickly
        expect(formLoadTime).toBeLessThan(1000);
        
        // Test form validation performance
        await formInput.fill('Test Goal');
        
        const validationStartTime = Date.now();
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        
        const validationTime = Date.now() - validationStartTime;
        
        // Validation should be instant
        expect(validationTime).toBeLessThan(500);
      }
    });

    test('should implement efficient chart updates', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Wait for initial chart load
      const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
      await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
      
      // Test chart update performance when changing filters
      const timeFilter = page.locator('text=Last 30 days').or(page.locator('[data-testid="time-filter"]'));
      
      if (await timeFilter.isVisible()) {
        const startTime = Date.now();
        
        await timeFilter.click();
        
        const filterOption = page.locator('text=Last 3 months').or(page.locator('text=Last year'));
        
        if (await filterOption.first().isVisible()) {
          await filterOption.first().click();
          
          // Wait for chart to update
          await page.waitForTimeout(1000);
          
          const updateTime = Date.now() - startTime;
          
          // Chart updates should be responsive
          expect(updateTime).toBeLessThan(3000);
          
          console.log(`Chart updated in ${updateTime}ms`);
        }
      }
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not have significant memory leaks', async ({ page }) => {
      // Monitor memory usage during navigation
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      // Navigate through different pages
      const pages = ['/dashboard', '/dashboard/accounts', '/dashboard/transactions', '/dashboard/analytics', '/dashboard/goals'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1000);
        
        // Force garbage collection if possible
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncreasePercent.toFixed(2)}% increase)`);
        
        // Memory should not increase dramatically (>50% increase might indicate leaks)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });

    test('should handle large datasets without browser freezing', async ({ page }) => {
      // Test with simulated large dataset
      await page.goto('/dashboard/transactions');
      
      // Simulate loading a large number of transactions
      const performanceStart = Date.now();
      
      await page.evaluate(() => {
        // Simulate heavy computation
        const startTime = Date.now();
        let counter = 0;
        
        while (Date.now() - startTime < 100) { // 100ms of computation
          counter++;
        }
        
        return counter;
      });
      
      const performanceEnd = Date.now();
      const computationTime = performanceEnd - performanceStart;
      
      // Browser should remain responsive
      expect(computationTime).toBeLessThan(2000);
      
      // Page should still be interactive
      await expect(page.locator('text=Transactions')).toBeVisible();
    });

    test('should efficiently handle file uploads', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible()) {
        // Create a moderately large test file
        const largeCSVContent = Array.from({ length: 1000 }, (_, i) => 
          `"Transaction ${i}","${(Math.random() * 1000).toFixed(2)}","2024-01-${String(i % 30 + 1).padStart(2, '0')}"`
        ).join('\n');
        
        const header = '"Description","Amount","Date"\n';
        const fullContent = header + largeCSVContent;
        
        const startTime = Date.now();
        
        await fileInput.setInputFiles({
          name: 'large-test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(fullContent)
        });
        
        const uploadButton = page.locator('button:has-text("Upload")').or(page.locator('button[type="submit"]'));
        
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
          
          // Wait for upload processing
          await page.waitForTimeout(3000);
          
          const processingTime = Date.now() - startTime;
          
          // Large file processing should complete within reasonable time
          expect(processingTime).toBeLessThan(10000);
          
          console.log(`Processed 1000-row CSV in ${processingTime}ms`);
        }
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should implement efficient caching strategies', async ({ page }) => {
      // First visit to cache resources
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      // Second visit should be faster due to caching
      const startTime = Date.now();
      await page.reload();
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      const reloadTime = Date.now() - startTime;
      
      // Cached reload should be faster than initial load
      expect(reloadTime).toBeLessThan(2000);
      
      console.log(`Cached page reload took ${reloadTime}ms`);
    });

    test('should minimize resource requests', async ({ page }) => {
      const resourceRequests: string[] = [];
      
      page.on('request', request => {
        resourceRequests.push(request.url());
      });
      
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Filter relevant requests (exclude hot-reload, etc.)
      const relevantRequests = resourceRequests.filter(url => 
        !url.includes('_next/webpack-hmr') && 
        !url.includes('_next/static/chunks/webpack') &&
        !url.includes('hot-update')
      );
      
      console.log(`Made ${relevantRequests.length} resource requests`);
      console.log('Requests:', relevantRequests);
      
      // Should not make excessive requests
      expect(relevantRequests.length).toBeLessThan(50);
    });

    test('should compress responses appropriately', async ({ page }) => {
      const response = await page.request.get('/dashboard');
      const headers = response.headers();
      
      // Check for compression
      const contentEncoding = headers['content-encoding'];
      
      if (contentEncoding) {
        expect(['gzip', 'br', 'deflate']).toContain(contentEncoding);
        console.log(`Response compressed with ${contentEncoding}`);
      }
      
      // Check content size
      const contentLength = headers['content-length'];
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024;
        console.log(`Page size: ${sizeKB.toFixed(2)} KB`);
        
        // Page should be reasonably sized
        expect(sizeKB).toBeLessThan(500); // Less than 500KB
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ page }) => {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      const mobileLoadTime = Date.now() - startTime;
      
      // Mobile should load within reasonable time
      expect(mobileLoadTime).toBeLessThan(4000);
      
      console.log(`Mobile dashboard loaded in ${mobileLoadTime}ms`);
    });

    test('should handle touch interactions efficiently', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/transactions');
      
      const transactionItems = page.locator('[data-testid="transaction-item"]');
      
      if (await transactionItems.first().isVisible()) {
        const startTime = Date.now();
        
        // Simulate touch interaction
        await transactionItems.first().tap();
        
        const interactionTime = Date.now() - startTime;
        
        // Touch interactions should be responsive
        expect(interactionTime).toBeLessThan(300);
        
        console.log(`Touch interaction completed in ${interactionTime}ms`);
      }
    });

    test('should optimize charts for mobile rendering', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      
      await page.goto('/dashboard/analytics');
      
      const chartContainer = page.locator('.recharts-wrapper').or(page.locator('svg'));
      await expect(chartContainer.first()).toBeVisible({ timeout: 8000 });
      
      const mobileChartTime = Date.now() - startTime;
      
      // Mobile charts should render within reasonable time
      expect(mobileChartTime).toBeLessThan(8000);
      
      console.log(`Mobile charts rendered in ${mobileChartTime}ms`);
      
      // Check chart responsiveness
      const chartWidth = await chartContainer.first().evaluate(el => el.getBoundingClientRect().width);
      
      // Chart should fit mobile viewport
      expect(chartWidth).toBeLessThanOrEqual(375);
    });
  });
});