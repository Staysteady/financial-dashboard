/**
 * Banking API Integration Framework
 * 
 * This module provides a comprehensive API abstraction layer for UK Open Banking
 * and other financial institution APIs, with support for:
 * 
 * - Open Banking Standards v3.x compliance
 * - Multiple bank adapter support
 * - Rate limiting and retry logic
 * - Secure credential storage
 * - CSV import fallback
 * - Error handling and validation
 */

// Core API clients
export { BaseBankingApiClient } from './base-client';
export { OpenBankingApiClient } from './open-banking-client';

// Adapter management
export { BankAdapterManager } from './bank-adapter-manager';
export type { BankAdapterConfig } from './bank-adapter-manager';

// CSV import functionality
export { CSVImportService } from './csv-import';

// Type definitions
export type {
  // Core API types
  BankingApiClient,
  BankAdapter,
  BankConnectionConfig,
  BankAuthTokens,
  BankApiResponse,
  BankApiError,
  BankConnectionStatus,
  
  // Open Banking types
  OpenBankingAccount,
  OpenBankingBalance,
  OpenBankingTransaction,
  OpenBankingApiResponse,
  
  // Import types
  ImportedTransaction,
  CSVImportConfig,
  CSVImportResult,
} from '@/types/banking-api';

// Utility functions
export const BankingApiUtils = {
  /**
   * Check if access token is expired
   */
  isTokenExpired(tokens: BankAuthTokens): boolean {
    const expiryTime = tokens.obtainedAt + (tokens.expiresIn * 1000);
    return Date.now() >= expiryTime;
  },

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  needsTokenRefresh(tokens: BankAuthTokens): boolean {
    const expiryTime = tokens.obtainedAt + (tokens.expiresIn * 1000);
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= (expiryTime - refreshThreshold);
  },

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  /**
   * Validate IBAN format
   */
  validateIBAN(iban: string): boolean {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  },

  /**
   * Validate UK sort code format
   */
  validateSortCode(sortCode: string): boolean {
    const sortCodeRegex = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$|^[0-9]{6}$/;
    return sortCodeRegex.test(sortCode.replace(/\s/g, ''));
  },

  /**
   * Validate UK account number format
   */
  validateAccountNumber(accountNumber: string): boolean {
    const accountRegex = /^[0-9]{8}$/;
    return accountRegex.test(accountNumber.replace(/\s/g, ''));
  },

  /**
   * Generate a secure random state for OAuth flows
   */
  generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Categorize transaction based on description
   */
  categorizeTransaction(description: string): string {
    const categories = {
      food: ['supermarket', 'restaurant', 'cafe', 'takeaway', 'grocery', 'food', 'dining'],
      transport: ['petrol', 'fuel', 'transport', 'bus', 'train', 'taxi', 'uber', 'parking'],
      bills: ['electric', 'gas', 'water', 'phone', 'internet', 'insurance', 'council tax'],
      shopping: ['amazon', 'ebay', 'shopping', 'retail', 'store', 'purchase'],
      entertainment: ['cinema', 'theatre', 'netflix', 'spotify', 'entertainment', 'music'],
      health: ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'dental'],
      income: ['salary', 'wage', 'pay', 'income', 'refund', 'cashback'],
    };

    const lowerDescription = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerDescription.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  },
};