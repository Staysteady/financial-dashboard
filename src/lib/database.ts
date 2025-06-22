import { createServerSupabaseClient } from './supabase';
import { 
  Account, 
  Transaction, 
  Category, 
  Budget, 
  FinancialGoal, 
  Alert,
  DashboardStats,
  ApiResponse,
  PaginatedResponse 
} from '@/types';

/**
 * Database utility functions for the financial dashboard
 */

// Account operations
export async function getAccounts(userId: string): Promise<ApiResponse<Account[]>> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data || [],
      success: true,
    };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return {
      data: [],
      success: false,
      error: 'Failed to fetch accounts',
    };
  }
}

export async function createAccount(userId: string, accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Account>> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...accountData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error('Error creating account:', error);
    return {
      data: {} as Account,
      success: false,
      error: 'Failed to create account',
    };
  }
}

// Transaction operations
export async function getTransactions(
  userId: string, 
  page: number = 1, 
  limit: number = 50,
  accountId?: string,
  categoryId?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('transactions')
      .select(`
        *,
        account:accounts!inner(user_id),
        category:categories(name, color)
      `)
      .eq('account.user_id', userId);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const offset = (page - 1) * limit;
    
    const { data, error, count } = await query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > offset + limit,
      },
      success: true,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      data: {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      },
      success: false,
      error: 'Failed to fetch transactions',
    };
  }
}

export async function createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Transaction>> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Verify the account belongs to the user
    const { data: account } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', transactionData.account_id)
      .eq('user_id', userId)
      .single();

    if (!account) {
      throw new Error('Account not found or access denied');
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      data: {} as Transaction,
      success: false,
      error: 'Failed to create transaction',
    };
  }
}

// Category operations
export async function getCategories(userId: string, type?: 'income' | 'expense'): Promise<ApiResponse<Category[]>> {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_system.eq.true`);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return {
      data: data || [],
      success: true,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      data: [],
      success: false,
      error: 'Failed to fetch categories',
    };
  }
}

// Dashboard stats
export async function getDashboardStats(userId: string): Promise<ApiResponse<DashboardStats>> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get total balance from all active accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('is_active', true);

    const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

    // Get current month's income and expenses
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select(`
        amount,
        type,
        account:accounts!inner(user_id)
      `)
      .eq('account.user_id', userId)
      .gte('date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('date', lastDayOfMonth.toISOString().split('T')[0]);

    const monthlyIncome = monthlyTransactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    const monthlyExpenses = monthlyTransactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    const burnRate = monthlyExpenses;
    const projectedRunway = burnRate > 0 ? totalBalance / burnRate : Infinity;

    const accountsCount = accounts?.length || 0;

    return {
      data: {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        burnRate,
        projectedRunway,
        accountsCount,
        lastUpdated: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      data: {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        burnRate: 0,
        projectedRunway: 0,
        accountsCount: 0,
        lastUpdated: new Date().toISOString(),
      },
      success: false,
      error: 'Failed to fetch dashboard stats',
    };
  }
}
