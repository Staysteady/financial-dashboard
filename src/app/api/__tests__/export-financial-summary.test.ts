import { GET } from '../export/financial-summary/route';
import { 
  createMockRequest, 
  mockSupabaseClient, 
  mockAccounts,
  mockTransactions,
  mockGoals,
  mockBudgets,
  setupMockAuth, 
  setupMockAuthFailure,
  setupMockDatabase,
  resetMocks
} from './setup';

describe('/api/export/financial-summary', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      setupMockAuthFailure();
      
      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      setupMockAuth();
      const mockChain = setupMockDatabase();
      
      // Mock all required database calls
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null }); // For monthly trends

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Period Parameters', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    const setupSuccessfulMocks = () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null }); // For monthly trends
      return mockChain;
    };

    it('should handle default period (current_month)', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Current Month');
      expect(jsonContent.period.startDate).toBeDefined();
      expect(jsonContent.period.endDate).toBeDefined();
    });

    it('should handle last_month period', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { period: 'last_month' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Last Month');
    });

    it('should handle last_3_months period', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { period: 'last_3_months' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Last 3 Months');
    });

    it('should handle last_6_months period', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { period: 'last_6_months' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Last 6 Months');
    });

    it('should handle last_year period', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { period: 'last_year' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Last Year');
    });

    it('should default to current_month for invalid period', async () => {
      setupSuccessfulMocks();

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { period: 'invalid_period' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.period.label).toBe('Current Month');
    });
  });

  describe('Basic Export Content', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should include all required sections in export', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null }); // For monthly trends

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const jsonContent = await response.json();
      
      expect(jsonContent).toHaveProperty('exportDate');
      expect(jsonContent).toHaveProperty('period');
      expect(jsonContent).toHaveProperty('summary');
      expect(jsonContent).toHaveProperty('accounts');
      expect(jsonContent).toHaveProperty('transactions');
      expect(jsonContent).toHaveProperty('spendingByCategory');
      expect(jsonContent).toHaveProperty('monthlyTrends');
    });

    it('should calculate financial metrics correctly', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const summary = jsonContent.summary;
      
      expect(summary.totalBalance).toBe(6500.5); // Sum of mock account balances
      expect(summary.totalAccounts).toBe(2);
      expect(summary.activeAccounts).toBe(2);
      expect(summary.connectedAccounts).toBe(1);
      expect(summary.totalIncome).toBe(2500); // From salary transaction
      expect(summary.totalExpenses).toBe(-25.99); // From Tesco transaction (negative)
      expect(summary.netFlow).toBe(2525.99); // Income - expenses
      expect(summary.transactionCount).toBe(2);
      expect(summary.averageTransactionAmount).toBeCloseTo(1262.995); // Average of absolute amounts
    });

    it('should generate spending by category breakdown', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const spendingByCategory = jsonContent.spendingByCategory;
      
      expect(spendingByCategory).toHaveLength(1); // Only expense transactions
      expect(spendingByCategory[0]).toHaveProperty('category', 'Groceries');
      expect(spendingByCategory[0]).toHaveProperty('amount', -25.99);
      expect(spendingByCategory[0]).toHaveProperty('percentage', 100);
      expect(spendingByCategory[0]).toHaveProperty('transactionCount', 1);
    });

    it('should format accounts correctly', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const accounts = jsonContent.accounts;
      
      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toHaveProperty('id', 'account-1');
      expect(accounts[0]).toHaveProperty('institution', 'Test Bank');
      expect(accounts[0]).toHaveProperty('accountName', 'Current Account');
      expect(accounts[0]).toHaveProperty('accountType', 'current');
      expect(accounts[0]).toHaveProperty('balance', 1500.5);
      expect(accounts[0]).toHaveProperty('currency', 'GBP');
      expect(accounts[0]).toHaveProperty('isActive', true);
    });

    it('should format transactions correctly', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValue({ data: [], error: null });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const transactions = jsonContent.transactions;
      
      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toHaveProperty('id', 'txn-1');
      expect(transactions[0]).toHaveProperty('date', '2024-01-15');
      expect(transactions[0]).toHaveProperty('description', 'Tesco Express');
      expect(transactions[0]).toHaveProperty('category', 'Groceries');
      expect(transactions[0]).toHaveProperty('amount', -25.99);
      expect(transactions[0]).toHaveProperty('currency', 'GBP');
      expect(transactions[0]).toHaveProperty('type', 'expense');
      expect(transactions[0]).toHaveProperty('merchant', 'Tesco');
    });
  });

  describe('Optional Content (Goals and Budgets)', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should include goals when requested', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // Monthly trends
        .mockResolvedValueOnce({ data: mockGoals, error: null }); // Goals

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { includeGoals: 'true' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent).toHaveProperty('goals');
      expect(jsonContent.goals).toHaveLength(1);
      expect(jsonContent.goals[0]).toHaveProperty('id', 'goal-1');
      expect(jsonContent.goals[0]).toHaveProperty('name', 'Emergency Fund');
      expect(jsonContent.goals[0]).toHaveProperty('targetAmount', 10000);
      expect(jsonContent.goals[0]).toHaveProperty('currentAmount', 5000);
      expect(jsonContent.goals[0]).toHaveProperty('progress', 50);
      expect(jsonContent.goals[0]).toHaveProperty('category', 'saving');
      expect(jsonContent.goals[0]).toHaveProperty('isAchieved', false);
    });

    it('should include budgets when requested', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // Monthly trends
        .mockResolvedValueOnce({ data: mockBudgets, error: null }); // Budgets

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { includeBudgets: 'true' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent).toHaveProperty('budgets');
      expect(jsonContent.budgets).toHaveLength(1);
      expect(jsonContent.budgets[0]).toHaveProperty('id', 'budget-1');
      expect(jsonContent.budgets[0]).toHaveProperty('categoryId', 'cat-groceries');
      expect(jsonContent.budgets[0]).toHaveProperty('amount', 300);
      expect(jsonContent.budgets[0]).toHaveProperty('period', 'monthly');
      expect(jsonContent.budgets[0]).toHaveProperty('isActive', true);
    });

    it('should include both goals and budgets when both requested', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // Monthly trends
        .mockResolvedValueOnce({ data: mockGoals, error: null }) // Goals
        .mockResolvedValueOnce({ data: mockBudgets, error: null }); // Budgets

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { 
          includeGoals: 'true',
          includeBudgets: 'true'
        },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent).toHaveProperty('goals');
      expect(jsonContent).toHaveProperty('budgets');
      expect(jsonContent.goals).toHaveLength(1);
      expect(jsonContent.budgets).toHaveLength(1);
    });

    it('should handle empty goals and budgets', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // Monthly trends
        .mockResolvedValueOnce({ data: null, error: null }) // Goals (null)
        .mockResolvedValueOnce({ data: [], error: null }); // Budgets (empty)

      const request = createMockRequest('/api/export/financial-summary', {
        searchParams: { 
          includeGoals: 'true',
          includeBudgets: 'true'
        },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.goals).toEqual([]);
      expect(jsonContent.budgets).toEqual([]);
    });
  });

  describe('Monthly Trends', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should generate monthly trends for last 6 months', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock main data calls
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null });

      // Mock monthly trend queries (6 calls for 6 months)
      const monthlyData = [
        { data: [{ amount: 100, type: 'income' }, { amount: -50, type: 'expense' }], error: null },
        { data: [{ amount: 200, type: 'income' }, { amount: -75, type: 'expense' }], error: null },
        { data: [{ amount: 150, type: 'income' }, { amount: -60, type: 'expense' }], error: null },
        { data: [{ amount: 180, type: 'income' }, { amount: -80, type: 'expense' }], error: null },
        { data: [{ amount: 220, type: 'income' }, { amount: -90, type: 'expense' }], error: null },
        { data: [{ amount: 250, type: 'income' }, { amount: -100, type: 'expense' }], error: null },
      ];

      monthlyData.forEach(data => {
        mockChain.select.mockResolvedValueOnce(data);
      });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const trends = jsonContent.monthlyTrends;
      
      expect(trends).toHaveLength(6);
      expect(trends[0]).toHaveProperty('month');
      expect(trends[0]).toHaveProperty('income');
      expect(trends[0]).toHaveProperty('expenses');
      expect(trends[0]).toHaveProperty('netFlow');
      expect(trends[0]).toHaveProperty('transactionCount');
      
      // Check calculations for first trend
      expect(trends[0].income).toBe(100);
      expect(trends[0].expenses).toBe(-50);
      expect(trends[0].netFlow).toBe(150);
      expect(trends[0].transactionCount).toBe(2);
    });

    it('should handle months with no transactions', async () => {
      const mockChain = setupMockDatabase();
      
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({ data: mockTransactions, error: null });

      // Mock monthly trends with some empty months
      for (let i = 0; i < 6; i++) {
        if (i === 2) {
          // Empty month
          mockChain.select.mockResolvedValueOnce({ data: [], error: null });
        } else {
          mockChain.select.mockResolvedValueOnce({
            data: [{ amount: 100, type: 'income' }],
            error: null
          });
        }
      }

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      const trends = jsonContent.monthlyTrends;
      
      expect(trends).toHaveLength(6);
      // Check that empty month has zero values
      expect(trends[2].income).toBe(0);
      expect(trends[2].expenses).toBe(0);
      expect(trends[2].netFlow).toBe(0);
      expect(trends[2].transactionCount).toBe(0);
    });
  });

  describe('Database Errors', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle accounts query error', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Accounts query failed' },
      });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch accounts');
    });

    it('should handle transactions query error', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: mockAccounts, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Transactions query failed' },
        });

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch transactions');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle empty accounts and transactions', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: [], error: null }) // Empty accounts
        .mockResolvedValueOnce({ data: [], error: null }); // Empty transactions

      // Mock empty monthly trends
      for (let i = 0; i < 6; i++) {
        mockChain.select.mockResolvedValueOnce({ data: [], error: null });
      }

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const jsonContent = await response.json();
      
      expect(jsonContent.summary.totalBalance).toBe(0);
      expect(jsonContent.summary.totalAccounts).toBe(0);
      expect(jsonContent.summary.totalIncome).toBe(0);
      expect(jsonContent.summary.totalExpenses).toBe(0);
      expect(jsonContent.summary.transactionCount).toBe(0);
      expect(jsonContent.accounts).toEqual([]);
      expect(jsonContent.transactions).toEqual([]);
      expect(jsonContent.spendingByCategory).toEqual([]);
    });

    it('should handle accounts with zero balances', async () => {
      const zeroBalanceAccounts = mockAccounts.map(acc => ({
        ...acc,
        balance: 0,
      }));

      const mockChain = setupMockDatabase();
      mockChain.select
        .mockResolvedValueOnce({ data: zeroBalanceAccounts, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      // Mock empty monthly trends
      for (let i = 0; i < 6; i++) {
        mockChain.select.mockResolvedValueOnce({ data: [], error: null });
      }

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      const jsonContent = await response.json();
      expect(jsonContent.summary.totalBalance).toBe(0);
      expect(jsonContent.summary.burnRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      (mockSupabaseClient.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createMockRequest('/api/export/financial-summary');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});