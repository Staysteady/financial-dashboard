import { GET } from '../export/accounts/route';
import { 
  createMockRequest, 
  mockSupabaseClient, 
  mockAccounts, 
  setupMockAuth, 
  setupMockAuthFailure,
  setupMockDatabase,
  resetMocks
} from './setup';

describe('/api/export/accounts', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      setupMockAuthFailure();
      
      const request = createMockRequest('/api/export/accounts');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      setupMockAuth();
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle default parameters (JSON format)', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts');
      
      const jsonContent = await response.json();
      expect(jsonContent).toHaveProperty('accounts');
    });

    it('should handle CSV format request', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
    });

    it('should handle includeTransactionCounts parameter', async () => {
      const mockChain = setupMockDatabase();
      
      // First call for accounts
      mockChain.select.mockResolvedValueOnce({
        data: mockAccounts,
        error: null,
      });

      // Mock transaction count queries
      mockChain.select.mockResolvedValue({
        count: 5,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { includeTransactionCounts: 'true' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      // Should have called from('transactions') for each account
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
    });

    it('should return 400 for unsupported format', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'xml' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Unsupported format');
    });
  });

  describe('CSV Export', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should generate proper CSV format', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      const csvContent = await response.text();
      
      const lines = csvContent.split('\n');
      expect(lines[0]).toBe(
        'ID,Institution,Account Name,Account Type,Balance,Currency,Status,API Connected,Transaction Count,Last Updated,Created Date'
      );
      
      // Check first account row
      expect(lines[1]).toContain('account-1');
      expect(lines[1]).toContain('"Test Bank"');
      expect(lines[1]).toContain('"Current Account"');
      expect(lines[1]).toContain('current');
      expect(lines[1]).toContain('1500.5');
      expect(lines[1]).toContain('GBP');
      expect(lines[1]).toContain('Active');
      expect(lines[1]).toContain('Yes');
      
      // Check second account row
      expect(lines[2]).toContain('account-2');
      expect(lines[2]).toContain('"Savings Account"');
      expect(lines[2]).toContain('savings');
      expect(lines[2]).toContain('5000');
      expect(lines[2]).toContain('No'); // API not connected
    });

    it('should include transaction counts in CSV when requested', async () => {
      const mockChain = setupMockDatabase();
      
      // First call for accounts
      mockChain.select.mockResolvedValueOnce({
        data: mockAccounts,
        error: null,
      });

      // Mock transaction count queries - return different counts for each account
      mockChain.select
        .mockResolvedValueOnce({ count: 15, error: null })
        .mockResolvedValueOnce({ count: 8, error: null });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { 
          format: 'csv',
          includeTransactionCounts: 'true'
        },
      });
      
      const response = await GET(request);
      const csvContent = await response.text();
      
      expect(csvContent).toContain('15'); // First account transaction count
      expect(csvContent).toContain('8');  // Second account transaction count
    });

    it('should handle empty accounts list', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      const csvContent = await response.text();
      
      const lines = csvContent.split('\n');
      expect(lines).toHaveLength(1); // Only header
    });
  });

  describe('JSON Export', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should generate proper JSON format', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent).toHaveProperty('exportDate');
      expect(jsonContent).toHaveProperty('summary');
      expect(jsonContent).toHaveProperty('accounts');
      
      // Check summary calculations
      expect(jsonContent.summary.totalAccounts).toBe(2);
      expect(jsonContent.summary.activeAccounts).toBe(2);
      expect(jsonContent.summary.connectedAccounts).toBe(1);
      expect(jsonContent.summary.totalBalance).toBe(6500.5);
      expect(jsonContent.summary.currencies).toEqual(['GBP']);
      
      // Check account details
      expect(jsonContent.accounts).toHaveLength(2);
      expect(jsonContent.accounts[0]).toHaveProperty('id', 'account-1');
      expect(jsonContent.accounts[0]).toHaveProperty('institution', 'Test Bank');
      expect(jsonContent.accounts[0]).toHaveProperty('accountName', 'Current Account');
      expect(jsonContent.accounts[0]).toHaveProperty('accountType', 'current');
      expect(jsonContent.accounts[0]).toHaveProperty('balance', 1500.5);
      expect(jsonContent.accounts[0]).toHaveProperty('currency', 'GBP');
      expect(jsonContent.accounts[0]).toHaveProperty('isActive', true);
      expect(jsonContent.accounts[0]).toHaveProperty('apiConnected', true);
    });

    it('should include transaction counts in JSON when requested', async () => {
      const mockChain = setupMockDatabase();
      
      // First call for accounts
      mockChain.select.mockResolvedValueOnce({
        data: mockAccounts,
        error: null,
      });

      // Mock transaction count queries
      mockChain.select
        .mockResolvedValueOnce({ count: 20, error: null })
        .mockResolvedValueOnce({ count: 10, error: null });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { 
          format: 'json',
          includeTransactionCounts: 'true'
        },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.accounts[0]).toHaveProperty('transactionCount', 20);
      expect(jsonContent.accounts[1]).toHaveProperty('transactionCount', 10);
    });

    it('should handle mixed currency accounts', async () => {
      const mixedAccounts = [
        { ...mockAccounts[0], currency: 'GBP', balance: 1000 },
        { ...mockAccounts[1], currency: 'USD', balance: 500 },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mixedAccounts,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.summary.currencies).toEqual(['GBP', 'USD']);
      expect(jsonContent.summary.totalBalance).toBe(1500);
    });

    it('should handle inactive accounts', async () => {
      const accountsWithInactive = [
        { ...mockAccounts[0], is_active: true },
        { ...mockAccounts[1], is_active: false },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: accountsWithInactive,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.summary.totalAccounts).toBe(2);
      expect(jsonContent.summary.activeAccounts).toBe(1);
    });
  });

  describe('Database Errors', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle database query errors', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = createMockRequest('/api/export/accounts');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch accounts');
    });

    it('should handle transaction count query errors gracefully', async () => {
      const mockChain = setupMockDatabase();
      
      // First call for accounts succeeds
      mockChain.select.mockResolvedValueOnce({
        data: mockAccounts,
        error: null,
      });

      // Transaction count queries fail
      mockChain.select.mockResolvedValue({
        count: null,
        error: { message: 'Count query failed' },
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { includeTransactionCounts: 'true' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const jsonContent = await response.json();
      
      // Should default to 0 when count fails
      expect(jsonContent.accounts[0]).toHaveProperty('transactionCount', 0);
      expect(jsonContent.accounts[1]).toHaveProperty('transactionCount', 0);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle accounts with null/empty fields', async () => {
      const accountsWithNulls = [
        {
          ...mockAccounts[0],
          account_name: null,
          institution_name: null,
          last_updated: null,
        },
      ];

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: accountsWithNulls,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const csvContent = await response.text();
      
      // Should handle null values gracefully
      expect(csvContent).toContain('""'); // Empty quoted strings for null values
    });

    it('should handle very large account lists', async () => {
      // Create 100 mock accounts
      const largeAccountList = Array.from({ length: 100 }, (_, i) => ({
        ...mockAccounts[0],
        id: `account-${i}`,
        account_name: `Account ${i}`,
        balance: Math.random() * 10000,
      }));

      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: largeAccountList,
        error: null,
      });

      const request = createMockRequest('/api/export/accounts', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const jsonContent = await response.json();
      
      expect(jsonContent.summary.totalAccounts).toBe(100);
      expect(jsonContent.accounts).toHaveLength(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      (mockSupabaseClient.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createMockRequest('/api/export/accounts');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});