import { BankAdapterManager } from './bank-adapter-manager';
import { BankingCredentialStorage } from './credential-storage';
import { CSVImportService } from './csv-import';
import { 
  BankConnectionStatus,
  BankAuthTokens,
  ImportedTransaction,
  CSVImportConfig,
  CSVImportResult,
  BankConnectionConfig,
  OpenBankingAccount,
  OpenBankingTransaction
} from '@/types/banking-api';
import { ApiResponse } from '@/types';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Account, Transaction } from '@/types';

export interface ConnectionSyncResult {
  success: boolean;
  accountsImported: number;
  transactionsImported: number;
  errors: string[];
  lastSyncTime: string;
}

export interface SyncOptions {
  force?: boolean; // Force sync even if recently synced
  daysBack?: number; // Number of days to sync back
  accountIds?: string[]; // Specific accounts to sync
}

export class BankConnectionManager {
  private adapterManager: BankAdapterManager;
  private credentialStorage: BankingCredentialStorage;

  constructor() {
    this.adapterManager = new BankAdapterManager(
      process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
    );
    this.credentialStorage = BankingCredentialStorage.getInstance();
  }

  /**
   * Get available banks for connection
   */
  getAvailableBanks(): Array<{ code: string; name: string; isProduction: boolean }> {
    return this.adapterManager.getAvailableBanks();
  }

  /**
   * Initiate a new bank connection
   */
  async initiateConnection(
    userId: string,
    bankCode: string
  ): Promise<ApiResponse<{ authUrl: string; state: string }>> {
    try {
      const response = await this.adapterManager.initiateConnection(bankCode);
      
      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.message || 'Failed to initiate connection',
        };
      }

      // Extract state from URL for validation
      const url = new URL(response.data);
      const state = url.searchParams.get('state') || '';

      return {
        success: true,
        data: {
          authUrl: response.data,
          state,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate connection',
      };
    }
  }

  /**
   * Complete bank connection after OAuth callback
   */
  async completeConnection(
    userId: string,
    bankCode: string,
    authCode: string,
    state: string
  ): Promise<ApiResponse<BankConnectionStatus>> {
    try {
      // Exchange auth code for tokens
      const tokenResponse = await this.adapterManager.completeConnection(bankCode, authCode);
      
      if (!tokenResponse.success || !tokenResponse.data) {
        return {
          success: false,
          error: tokenResponse.error?.message || 'Failed to exchange authorization code',
        };
      }

      const tokens = tokenResponse.data;
      
      // Get bank adapter configuration
      const adapter = this.adapterManager.getAdapter(bankCode);
      if (!adapter) {
        return {
          success: false,
          error: 'Bank adapter not found',
        };
      }

      // Test the connection
      const testResponse = await this.adapterManager.testConnection(bankCode, tokens.accessToken);
      if (!testResponse.success) {
        return {
          success: false,
          error: 'Connection test failed: ' + (testResponse.error?.message || 'Unknown error'),
        };
      }

      // Get initial account information for storage
      const accountsResponse = await this.adapterManager.syncAccountData(bankCode, tokens.accessToken);
      let accountIdentifier = 'Unknown';
      let metadata = {};

      if (accountsResponse.success && accountsResponse.data) {
        const accounts = accountsResponse.data.accounts;
        if (accounts.length > 0) {
          accountIdentifier = `${accounts.length} account(s)`;
          metadata = {
            accountCount: accounts.length,
            lastTransactionCount: accountsResponse.data.transactions.length,
            apiVersion: '3.1',
          };
        }
      }

      // Store encrypted credentials
      const storeResponse = await this.credentialStorage.storeCredentials(
        userId,
        bankCode,
        adapter.bankName,
        tokens,
        {
          clientId: adapter.config.clientId,
          clientSecret: adapter.config.clientSecret,
        },
        accountIdentifier,
        metadata
      );

      if (!storeResponse.success) {
        return {
          success: false,
          error: 'Failed to store connection credentials',
        };
      }

      // Perform initial sync
      const syncResult = await this.syncBankData(userId, bankCode);

      return {
        success: true,
        data: {
          connected: true,
          lastSync: new Date().toISOString(),
          totalAccounts: metadata.accountCount || 0,
          totalTransactions: syncResult.success ? syncResult.transactionsImported : 0,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete connection',
      };
    }
  }

  /**
   * Sync data from a specific bank
   */
  async syncBankData(
    userId: string,
    bankCode: string,
    options: SyncOptions = {}
  ): Promise<ConnectionSyncResult> {
    const result: ConnectionSyncResult = {
      success: false,
      accountsImported: 0,
      transactionsImported: 0,
      errors: [],
      lastSyncTime: new Date().toISOString(),
    };

    try {
      // Get stored credentials
      const credentialsResponse = await this.credentialStorage.retrieveCredentials(userId, bankCode);
      if (!credentialsResponse.success || !credentialsResponse.data) {
        result.errors.push('No valid credentials found for this bank');
        return result;
      }

      const credentials = credentialsResponse.data;

      // Check if token needs refresh
      const tokenExpiryTime = credentials.expiresAt;
      const needsRefresh = Date.now() + (5 * 60 * 1000) > tokenExpiryTime; // Refresh if expires within 5 minutes

      let accessToken = credentials.accessToken;

      if (needsRefresh && credentials.refreshToken) {
        const refreshResponse = await this.adapterManager.refreshToken(bankCode, credentials.refreshToken);
        if (refreshResponse.success && refreshResponse.data) {
          // Update stored credentials
          await this.credentialStorage.updateCredentials(userId, bankCode, refreshResponse.data);
          accessToken = refreshResponse.data.accessToken;
        } else {
          result.errors.push('Failed to refresh access token');
          await this.credentialStorage.updateConnectionStatus(userId, bankCode, 'expired', 'Token refresh failed');
          return result;
        }
      }

      // Sync account data
      const syncResponse = await this.adapterManager.syncAccountData(bankCode, accessToken);
      if (!syncResponse.success || !syncResponse.data) {
        result.errors.push(syncResponse.error?.message || 'Failed to sync account data');
        await this.credentialStorage.updateConnectionStatus(
          userId, 
          bankCode, 
          'error', 
          syncResponse.error?.message || 'Sync failed'
        );
        return result;
      }

      const { accounts, transactions } = syncResponse.data;

      // Import accounts to database
      result.accountsImported = await this.importAccounts(userId, bankCode, accounts);

      // Import transactions to database
      result.transactionsImported = await this.importTransactions(userId, transactions);

      // Update connection status
      await this.credentialStorage.updateConnectionStatus(
        userId,
        bankCode,
        'active',
        undefined,
        {
          accountCount: accounts.length,
          lastTransactionCount: transactions.length,
          lastBalance: this.calculateTotalBalance(accounts),
        }
      );

      result.success = true;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(errorMessage);
      
      await this.credentialStorage.updateConnectionStatus(
        userId,
        bankCode,
        'error',
        errorMessage
      );

      return result;
    }
  }

  /**
   * Sync all connected banks for a user
   */
  async syncAllBanks(userId: string, options: SyncOptions = {}): Promise<ApiResponse<ConnectionSyncResult[]>> {
    try {
      const connectionsResponse = await this.credentialStorage.getUserConnections(userId);
      if (!connectionsResponse.success || !connectionsResponse.data) {
        return {
          success: false,
          error: 'Failed to retrieve user connections',
        };
      }

      const activeConnections = connectionsResponse.data.filter(
        conn => conn.connection_status === 'active'
      );

      const results: ConnectionSyncResult[] = [];

      for (const connection of activeConnections) {
        const result = await this.syncBankData(userId, connection.bank_code, options);
        results.push(result);
      }

      return {
        success: true,
        data: results,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync all banks',
      };
    }
  }

  /**
   * Disconnect a bank
   */
  async disconnectBank(userId: string, bankCode: string): Promise<ApiResponse<boolean>> {
    try {
      // Get credentials to revoke token
      const credentialsResponse = await this.credentialStorage.retrieveCredentials(userId, bankCode);
      if (credentialsResponse.success && credentialsResponse.data) {
        // Attempt to revoke token with bank
        await this.adapterManager.testConnection(bankCode, credentialsResponse.data.accessToken);
      }

      // Revoke stored credentials
      const revokeResponse = await this.credentialStorage.revokeCredentials(userId, bankCode);
      
      return {
        success: revokeResponse.success,
        data: revokeResponse.success,
        error: revokeResponse.error,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect bank',
      };
    }
  }

  /**
   * Get connection status for all user's banks
   */
  async getConnectionStatuses(userId: string): Promise<ApiResponse<BankConnectionStatus[]>> {
    try {
      const connectionsResponse = await this.credentialStorage.getUserConnections(userId);
      if (!connectionsResponse.success || !connectionsResponse.data) {
        return {
          success: false,
          error: 'Failed to retrieve user connections',
        };
      }

      const statuses: BankConnectionStatus[] = connectionsResponse.data.map(connection => ({
        connected: connection.connection_status === 'active',
        lastSync: connection.last_sync,
        errorMessage: connection.error_message,
        nextSyncScheduled: connection.next_sync_scheduled,
        totalAccounts: connection.metadata?.accountCount || 0,
        totalTransactions: connection.metadata?.lastTransactionCount || 0,
      }));

      return {
        success: true,
        data: statuses,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connection statuses',
      };
    }
  }

  /**
   * Import CSV file data
   */
  async importCSV(
    userId: string,
    csvContent: string,
    config: CSVImportConfig,
    accountId: string
  ): Promise<ApiResponse<CSVImportResult>> {
    try {
      // Parse CSV
      const parseResult = await CSVImportService.parseCSV(csvContent, config);
      
      if (!parseResult.success) {
        return {
          success: false,
          error: 'Failed to parse CSV file',
          data: parseResult,
        };
      }

      // Import transactions to database
      const importedCount = await this.importTransactionsToAccount(
        userId,
        accountId,
        parseResult.transactions
      );

      const result: CSVImportResult = {
        ...parseResult,
        successfulImports: importedCount,
        failedImports: parseResult.transactions.length - importedCount,
      };

      return {
        success: true,
        data: result,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import CSV',
      };
    }
  }

  private async importAccounts(
    userId: string,
    bankCode: string,
    obAccounts: OpenBankingAccount[]
  ): Promise<number> {
    let importedCount = 0;
    const supabase = createServerSupabaseClient();

    for (const obAccount of obAccounts) {
      try {
        // Check if account already exists
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('institution_name', bankCode)
          .eq('account_name', obAccount.Nickname || obAccount.AccountId)
          .single();

        if (existingAccount) {
          // Update existing account
          await supabase
            .from('accounts')
            .update({
              account_type: this.mapAccountType(obAccount.AccountSubType),
              currency: obAccount.Currency,
              last_updated: new Date().toISOString(),
              api_connected: true,
            })
            .eq('id', existingAccount.id);
        } else {
          // Create new account
          await supabase
            .from('accounts')
            .insert({
              user_id: userId,
              institution_name: bankCode,
              account_name: obAccount.Nickname || obAccount.AccountId,
              account_type: this.mapAccountType(obAccount.AccountSubType),
              balance: 0, // Will be updated by transactions
              currency: obAccount.Currency,
              api_connected: true,
            });
        }

        importedCount++;
      } catch (error) {
        console.error(`Failed to import account ${obAccount.AccountId}:`, error);
      }
    }

    return importedCount;
  }

  private async importTransactions(
    userId: string,
    importedTransactions: ImportedTransaction[]
  ): Promise<number> {
    let importedCount = 0;
    const supabase = createServerSupabaseClient();

    for (const transaction of importedTransactions) {
      try {
        // Check for duplicate transactions
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('external_id', transaction.externalId)
          .single();

        if (existingTransaction) {
          continue; // Skip duplicate
        }

        // Find the corresponding account
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('api_connected', true)
          .single();

        if (!account) {
          continue; // No account found
        }

        // Insert transaction
        await supabase
          .from('transactions')
          .insert({
            account_id: account.id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            date: transaction.date,
            type: transaction.type,
            merchant: transaction.merchant,
            external_id: transaction.externalId,
          });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import transaction ${transaction.externalId}:`, error);
      }
    }

    return importedCount;
  }

  private async importTransactionsToAccount(
    userId: string,
    accountId: string,
    importedTransactions: ImportedTransaction[]
  ): Promise<number> {
    let importedCount = 0;
    const supabase = createServerSupabaseClient();

    for (const transaction of importedTransactions) {
      try {
        // Verify account ownership
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', accountId)
          .eq('user_id', userId)
          .single();

        if (!account) {
          continue; // Account not found or access denied
        }

        // Check for duplicates
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('external_id', transaction.externalId)
          .eq('account_id', accountId)
          .single();

        if (existingTransaction) {
          continue; // Skip duplicate
        }

        // Insert transaction
        await supabase
          .from('transactions')
          .insert({
            account_id: accountId,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            date: transaction.date,
            type: transaction.type,
            merchant: transaction.merchant,
            external_id: transaction.externalId,
          });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import transaction ${transaction.externalId}:`, error);
      }
    }

    return importedCount;
  }

  private mapAccountType(obAccountSubType: string): 'savings' | 'current' | 'investment' | 'credit' | 'loan' {
    const mapping: Record<string, 'savings' | 'current' | 'investment' | 'credit' | 'loan'> = {
      'CurrentAccount': 'current',
      'Savings': 'savings',
      'Investment': 'investment',
      'CreditCard': 'credit',
      'ChargeCard': 'credit',
      'Loan': 'loan',
      'Mortgage': 'loan',
    };

    return mapping[obAccountSubType] || 'current';
  }

  private calculateTotalBalance(accounts: OpenBankingAccount[]): number {
    // This would need to fetch actual balances
    // For now, return 0 as balance will be calculated from transactions
    return 0;
  }
}