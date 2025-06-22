import { POST } from '../integrations/webhooks/route';
import { 
  createMockRequest, 
  mockSupabaseClient, 
  mockAccounts,
  setupMockDatabase,
  resetMocks
} from './setup';

// Mock Node.js crypto module
const mockCrypto = {
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mocked-signature'),
    }),
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true),
};

jest.mock('crypto', () => mockCrypto);

describe('/api/integrations/webhooks', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
    
    // Setup environment variable
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  describe('Webhook Signature Verification', () => {
    it('should return 401 for missing signature', async () => {
      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: { external_id: 'txn-123' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid signature');
    });

    it('should return 401 for missing timestamp', async () => {
      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: { external_id: 'txn-123' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'sha256=test-signature',
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid signature');
    });

    it('should return 401 for expired timestamp', async () => {
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000); // 10 minutes ago

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: { external_id: 'txn-123' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'sha256=test-signature',
          'x-webhook-timestamp': oldTimestamp.toString(),
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid signature');
    });

    it('should return 401 for invalid signature', async () => {
      mockCrypto.timingSafeEqual.mockReturnValueOnce(false);

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: { external_id: 'txn-123' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'sha256=invalid-signature',
          'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid signature');
    });

    it('should allow requests in development when WEBHOOK_SECRET is not set', async () => {
      delete process.env.WEBHOOK_SECRET;
      
      const mockChain = setupMockDatabase();
      mockChain.select.mockResolvedValue({ data: null, error: null });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'account-1',
          amount: 100,
          currency: 'GBP',
          description: 'Test transaction',
          date: '2024-01-15',
          type: 'expense',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      // Should not return 401 (should proceed to process the webhook)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Transaction Created Event', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should create new transaction successfully', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock existing transaction check (no existing transaction)
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock account verification
      mockChain.select.mockResolvedValueOnce({ data: { id: 'account-1' }, error: null });
      
      // Mock transaction insert
      mockChain.insert.mockResolvedValueOnce({ error: null });
      
      // Mock balance calculation
      mockChain.select.mockResolvedValueOnce({
        data: [
          { amount: 100, type: 'income' },
          { amount: -50, type: 'expense' },
        ],
        error: null,
      });
      
      // Mock balance update
      mockChain.update.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'account-1',
          amount: -25.99,
          currency: 'GBP',
          description: 'Test Purchase',
          category: 'Shopping',
          date: '2024-01-15',
          type: 'expense',
          merchant: 'Test Store',
          location: 'London, UK',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('Transaction created successfully');
      
      // Verify transaction insert was called
      expect(mockChain.insert).toHaveBeenCalledWith({
        external_id: 'txn-123',
        account_id: 'account-1',
        amount: -25.99,
        currency: 'GBP',
        description: 'Test Purchase',
        category: 'Shopping',
        date: '2024-01-15',
        type: 'expense',
        merchant: 'Test Store',
        location: 'London, UK',
        is_recurring: false,
      });
    });

    it('should handle duplicate transactions', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock existing transaction found
      mockChain.select.mockResolvedValueOnce({
        data: { id: 'existing-txn' },
        error: null,
      });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'account-1',
          amount: 100,
          currency: 'GBP',
          description: 'Duplicate transaction',
          date: '2024-01-15',
          type: 'expense',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Transaction already exists');
    });

    it('should return 404 for unauthorized account', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock no existing transaction
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock account not found or unauthorized
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'unauthorized-account',
          amount: 100,
          currency: 'GBP',
          description: 'Test transaction',
          date: '2024-01-15',
          type: 'expense',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Account not found or unauthorized');
    });

    it('should default category to "Other" when missing', async () => {
      const mockChain = setupMockDatabase();
      
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });
      mockChain.select.mockResolvedValueOnce({ data: { id: 'account-1' }, error: null });
      mockChain.insert.mockResolvedValueOnce({ error: null });
      mockChain.select.mockResolvedValueOnce({ data: [], error: null });
      mockChain.update.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'account-1',
          amount: 100,
          currency: 'GBP',
          description: 'Test transaction',
          date: '2024-01-15',
          type: 'expense',
          // category is missing
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Other',
        })
      );
    });
  });

  describe('Account Updated Event', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should update account balance successfully', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock account verification
      mockChain.select.mockResolvedValueOnce({ data: { id: 'account-1' }, error: null });
      
      // Mock account update
      mockChain.update.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'account.updated',
        user_id: 'test-user-123',
        payload: {
          account_id: 'account-1',
          balance: 1500.75,
          last_updated: '2024-01-15T12:00:00Z',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Account updated successfully');
      
      expect(mockChain.update).toHaveBeenCalledWith({
        balance: 1500.75,
        last_updated: '2024-01-15T12:00:00Z',
      });
    });

    it('should return 404 for unauthorized account', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock account not found
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });

      const webhookData = {
        event_type: 'account.updated',
        user_id: 'test-user-123',
        payload: {
          account_id: 'unauthorized-account',
          balance: 1500.75,
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Account not found or unauthorized');
    });
  });

  describe('Bank Connection Status Event', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should update connection status successfully', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock connection status update
      mockChain.update.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'bank.connection.status',
        user_id: 'test-user-123',
        payload: {
          connection_id: 'conn-123',
          status: 'active',
          last_sync: '2024-01-15T12:00:00Z',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Connection status updated successfully');
    });

    it('should update related accounts when connection fails', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock connection status update
      mockChain.update.mockResolvedValueOnce({ error: null });
      
      // Mock accounts update for failed connection
      mockChain.update.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'bank.connection.status',
        user_id: 'test-user-123',
        payload: {
          connection_id: 'conn-123',
          status: 'failed',
          error_message: 'Authentication failed',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Should have updated accounts to set api_connected: false
      expect(mockChain.update).toHaveBeenCalledWith({ api_connected: false });
    });
  });

  describe('Alert Triggered Event', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should create alert successfully', async () => {
      const mockChain = setupMockDatabase();
      
      // Mock alert insert
      mockChain.insert.mockResolvedValueOnce({ error: null });

      const webhookData = {
        event_type: 'alert.triggered',
        user_id: 'test-user-123',
        payload: {
          alert_type: 'low_balance',
          title: 'Low Balance Alert',
          message: 'Your account balance is below the threshold',
          threshold_value: 100,
          trigger_data: { account_id: 'account-1', current_balance: 50 },
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('Alert created successfully');
      
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          type: 'low_balance',
          title: 'Low Balance Alert',
          message: 'Your account balance is below the threshold',
          threshold_value: 100,
          is_active: true,
          is_read: false,
          trigger_data: { account_id: 'account-1', current_balance: 50 },
        })
      );
    });
  });

  describe('Unknown Event Types', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should handle unknown event types gracefully', async () => {
      const webhookData = {
        event_type: 'unknown.event',
        user_id: 'test-user-123',
        payload: { some: 'data' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Event received but not processed');
    });
  });

  describe('Database Errors', () => {
    const validHeaders = {
      'x-webhook-signature': 'sha256=valid-signature',
      'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    it('should handle transaction insert errors', async () => {
      const mockChain = setupMockDatabase();
      
      mockChain.select.mockResolvedValueOnce({ data: null, error: null });
      mockChain.select.mockResolvedValueOnce({ data: { id: 'account-1' }, error: null });
      
      // Mock transaction insert error
      mockChain.insert.mockResolvedValueOnce({
        error: { message: 'Database error' },
      });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: {
          external_id: 'txn-123',
          account_id: 'account-1',
          amount: 100,
          currency: 'GBP',
          description: 'Test transaction',
          date: '2024-01-15',
          type: 'expense',
        },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: validHeaders,
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create transaction');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3001/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'sha256=valid-signature',
          'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock Supabase client to throw an error
      const mockFrom = mockSupabaseClient.from as jest.Mock;
      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const webhookData = {
        event_type: 'transaction.created',
        user_id: 'test-user-123',
        payload: { external_id: 'txn-123' },
      };

      const request = createMockRequest('/api/integrations/webhooks', {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'sha256=valid-signature',
          'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        },
        body: webhookData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});