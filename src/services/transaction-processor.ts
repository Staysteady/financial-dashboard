import { createServerSupabaseClient } from '@/lib/supabase';
import { encryptData, decryptData } from '@/utils/encryption';
import { BankConnectionManager } from '@/lib/banking-api';
import { ApiResponse, TransactionData, NormalizedTransaction } from '@/types/banking-api';

export interface ProcessedTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  categoryId?: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string;
  location?: string;
  externalId?: string;
  isRecurring: boolean;
  isDuplicate: boolean;
  confidence: number; // categorization confidence 0-1
}

export interface TransactionImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  errorDetails: string[];
  transactions: ProcessedTransaction[];
}

export class TransactionProcessor {
  private supabase = createServerSupabaseClient();
  private bankManager = new BankConnectionManager();

  async importTransactionsFromAPI(userId: string, accountId: string): Promise<TransactionImportResult> {
    try {
      // Get account details
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('*, bank_connections(*)')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError || !account) {
        return {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: 1,
          errorDetails: ['Account not found or access denied'],
          transactions: []
        };
      }

      // Get bank connection
      const { data: connection } = await this.supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('id', account.bank_connections?.id)
        .single();

      if (!connection) {
        return {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: 1,
          errorDetails: ['Bank connection not found'],
          transactions: []
        };
      }

      // Fetch transactions from bank API
      const apiResponse = await this.bankManager.syncTransactions(connection.id);
      
      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          imported: 0,
          duplicates: 0,
          errors: 1,
          errorDetails: [apiResponse.error || 'Failed to fetch transactions from bank'],
          transactions: []
        };
      }

      // Process and normalize transactions
      const processResult = await this.processTransactionBatch(
        userId,
        accountId,
        apiResponse.data
      );

      // Update account balance
      if (apiResponse.data.length > 0) {
        await this.updateAccountBalance(accountId, userId);
      }

      return processResult;

    } catch (error) {
      console.error('Transaction import error:', error);
      return {
        success: false,
        imported: 0,
        duplicates: 0,
        errors: 1,
        errorDetails: [error instanceof Error ? error.message : 'Unknown error'],
        transactions: []
      };
    }
  }

  async processCSVImport(
    userId: string,
    accountId: string,
    csvData: string,
    mapping: Record<string, string>
  ): Promise<TransactionImportResult> {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const rawTransactions: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const transaction: any = {};
        
        headers.forEach((header, index) => {
          transaction[header] = values[index];
        });
        
        rawTransactions.push(transaction);
      }

      // Convert to normalized format using mapping
      const normalizedTransactions = rawTransactions.map(raw => 
        this.mapCSVToNormalizedTransaction(raw, mapping)
      ).filter(t => t !== null);

      return await this.processTransactionBatch(
        userId,
        accountId,
        normalizedTransactions as NormalizedTransaction[]
      );

    } catch (error) {
      console.error('CSV import error:', error);
      return {
        success: false,
        imported: 0,
        duplicates: 0,
        errors: 1,
        errorDetails: [error instanceof Error ? error.message : 'CSV parsing error'],
        transactions: []
      };
    }
  }

  private async processTransactionBatch(
    userId: string,
    accountId: string,
    transactions: NormalizedTransaction[]
  ): Promise<TransactionImportResult> {
    const result: TransactionImportResult = {
      success: true,
      imported: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
      transactions: []
    };

    for (const transaction of transactions) {
      try {
        // Check for duplicates
        const isDuplicate = await this.checkDuplicate(accountId, transaction);
        
        if (isDuplicate) {
          result.duplicates++;
          continue;
        }

        // Normalize and enrich transaction
        const processedTransaction = await this.normalizeTransaction(
          userId,
          accountId,
          transaction
        );

        // Auto-categorize transaction
        const categoryId = await this.autoCategorizeLlm(userId, processedTransaction);
        if (categoryId) {
          processedTransaction.categoryId = categoryId;
        }

        // Insert into database
        const { error } = await this.supabase
          .from('transactions')
          .insert({
            account_id: accountId,
            amount: processedTransaction.amount,
            currency: processedTransaction.currency,
            description: processedTransaction.description,
            category_id: processedTransaction.categoryId,
            date: processedTransaction.date,
            type: processedTransaction.type,
            merchant: processedTransaction.merchant,
            location: processedTransaction.location,
            external_id: processedTransaction.externalId,
            is_recurring: processedTransaction.isRecurring
          });

        if (error) {
          result.errors++;
          result.errorDetails.push(`Failed to insert transaction: ${error.message}`);
        } else {
          result.imported++;
          result.transactions.push(processedTransaction);
        }

      } catch (error) {
        result.errors++;
        result.errorDetails.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors === 0;
    return result;
  }

  private async checkDuplicate(
    accountId: string,
    transaction: NormalizedTransaction
  ): Promise<boolean> {
    // Check by external ID first (most reliable)
    if (transaction.transactionId) {
      const { data } = await this.supabase
        .from('transactions')
        .select('id')
        .eq('account_id', accountId)
        .eq('external_id', transaction.transactionId)
        .limit(1);

      if (data && data.length > 0) {
        return true;
      }
    }

    // Check by amount, date, and description (fuzzy match)
    const { data } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('account_id', accountId)
      .eq('amount', transaction.amount)
      .eq('date', transaction.date)
      .ilike('description', `%${transaction.description.substring(0, 20)}%`)
      .limit(1);

    return data && data.length > 0;
  }

  private async normalizeTransaction(
    userId: string,
    accountId: string,
    transaction: NormalizedTransaction
  ): Promise<ProcessedTransaction> {
    // Determine transaction type
    const type = transaction.amount >= 0 ? 'income' : 'expense';
    
    // Clean and normalize description
    const description = this.cleanDescription(transaction.description);
    
    // Extract merchant info
    const merchant = this.extractMerchant(description);
    
    // Detect recurring patterns
    const isRecurring = await this.detectRecurringTransaction(
      accountId, 
      Math.abs(transaction.amount), 
      merchant || description
    );

    return {
      id: '', // Will be set by database
      accountId,
      amount: Math.abs(transaction.amount),
      currency: transaction.currency || 'GBP',
      description,
      date: transaction.date,
      type,
      merchant,
      location: transaction.location,
      externalId: transaction.transactionId,
      isRecurring,
      isDuplicate: false,
      confidence: 0
    };
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .substring(0, 200);
  }

  private extractMerchant(description: string): string | undefined {
    const merchantPatterns = [
      /^(.*?)\s+(?:CARD|POS|ATM|PAYPAL|AMAZON|SPOTIFY|NETFLIX)/i,
      /^(.*?)\s+\d{2}\/\d{2}/,
      /^([A-Z\s]{3,})/
    ];

    for (const pattern of merchantPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }

    return undefined;
  }

  private async detectRecurringTransaction(
    accountId: string,
    amount: number,
    description: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('transactions')
      .select('date')
      .eq('account_id', accountId)
      .eq('amount', amount)
      .ilike('description', `%${description.substring(0, 10)}%`)
      .order('date', { ascending: false })
      .limit(3);

    if (!data || data.length < 2) return false;

    // Check if transactions occur at regular intervals (monthly/weekly)
    const dates = data.map(t => new Date(t.date));
    const intervals = [];
    
    for (let i = 0; i < dates.length - 1; i++) {
      const diffDays = Math.abs(dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    // Check for monthly (28-31 days) or weekly (6-8 days) patterns
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return (avgInterval >= 28 && avgInterval <= 31) || (avgInterval >= 6 && avgInterval <= 8);
  }

  private async autoCategorizeLlm(
    userId: string,
    transaction: ProcessedTransaction
  ): Promise<string | undefined> {
    try {
      // Get user's categories
      const { data: categories } = await this.supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', userId)
        .eq('type', transaction.type);

      if (!categories || categories.length === 0) {
        return undefined;
      }

      // Simple rule-based categorization (can be enhanced with ML later)
      const description = transaction.description.toLowerCase();
      const merchant = transaction.merchant?.toLowerCase() || '';

      // Expense categories
      if (transaction.type === 'expense') {
        if (description.includes('grocery') || merchant.includes('tesco') || merchant.includes('sainsbury')) {
          return categories.find(c => c.name.toLowerCase().includes('groceries'))?.id;
        }
        if (description.includes('fuel') || description.includes('petrol') || merchant.includes('shell')) {
          return categories.find(c => c.name.toLowerCase().includes('transport'))?.id;
        }
        if (description.includes('restaurant') || description.includes('cafe') || merchant.includes('mcdonald')) {
          return categories.find(c => c.name.toLowerCase().includes('dining'))?.id;
        }
        if (description.includes('subscription') || merchant.includes('netflix') || merchant.includes('spotify')) {
          return categories.find(c => c.name.toLowerCase().includes('subscription'))?.id;
        }
      }

      // Income categories
      if (transaction.type === 'income') {
        if (description.includes('salary') || description.includes('wage')) {
          return categories.find(c => c.name.toLowerCase().includes('salary'))?.id;
        }
        if (description.includes('interest') || description.includes('dividend')) {
          return categories.find(c => c.name.toLowerCase().includes('investment'))?.id;
        }
      }

      // Default to first category of matching type
      return categories[0]?.id;

    } catch (error) {
      console.error('Auto-categorization error:', error);
      return undefined;
    }
  }

  private mapCSVToNormalizedTransaction(
    raw: any,
    mapping: Record<string, string>
  ): NormalizedTransaction | null {
    try {
      return {
        transactionId: raw[mapping.id] || `csv_${Date.now()}_${Math.random()}`,
        amount: parseFloat(raw[mapping.amount] || '0'),
        currency: raw[mapping.currency] || 'GBP',
        description: raw[mapping.description] || '',
        date: raw[mapping.date] || new Date().toISOString().split('T')[0],
        location: raw[mapping.location],
        merchant: raw[mapping.merchant]
      };
    } catch (error) {
      return null;
    }
  }

  private async updateAccountBalance(accountId: string, userId: string): Promise<void> {
    try {
      // Calculate current balance from transactions
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('amount, type')
        .eq('account_id', accountId);

      if (!transactions) return;

      let balance = 0;
      transactions.forEach(t => {
        if (t.type === 'income') {
          balance += t.amount;
        } else if (t.type === 'expense') {
          balance -= t.amount;
        }
      });

      // Update account balance
      await this.supabase
        .from('accounts')
        .update({ 
          balance,
          last_updated: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', userId);

    } catch (error) {
      console.error('Balance update error:', error);
    }
  }
}