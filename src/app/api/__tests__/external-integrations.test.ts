import { GET, POST } from '../integrations/external/route';
import { 
  createMockRequest, 
  mockSupabaseClient, 
  mockAccounts,
  mockTransactions,
  mockGoals,
  setupMockDatabase,
  resetMocks
} from './setup';

describe('/api/integrations/external', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('API Key Authentication', () => {
    it('should return 401 for missing API key', async () => {
      const request = createMockRequest('/api/integrations/external', {
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid API key');
    });

    it('should return 401 for invalid API key', async () => {
      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'invalid-key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid API key');
    });

    it('should allow demo API keys', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({ data: [], error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });

    it('should return 404 for user not found', async () => {
      // Mock environment with valid API key but user lookup fails
      process.env.VALID_API_KEYS = 'valid-api-key';
      
      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'valid-api-key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
      
      delete process.env.VALID_API_KEYS;
    });
  });

  describe('GET - Portfolio Integration', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should return portfolio data successfully', async () => {
      const investmentAccounts = [
        {
          ...mockAccounts[0],
          account_type: 'investment',
          balance: 10000.50,
        },
        {
          ...mockAccounts[1],
          account_type: 'investment',
          balance: 15000.75,
        },
      ];

      const investmentGoals = [
        {
          ...mockGoals[0],
          category: 'investment',
          name: 'Retirement Fund',
          target_amount: 100000,
          current_amount: 25000,
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: investmentAccounts, error: null })
        .mockResolvedValueOnce({ data: investmentGoals, error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toHaveProperty('userId', 'demo-user-id');
      expect(body).toHaveProperty('totalValue', 25001.25);
      expect(body).toHaveProperty('accounts');
      expect(body).toHaveProperty('goals');
      expect(body).toHaveProperty('lastUpdated');
      
      expect(body.accounts).toHaveLength(2);
      expect(body.accounts[0]).toHaveProperty('id');
      expect(body.accounts[0]).toHaveProperty('name');
      expect(body.accounts[0]).toHaveProperty('institution');
      expect(body.accounts[0]).toHaveProperty('value');
      expect(body.accounts[0]).toHaveProperty('currency');
      
      expect(body.goals).toHaveLength(1);
      expect(body.goals[0]).toHaveProperty('name', 'Retirement Fund');
      expect(body.goals[0]).toHaveProperty('progress', 25);
    });

    it('should handle empty portfolio data', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.totalValue).toBe(0);
      expect(body.accounts).toEqual([]);
      expect(body.goals).toEqual([]);
    });
  });

  describe('GET - Spending Insights Integration', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should return spending insights successfully', async () => {
      const expenseTransactions = [
        {
          ...mockTransactions[0],
          type: 'expense',
          amount: -100,
          category: 'Groceries',
        },
        {
          ...mockTransactions[0],
          id: 'txn-2',
          type: 'expense',
          amount: -50,
          category: 'Transport',
        },
        {
          ...mockTransactions[0],
          id: 'txn-3',
          type: 'expense',
          amount: -200,
          category: 'Groceries',
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: expenseTransactions,
        error: null,
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'spending-insights' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toHaveProperty('userId', 'demo-user-id');
      expect(body).toHaveProperty('totalSpending', -350);
      expect(body).toHaveProperty('categoryBreakdown');
      expect(body).toHaveProperty('insights');
      expect(body).toHaveProperty('transactionCount', 3);
      
      expect(body.categoryBreakdown).toHaveLength(2);
      expect(body.categoryBreakdown[0]).toEqual({
        category: 'Groceries',
        amount: -300,
        percentage: 85.71428571428571,
      });
      expect(body.categoryBreakdown[1]).toEqual({
        category: 'Transport',
        amount: -50,
        percentage: 14.285714285714286,
      });
      
      // Should include insights about high category spending
      expect(body.insights).toContainEqual({
        type: 'high_category_spending',
        message: 'Groceries accounts for 85.7% of your spending',
        severity: 'medium',
      });
    });

    it('should handle no transactions', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({ data: null, error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'spending-insights' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.insights).toEqual([]);
      expect(body.categoryBreakdown).toEqual([]);
      expect(body.monthlyTrends).toEqual([]);
    });

    it('should generate insights for large transactions', async () => {
      const transactions = [
        {
          ...mockTransactions[0],
          type: 'expense',
          amount: -100,
          category: 'Groceries',
        },
        {
          ...mockTransactions[0],
          id: 'txn-2',
          type: 'expense',
          amount: -500, // Large transaction (5x average)
          category: 'Electronics',
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: transactions,
        error: null,
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'spending-insights' },
      });

      const response = await GET(request);
      
      const body = await response.json();
      
      expect(body.insights).toContainEqual({
        type: 'large_transactions',
        message: 'You have 1 transactions significantly above average',
        severity: 'low',
      });
    });
  });

  describe('GET - Financial Health Integration', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should calculate financial health score correctly', async () => {
      const healthAccounts = [
        {
          ...mockAccounts[0],
          account_type: 'current',
          balance: 5000,
        },
        {
          ...mockAccounts[1],
          account_type: 'credit',
          balance: -1000, // Credit card debt
        },
      ];

      const healthTransactions = [
        {
          ...mockTransactions[0],
          type: 'income',
          amount: 3000,
        },
        {
          ...mockTransactions[1],
          type: 'expense',
          amount: -2000,
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: healthAccounts, error: null })
        .mockResolvedValueOnce({ data: healthTransactions, error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'financial-health' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toHaveProperty('userId', 'demo-user-id');
      expect(body).toHaveProperty('healthScore');
      expect(body).toHaveProperty('metrics');
      expect(body).toHaveProperty('recommendations');
      
      const metrics = body.metrics;
      expect(metrics.totalBalance).toBe(4000);
      expect(metrics.monthlyIncome).toBe(3000);
      expect(metrics.monthlyExpenses).toBe(-2000);
      expect(metrics.savingsRate).toBeCloseTo(33.33);
      expect(metrics.creditUtilization).toBe(25); // 1000/4000 * 100
      expect(metrics.emergencyFundMonths).toBe(2); // 4000/2000
      
      expect(body.healthScore).toBeGreaterThan(0);
      expect(body.healthScore).toBeLessThanOrEqual(100);
    });

    it('should provide relevant recommendations', async () => {
      const lowSavingsAccounts = [
        {
          ...mockAccounts[0],
          balance: 500,
        },
      ];

      const lowSavingsTransactions = [
        {
          ...mockTransactions[0],
          type: 'income',
          amount: 2000,
        },
        {
          ...mockTransactions[1],
          type: 'expense',
          amount: -1900, // Very low savings rate
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: lowSavingsAccounts, error: null })
        .mockResolvedValueOnce({ data: lowSavingsTransactions, error: null });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'financial-health' },
      });

      const response = await GET(request);
      
      const body = await response.json();
      
      expect(body.recommendations).toContainEqual({
        type: 'increase_savings',
        message: 'Consider increasing your savings rate to at least 10% of income',
        priority: 'high',
      });
      
      expect(body.recommendations).toContainEqual({
        type: 'build_emergency_fund',
        message: 'Build an emergency fund covering 3-6 months of expenses',
        priority: 'medium',
      });
    });
  });

  describe('GET - Transaction Data Integration', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should return paginated transaction data', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { 
          integration: 'transactions',
          limit: '10',
          offset: '0',
        },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toHaveProperty('userId', 'demo-user-id');
      expect(body).toHaveProperty('transactions');
      expect(body).toHaveProperty('pagination');
      
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(0);
      expect(body.pagination.hasMore).toBe(false); // Less than limit
      
      expect(body.transactions).toHaveLength(2);
      expect(body.transactions[0]).toHaveProperty('id');
      expect(body.transactions[0]).toHaveProperty('date');
      expect(body.transactions[0]).toHaveProperty('description');
      expect(body.transactions[0]).toHaveProperty('account');
    });

    it('should handle filtering parameters', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: [mockTransactions[0]],
        error: null,
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { 
          integration: 'transactions',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          category: 'Groceries',
        },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      // Verify that filtering methods were called
      expect(mockChain.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockChain.lte).toHaveBeenCalledWith('date', '2024-01-31');
      expect(mockChain.eq).toHaveBeenCalledWith('category', 'Groceries');
    });
  });

  describe('GET - Unsupported Integration', () => {
    it('should return 400 for unsupported integration', async () => {
      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'unsupported' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Integration not supported');
    });
  });

  describe('POST - External Data Updates', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should handle external account update', async () => {
      const requestBody = {
        integration: 'external-accounts',
        action: 'update',
        data: {
          account_id: 'account-1',
          balance: 2000.00,
        },
      };

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        headers: { 'x-api-key': 'demo_test_key' },
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('External account update processed');
    });

    it('should handle investment data update', async () => {
      const requestBody = {
        integration: 'investment-data',
        action: 'sync',
        data: {
          portfolio_value: 50000,
          holdings: [
            { symbol: 'AAPL', shares: 10, value: 1500 },
            { symbol: 'GOOGL', shares: 5, value: 2500 },
          ],
        },
      };

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        headers: { 'x-api-key': 'demo_test_key' },
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Investment data update processed');
    });

    it('should handle budget sync', async () => {
      const requestBody = {
        integration: 'budget-sync',
        action: 'import',
        data: {
          budgets: [
            { category: 'Groceries', amount: 500, period: 'monthly' },
            { category: 'Transport', amount: 200, period: 'monthly' },
          ],
        },
      };

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        headers: { 'x-api-key': 'demo_test_key' },
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Budget sync processed');
    });

    it('should return 400 for unsupported POST integration', async () => {
      const requestBody = {
        integration: 'unsupported',
        action: 'test',
        data: {},
      };

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        headers: { 'x-api-key': 'demo_test_key' },
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Integration not supported');
    });

    it('should return 401 for missing API key in POST', async () => {
      const requestBody = {
        integration: 'external-accounts',
        action: 'update',
        data: {},
      };

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid API key');
    });
  });

  describe('Database Errors', () => {
    beforeEach(() => {
      setupMockDatabase();
    });

    it('should handle database errors in portfolio integration', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch portfolio data');
    });

    it('should handle database errors in spending insights', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'spending-insights' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch spending insights');
    });

    it('should handle database errors in financial health', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'financial-health' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to calculate financial health');
    });

    it('should handle database errors in transaction data', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'transactions' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch transaction data');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors in GET gracefully', async () => {
      // Mock Supabase to throw an error
      const mockFrom = mockSupabaseClient.from as jest.Mock;
      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest('/api/integrations/external', {
        headers: { 'x-api-key': 'demo_test_key' },
        searchParams: { integration: 'portfolio' },
      });

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors in POST gracefully', async () => {
      const requestBody = {
        integration: 'external-accounts',
        action: 'update',
        data: {},
      };

      // Mock to throw an error during processing
      const mockFrom = mockSupabaseClient.from as jest.Mock;
      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest('/api/integrations/external', {
        method: 'POST',
        headers: { 'x-api-key': 'demo_test_key' },
        body: requestBody,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should handle malformed JSON in POST', async () => {
      const request = new Request('http://localhost:3001/api/integrations/external', {
        method: 'POST',
        headers: {
          'x-api-key': 'demo_test_key',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});