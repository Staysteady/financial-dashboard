import { createServerSupabaseClient } from '@/lib/supabase';
import { BankConnectionManager } from '@/lib/banking-api';

export interface BalanceSyncResult {
  success: boolean;
  accountId: string;
  oldBalance: number;
  newBalance: number;
  difference: number;
  lastUpdated: string;
  source: 'api' | 'calculated' | 'manual';
  error?: string;
}

export interface AccountBalanceData {
  accountId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  availableBalance?: number;
  pendingTransactions?: number;
}

export interface SyncOptions {
  includeCalculated: boolean;
  reconcileDiscrepancies: boolean;
  maxDiscrepancyThreshold: number;
  updateTransactionBalances: boolean;
}

export class BalanceSynchronizer {
  private supabase = createServerSupabaseClient();
  private bankManager = new BankConnectionManager();

  async syncAccountBalance(
    userId: string,
    accountId: string,
    options: Partial<SyncOptions> = {}
  ): Promise<BalanceSyncResult> {
    
    const syncOptions: SyncOptions = {
      includeCalculated: true,
      reconcileDiscrepancies: true,
      maxDiscrepancyThreshold: 10.00, // £10 discrepancy threshold
      updateTransactionBalances: false,
      ...options
    };

    try {
      // Get account details
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select(`
          *,
          bank_connections (*)
        `)
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError || !account) {
        return {
          success: false,
          accountId,
          oldBalance: 0,
          newBalance: 0,
          difference: 0,
          lastUpdated: new Date().toISOString(),
          source: 'api',
          error: 'Account not found or access denied'
        };
      }

      const oldBalance = account.balance || 0;
      let newBalance = oldBalance;
      let source: 'api' | 'calculated' | 'manual' = 'calculated';

      // Try to get balance from bank API first
      if (account.api_connected && account.bank_connections) {
        const apiBalance = await this.fetchBalanceFromAPI(account.bank_connections.id);
        if (apiBalance !== null) {
          newBalance = apiBalance;
          source = 'api';
        }
      }

      // If API failed or not connected, calculate from transactions
      if (source !== 'api' && syncOptions.includeCalculated) {
        const calculatedBalance = await this.calculateBalanceFromTransactions(accountId);
        newBalance = calculatedBalance;
        source = 'calculated';
      }

      // Check for significant discrepancies
      const difference = newBalance - oldBalance;
      if (Math.abs(difference) > syncOptions.maxDiscrepancyThreshold && 
          syncOptions.reconcileDiscrepancies) {
        
        // Log discrepancy for review
        await this.logBalanceDiscrepancy(
          userId,
          accountId,
          oldBalance,
          newBalance,
          source,
          difference
        );
      }

      // Update account balance
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          accountId,
          oldBalance,
          newBalance: oldBalance,
          difference: 0,
          lastUpdated: new Date().toISOString(),
          source,
          error: `Failed to update balance: ${updateError.message}`
        };
      }

      // Update running balances on transactions if requested
      if (syncOptions.updateTransactionBalances) {
        await this.updateTransactionRunningBalances(accountId);
      }

      return {
        success: true,
        accountId,
        oldBalance,
        newBalance,
        difference,
        lastUpdated: new Date().toISOString(),
        source
      };

    } catch (error) {
      return {
        success: false,
        accountId,
        oldBalance: 0,
        newBalance: 0,
        difference: 0,
        lastUpdated: new Date().toISOString(),
        source: 'api',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncAllUserAccounts(
    userId: string,
    options: Partial<SyncOptions> = {}
  ): Promise<BalanceSyncResult[]> {
    
    // Get all active accounts for user
    const { data: accounts, error } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !accounts) {
      return [];
    }

    const results: BalanceSyncResult[] = [];
    
    // Sync each account sequentially to avoid rate limiting
    for (const account of accounts) {
      const result = await this.syncAccountBalance(userId, account.id, options);
      results.push(result);
      
      // Add small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  private async fetchBalanceFromAPI(connectionId: string): Promise<number | null> {
    try {
      const balanceResponse = await this.bankManager.getAccountBalance(connectionId);
      
      if (balanceResponse.success && balanceResponse.data) {
        return balanceResponse.data.balance;
      }
      
      return null;
    } catch (error) {
      console.error('API balance fetch error:', error);
      return null;
    }
  }

  private async calculateBalanceFromTransactions(accountId: string): Promise<number> {
    try {
      // Get all transactions for the account, ordered by date
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('account_id', accountId)
        .order('date', { ascending: true });

      if (error || !transactions) {
        return 0;
      }

      let balance = 0;

      // Calculate running balance
      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          balance += transaction.amount;
        } else if (transaction.type === 'expense') {
          balance -= transaction.amount;
        }
        // Transfers are handled separately
      }

      return balance;

    } catch (error) {
      console.error('Balance calculation error:', error);
      return 0;
    }
  }

  private async updateTransactionRunningBalances(accountId: string): Promise<void> {
    try {
      // Get all transactions ordered by date
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('id, amount, type, date')
        .eq('account_id', accountId)
        .order('date', { ascending: true });

      if (error || !transactions) {
        return;
      }

      let runningBalance = 0;
      const updates: Array<{ id: string; running_balance: number }> = [];

      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          runningBalance += transaction.amount;
        } else if (transaction.type === 'expense') {
          runningBalance -= transaction.amount;
        }

        updates.push({
          id: transaction.id,
          running_balance: runningBalance
        });
      }

      // Batch update running balances
      for (const update of updates) {
        await this.supabase
          .from('transactions')
          .update({ running_balance: update.running_balance })
          .eq('id', update.id);
      }

    } catch (error) {
      console.error('Running balance update error:', error);
    }
  }

  private async logBalanceDiscrepancy(
    userId: string,
    accountId: string,
    oldBalance: number,
    newBalance: number,
    source: string,
    difference: number
  ): Promise<void> {
    
    try {
      await this.supabase
        .from('balance_discrepancies')
        .insert({
          user_id: userId,
          account_id: accountId,
          old_balance: oldBalance,
          new_balance: newBalance,
          difference: difference,
          source: source,
          detected_at: new Date().toISOString(),
          status: 'pending_review'
        });
    } catch (error) {
      console.error('Failed to log balance discrepancy:', error);
    }
  }

  async reconcileAccount(
    userId: string,
    accountId: string,
    manualBalance: number,
    notes?: string
  ): Promise<{
    success: boolean;
    reconciled: boolean;
    adjustmentAmount: number;
    error?: string;
  }> {
    
    try {
      // Get current account balance
      const { data: account, error } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (error || !account) {
        return {
          success: false,
          reconciled: false,
          adjustmentAmount: 0,
          error: 'Account not found'
        };
      }

      const currentBalance = account.balance || 0;
      const adjustmentAmount = manualBalance - currentBalance;

      // Update account balance
      const { error: updateError } = await this.supabase
        .from('accounts')
        .update({
          balance: manualBalance,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          reconciled: false,
          adjustmentAmount: 0,
          error: `Failed to update balance: ${updateError.message}`
        };
      }

      // Log reconciliation
      await this.supabase
        .from('balance_reconciliations')
        .insert({
          user_id: userId,
          account_id: accountId,
          old_balance: currentBalance,
          new_balance: manualBalance,
          adjustment_amount: adjustmentAmount,
          notes: notes || '',
          reconciled_at: new Date().toISOString()
        });

      // Create adjustment transaction if significant difference
      if (Math.abs(adjustmentAmount) > 0.01) {
        await this.supabase
          .from('transactions')
          .insert({
            account_id: accountId,
            amount: Math.abs(adjustmentAmount),
            currency: 'GBP',
            description: `Balance reconciliation adjustment${notes ? ': ' + notes : ''}`,
            type: adjustmentAmount > 0 ? 'income' : 'expense',
            date: new Date().toISOString().split('T')[0],
            is_recurring: false,
            merchant: 'System Adjustment'
          });
      }

      return {
        success: true,
        reconciled: true,
        adjustmentAmount
      };

    } catch (error) {
      return {
        success: false,
        reconciled: false,
        adjustmentAmount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBalanceHistory(
    userId: string,
    accountId: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    balance: number;
    source: string;
  }>> {
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get balance snapshots (if we implement this table)
      const { data: snapshots } = await this.supabase
        .from('balance_snapshots')
        .select('date, balance, source')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (snapshots && snapshots.length > 0) {
        return snapshots;
      }

      // Fallback: calculate from transactions
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('account_id', accountId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!transactions) {
        return [];
      }

      const history: Array<{ date: string; balance: number; source: string }> = [];
      let runningBalance = 0;

      // Get starting balance (would need to implement this properly)
      const { data: account } = await this.supabase
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .single();

      if (account) {
        runningBalance = account.balance || 0;
      }

      // Calculate daily balances
      const dailyTransactions = new Map<string, { income: number; expense: number }>();
      
      transactions.forEach(t => {
        const date = t.date;
        if (!dailyTransactions.has(date)) {
          dailyTransactions.set(date, { income: 0, expense: 0 });
        }
        
        const dayData = dailyTransactions.get(date)!;
        if (t.type === 'income') {
          dayData.income += t.amount;
        } else if (t.type === 'expense') {
          dayData.expense += t.amount;
        }
      });

      // Build history backwards from current balance
      const sortedDates = Array.from(dailyTransactions.keys()).sort().reverse();
      
      for (const date of sortedDates) {
        const dayData = dailyTransactions.get(date)!;
        history.unshift({
          date,
          balance: runningBalance,
          source: 'calculated'
        });
        
        // Adjust balance for previous day
        runningBalance = runningBalance - dayData.income + dayData.expense;
      }

      return history;

    } catch (error) {
      console.error('Balance history error:', error);
      return [];
    }
  }

  async createBalanceSnapshot(
    userId: string,
    accountId: string,
    balance: number,
    source: 'api' | 'calculated' | 'manual' = 'calculated'
  ): Promise<boolean> {
    
    try {
      await this.supabase
        .from('balance_snapshots')
        .insert({
          user_id: userId,
          account_id: accountId,
          date: new Date().toISOString().split('T')[0],
          balance: balance,
          source: source,
          created_at: new Date().toISOString()
        });

      return true;
    } catch (error) {
      console.error('Balance snapshot error:', error);
      return false;
    }
  }

  async scheduledBalanceSync(userId: string): Promise<{
    totalAccounts: number;
    successfulSyncs: number;
    errors: string[];
  }> {
    
    const result = {
      totalAccounts: 0,
      successfulSyncs: 0,
      errors: [] as string[]
    };

    try {
      const syncResults = await this.syncAllUserAccounts(userId, {
        includeCalculated: true,
        reconcileDiscrepancies: true,
        maxDiscrepancyThreshold: 5.00,
        updateTransactionBalances: false
      });

      result.totalAccounts = syncResults.length;
      
      for (const syncResult of syncResults) {
        if (syncResult.success) {
          result.successfulSyncs++;
          
          // Create snapshot for successful syncs
          await this.createBalanceSnapshot(
            userId,
            syncResult.accountId,
            syncResult.newBalance,
            syncResult.source
          );
        } else {
          result.errors.push(
            `Account ${syncResult.accountId}: ${syncResult.error || 'Unknown error'}`
          );
        }
      }

    } catch (error) {
      result.errors.push(
        `Scheduled sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return result;
  }
}