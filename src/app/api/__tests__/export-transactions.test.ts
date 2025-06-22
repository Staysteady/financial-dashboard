import { GET } from '../export/transactions/route';
import { 
  createMockRequest, 
  mockSupabaseClient, 
  mockTransactions, 
  setupMockAuth, 
  setupMockAuthFailure,
  setupMockDatabase,
  resetMocks
} from './setup';

describe('/api/export/transactions', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      setupMockAuthFailure();
      
      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      setupMockAuth();
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).not.toBe(401);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should handle default parameters', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
    });

    it('should handle date range filters', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockChain.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockChain.lte).toHaveBeenCalledWith('date', '2024-01-31');
    });

    it('should handle account ID filters', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: {
          accountIds: 'account-1,account-2',
        },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockChain.in).toHaveBeenCalledWith('account_id', ['account-1', 'account-2']);
    });

    it('should handle category filters', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: {
          categories: 'Groceries,Transport',
        },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockChain.in).toHaveBeenCalledWith('category', ['Groceries', 'Transport']);
    });
  });

  describe('Export Formats', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should export as CSV by default', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('transactions_');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');
    });

    it('should export as CSV when explicitly requested', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      
      const csvContent = await response.text();
      expect(csvContent).toContain('Date,Account,Institution,Description,Category,Amount');
      expect(csvContent).toContain('Tesco Express');
      expect(csvContent).toContain('Salary Payment');
    });

    it('should export as JSON when requested', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('.json');
      
      const jsonContent = await response.json();
      expect(jsonContent).toHaveProperty('exportDate');
      expect(jsonContent).toHaveProperty('totalTransactions', 2);
      expect(jsonContent).toHaveProperty('transactions');
      expect(jsonContent.transactions).toHaveLength(2);
      expect(jsonContent.transactions[0]).toHaveProperty('id', 'txn-1');
      expect(jsonContent.transactions[0]).toHaveProperty('description', 'Tesco Express');
    });

    it('should return 400 for unsupported format', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'xml' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Unsupported format');
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

      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch transactions');
    });
  });

  describe('CSV Export Content', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should properly format CSV content', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      const csvContent = await response.text();
      
      const lines = csvContent.split('\n');
      expect(lines[0]).toBe('Date,Account,Institution,Description,Category,Amount,Currency,Type,Merchant,Location');
      expect(lines[1]).toContain('2024-01-15');
      expect(lines[1]).toContain('"Current Account"');
      expect(lines[1]).toContain('"Test Bank"');
      expect(lines[1]).toContain('"Tesco Express"');
      expect(lines[1]).toContain('"Groceries"');
      expect(lines[1]).toContain('-25.99');
      expect(lines[1]).toContain('GBP');
      expect(lines[1]).toContain('expense');
    });

    it('should handle empty transaction list', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'csv' },
      });
      
      const response = await GET(request);
      const csvContent = await response.text();
      
      const lines = csvContent.split('\n');
      expect(lines).toHaveLength(1); // Only header
      expect(lines[0]).toBe('Date,Account,Institution,Description,Category,Amount,Currency,Type,Merchant,Location');
    });
  });

  describe('JSON Export Content', () => {
    beforeEach(() => {
      setupMockAuth();
    });

    it('should properly format JSON content', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.exportDate).toBeDefined();
      expect(jsonContent.totalTransactions).toBe(2);
      expect(jsonContent.transactions).toHaveLength(2);
      
      const transaction = jsonContent.transactions[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('account');
      expect(transaction.account).toHaveProperty('id');
      expect(transaction.account).toHaveProperty('name');
      expect(transaction.account).toHaveProperty('institution');
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('category');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('currency');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('merchant');
      expect(transaction).toHaveProperty('isRecurring');
      expect(transaction).toHaveProperty('createdAt');
    });

    it('should handle empty transaction list in JSON', async () => {
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest('/api/export/transactions', {
        searchParams: { format: 'json' },
      });
      
      const response = await GET(request);
      const jsonContent = await response.json();
      
      expect(jsonContent.totalTransactions).toBe(0);
      expect(jsonContent.transactions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock a situation where Supabase client throws an error
      (mockSupabaseClient.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createMockRequest('/api/export/transactions');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});