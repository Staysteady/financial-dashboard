// Test setup for API integration tests
import { NextRequest } from 'next/server';

// Ensure polyfills are loaded
if (typeof globalThis.Request === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock Supabase client for testing
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  })),
};

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: () => mockSupabaseClient,
}));

// Helper function to create mock Next.js requests
export function createMockRequest(
  url: string, 
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options;
  
  const fullUrl = new URL(url, 'http://localhost:3001');
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const request = new NextRequest(fullUrl, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

// Mock user data for testing
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

// Mock account data
export const mockAccounts = [
  {
    id: 'account-1',
    user_id: 'test-user-123',
    institution_name: 'Test Bank',
    account_name: 'Current Account',
    account_type: 'current',
    balance: 1500.50,
    currency: 'GBP',
    is_active: true,
    api_connected: true,
    last_updated: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'account-2',
    user_id: 'test-user-123',
    institution_name: 'Test Bank',
    account_name: 'Savings Account',
    account_type: 'savings',
    balance: 5000.00,
    currency: 'GBP',
    is_active: true,
    api_connected: false,
    last_updated: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Mock transaction data
export const mockTransactions = [
  {
    id: 'txn-1',
    account_id: 'account-1',
    external_id: 'ext-txn-1',
    amount: -25.99,
    currency: 'GBP',
    description: 'Tesco Express',
    category: 'Groceries',
    subcategory: 'Food Shopping',
    date: '2024-01-15',
    type: 'expense',
    merchant: 'Tesco',
    location: 'London, UK',
    is_recurring: false,
    created_at: '2024-01-15T12:00:00Z',
    accounts: {
      id: 'account-1',
      account_name: 'Current Account',
      institution_name: 'Test Bank',
      user_id: 'test-user-123',
    },
  },
  {
    id: 'txn-2',
    account_id: 'account-1',
    external_id: 'ext-txn-2',
    amount: 2500.00,
    currency: 'GBP',
    description: 'Salary Payment',
    category: 'Income',
    subcategory: 'Salary',
    date: '2024-01-01',
    type: 'income',
    merchant: 'Employer Ltd',
    location: null,
    is_recurring: true,
    created_at: '2024-01-01T09:00:00Z',
    accounts: {
      id: 'account-1',
      account_name: 'Current Account',
      institution_name: 'Test Bank',
      user_id: 'test-user-123',
    },
  },
];

// Mock financial goals
export const mockGoals = [
  {
    id: 'goal-1',
    user_id: 'test-user-123',
    name: 'Emergency Fund',
    description: 'Build emergency fund',
    target_amount: 10000,
    current_amount: 5000,
    target_date: '2024-12-31',
    category: 'saving',
    is_achieved: false,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Mock budgets
export const mockBudgets = [
  {
    id: 'budget-1',
    user_id: 'test-user-123',
    category_id: 'cat-groceries',
    amount: 300,
    period: 'monthly',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Helper to setup successful auth
export function setupMockAuth() {
  (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
}

// Helper to setup failed auth
export function setupMockAuthFailure() {
  (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

// Helper to setup successful database queries
export function setupMockDatabase() {
  const mockFrom = mockSupabaseClient.from as jest.Mock;
  
  // Reset all mocks
  mockFrom.mockClear();
  
  // Setup default chain methods
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };

  mockFrom.mockReturnValue(mockChain);
  
  return mockChain;
}

// Helper to reset all mocks
export function resetMocks() {
  jest.clearAllMocks();
  setupMockAuth();
  setupMockDatabase();
}