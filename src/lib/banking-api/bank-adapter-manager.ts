import { 
  BankAdapter, 
  BankingApiClient, 
  BankConnectionConfig,
  BankApiResponse,
  BankAuthTokens,
  OpenBankingAccount,
  OpenBankingBalance,
  OpenBankingTransaction,
  BankConnectionStatus,
  ImportedTransaction
} from '@/types/banking-api';
import { OpenBankingApiClient } from './open-banking-client';
import { Account, Transaction } from '@/types';
import { encryptData, decryptData } from '@/utils/encryption';

export interface BankAdapterConfig {
  bankCode: string;
  bankName: string;
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  tokenUrl: string;
  authorizeUrl: string;
  scope: string[];
  redirectUri: string;
  isProduction: boolean;
}

export class BankAdapterManager {
  private adapters: Map<string, BankAdapter> = new Map();
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
    this.initializeDefaultAdapters();
  }

  private initializeDefaultAdapters() {
    // Initialize with sandbox/test configurations
    // In production, these would be loaded from environment variables
    
    const testBankConfig: BankAdapterConfig = {
      bankCode: 'test-bank',
      bankName: 'Test Bank (Sandbox)',
      baseUrl: 'https://ob19-rs1.o3bank.co.uk:4501',
      clientId: process.env.TEST_BANK_CLIENT_ID || 'test-client-id',
      clientSecret: process.env.TEST_BANK_CLIENT_SECRET,
      tokenUrl: 'https://ob19-auth1.o3bank.co.uk:4101/token',
      authorizeUrl: 'https://ob19-auth1.o3bank.co.uk:4101/auth',
      scope: ['accounts', 'payments'],
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/auth/callback',
      isProduction: false,
    };

    this.registerAdapter(testBankConfig);
  }

  registerAdapter(config: BankAdapterConfig): void {
    const apiClient = new OpenBankingApiClient(
      config.baseUrl,
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const bankConfig: BankConnectionConfig = {
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenUrl: config.tokenUrl,
      authorizeUrl: config.authorizeUrl,
      scope: config.scope,
      redirectUri: config.redirectUri,
    };

    const adapter: BankAdapter = {
      bankCode: config.bankCode,
      bankName: config.bankName,
      apiClient,
      config: bankConfig,
      isProduction: config.isProduction,
    };

    this.adapters.set(config.bankCode, adapter);
  }

  getAdapter(bankCode: string): BankAdapter | undefined {
    return this.adapters.get(bankCode);
  }

  getAllAdapters(): BankAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAvailableBanks(): Array<{ code: string; name: string; isProduction: boolean }> {
    return Array.from(this.adapters.values()).map(adapter => ({
      code: adapter.bankCode,
      name: adapter.bankName,
      isProduction: adapter.isProduction,
    }));
  }

  async initiateConnection(bankCode: string): Promise<BankApiResponse<string>> {
    const adapter = this.getAdapter(bankCode);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'BANK_NOT_SUPPORTED',
          message: `Bank ${bankCode} is not supported`,
        }
      };
    }

    return adapter.apiClient.authenticate(adapter.config);
  }

  async completeConnection(
    bankCode: string,
    authCode: string
  ): Promise<BankApiResponse<BankAuthTokens>> {
    const adapter = this.getAdapter(bankCode);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'BANK_NOT_SUPPORTED',
          message: `Bank ${bankCode} is not supported`,
        }
      };
    }

    // Exchange auth code for tokens
    if (adapter.apiClient instanceof OpenBankingApiClient) {
      return adapter.apiClient.exchangeCodeForTokens(authCode, adapter.config);
    }

    return {
      success: false,
      error: {
        code: 'UNSUPPORTED_OPERATION',
        message: 'Token exchange not supported for this bank',
      }
    };
  }

  async syncAccountData(
    bankCode: string,
    accessToken: string
  ): Promise<BankApiResponse<{
    accounts: OpenBankingAccount[];
    transactions: ImportedTransaction[];
  }>> {
    const adapter = this.getAdapter(bankCode);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'BANK_NOT_SUPPORTED',
          message: `Bank ${bankCode} is not supported`,
        }
      };
    }

    try {
      // Get accounts
      const accountsResponse = await adapter.apiClient.getAccounts(accessToken);
      if (!accountsResponse.success) {
        return accountsResponse;
      }

      const accounts = accountsResponse.data || [];
      const allTransactions: ImportedTransaction[] = [];

      // Get transactions for each account
      for (const account of accounts) {
        const transactionsResponse = await adapter.apiClient.getTransactions(
          accessToken,
          account.AccountId,
          this.getDateDaysAgo(90), // Get last 90 days
          undefined,
          1000 // Limit to 1000 transactions per account
        );

        if (transactionsResponse.success && transactionsResponse.data) {
          const importedTransactions = this.transformTransactions(
            transactionsResponse.data,
            account.AccountId
          );
          allTransactions.push(...importedTransactions);
        }
      }

      return {
        success: true,
        data: {
          accounts,
          transactions: allTransactions,
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: error instanceof Error ? error.message : 'Failed to sync account data',
        }
      };
    }
  }

  async testConnection(
    bankCode: string,
    accessToken: string
  ): Promise<BankApiResponse<boolean>> {
    const adapter = this.getAdapter(bankCode);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'BANK_NOT_SUPPORTED',
          message: `Bank ${bankCode} is not supported`,
        }
      };
    }

    return adapter.apiClient.testConnection(accessToken);
  }

  async refreshToken(
    bankCode: string,
    refreshToken: string
  ): Promise<BankApiResponse<BankAuthTokens>> {
    const adapter = this.getAdapter(bankCode);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'BANK_NOT_SUPPORTED',
          message: `Bank ${bankCode} is not supported`,
        }
      };
    }

    return adapter.apiClient.refreshToken(refreshToken);
  }

  async storeEncryptedCredentials(
    userId: string,
    bankCode: string,
    tokens: BankAuthTokens
  ): Promise<string> {
    const credentialsData = {
      bankCode,
      tokens,
      userId,
      storedAt: Date.now(),
    };

    return encryptData(JSON.stringify(credentialsData), this.encryptionKey);
  }

  async retrieveEncryptedCredentials(
    encryptedCredentials: string
  ): Promise<{
    bankCode: string;
    tokens: BankAuthTokens;
    userId: string;
    storedAt: number;
  } | null> {
    try {
      const decrypted = decryptData(encryptedCredentials, this.encryptionKey);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return null;
    }
  }

  private transformTransactions(
    obTransactions: OpenBankingTransaction[],
    accountId: string
  ): ImportedTransaction[] {
    return obTransactions.map(obTxn => {
      const amount = parseFloat(obTxn.Amount.Amount);
      const isCredit = obTxn.CreditDebitIndicator === 'Credit';
      
      return {
        externalId: obTxn.TransactionId,
        amount: isCredit ? Math.abs(amount) : -Math.abs(amount),
        currency: obTxn.Amount.Currency,
        description: obTxn.TransactionInformation || 'Unknown transaction',
        date: obTxn.BookingDateTime.split('T')[0], // Extract date part
        type: isCredit ? 'income' : 'expense',
        merchant: obTxn.MerchantDetails?.MerchantName,
        balance: obTxn.Balance ? parseFloat(obTxn.Balance.Amount.Amount) : undefined,
      };
    });
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}