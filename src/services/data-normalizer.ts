import { NormalizedTransaction } from '@/types/banking-api';

export interface BankFormatConfig {
  name: string;
  fieldMappings: FieldMapping;
  dateFormats: string[];
  amountFormat: AmountFormat;
  descriptionCleanup: DescriptionCleanupRule[];
  transactionTypeRules: TransactionTypeRule[];
  currencyDefault: string;
}

export interface FieldMapping {
  date: string;
  amount: string;
  description: string;
  merchant?: string;
  location?: string;
  transactionId?: string;
  reference?: string;
  balance?: string;
  type?: string;
}

export interface AmountFormat {
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ' | '';
  negativeFormat: 'minus' | 'parentheses' | 'cr_dr';
  currencySymbol?: string;
  currencyPosition?: 'before' | 'after';
}

export interface DescriptionCleanupRule {
  pattern: RegExp;
  replacement: string;
  extractMerchant?: boolean;
}

export interface TransactionTypeRule {
  condition: {
    field: 'amount' | 'description' | 'merchant';
    operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'regex';
    value: string | number;
  };
  type: 'income' | 'expense' | 'transfer';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixedFields: string[];
}

export class DataNormalizer {
  private bankFormats: Map<string, BankFormatConfig> = new Map();

  constructor() {
    this.initializeBankFormats();
  }

  private initializeBankFormats(): void {
    // UK Bank formats
    this.registerBankFormat('barclays', {
      name: 'Barclays UK',
      fieldMappings: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
        merchant: 'Merchant',
        transactionId: 'Reference',
        balance: 'Balance'
      },
      dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'],
      amountFormat: {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        negativeFormat: 'minus',
        currencySymbol: '£',
        currencyPosition: 'before'
      },
      descriptionCleanup: [
        { pattern: /\bCARD\s+PAYMENT\s+/i, replacement: '', extractMerchant: true },
        { pattern: /\bDIRECT\s+DEBIT\s+/i, replacement: 'DD: ' },
        { pattern: /\bSTANDING\s+ORDER\s+/i, replacement: 'SO: ' },
        { pattern: /\s+/g, replacement: ' ' }
      ],
      transactionTypeRules: [
        {
          condition: { field: 'amount', operator: 'greater_than', value: 0 },
          type: 'income'
        },
        {
          condition: { field: 'amount', operator: 'less_than', value: 0 },
          type: 'expense'
        }
      ],
      currencyDefault: 'GBP'
    });

    this.registerBankFormat('hsbc', {
      name: 'HSBC UK',
      fieldMappings: {
        date: 'Transaction Date',
        amount: 'Debit Amount|Credit Amount',
        description: 'Transaction Description',
        reference: 'Reference Number',
        balance: 'Balance'
      },
      dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY'],
      amountFormat: {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        negativeFormat: 'cr_dr',
        currencySymbol: '£'
      },
      descriptionCleanup: [
        { pattern: /\bVISA\s+/i, replacement: '' },
        { pattern: /\bMASTERCARD\s+/i, replacement: '' },
        { pattern: /\d{4}\*{8}\d{4}/g, replacement: '[CARD]' }
      ],
      transactionTypeRules: [
        {
          condition: { field: 'description', operator: 'contains', value: 'CREDIT' },
          type: 'income'
        }
      ],
      currencyDefault: 'GBP'
    });

    this.registerBankFormat('lloyds', {
      name: 'Lloyds Bank UK',
      fieldMappings: {
        date: 'Transaction Date',
        amount: 'Debit Amount|Credit Amount',
        description: 'Transaction Description',
        merchant: 'Merchant Name',
        transactionId: 'Transaction ID'
      },
      dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD'],
      amountFormat: {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        negativeFormat: 'parentheses'
      },
      descriptionCleanup: [
        { pattern: /\bFASTPAY\s+/i, replacement: '' },
        { pattern: /\bBPAY\s+/i, replacement: '' }
      ],
      transactionTypeRules: [],
      currencyDefault: 'GBP'
    });

    // Generic CSV format
    this.registerBankFormat('generic', {
      name: 'Generic CSV',
      fieldMappings: {
        date: 'date|transaction_date|Date|Transaction Date',
        amount: 'amount|Amount|value|Value',
        description: 'description|Description|details|Details|memo|Memo',
        merchant: 'merchant|Merchant|payee|Payee',
        transactionId: 'id|ID|reference|Reference|transaction_id'
      },
      dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY'],
      amountFormat: {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        negativeFormat: 'minus'
      },
      descriptionCleanup: [
        { pattern: /\s+/g, replacement: ' ' }
      ],
      transactionTypeRules: [
        {
          condition: { field: 'amount', operator: 'greater_than', value: 0 },
          type: 'income'
        },
        {
          condition: { field: 'amount', operator: 'less_than', value: 0 },
          type: 'expense'
        }
      ],
      currencyDefault: 'GBP'
    });
  }

  registerBankFormat(bankCode: string, config: BankFormatConfig): void {
    this.bankFormats.set(bankCode.toLowerCase(), config);
  }

  detectBankFormat(headers: string[], sampleData?: any[]): string {
    let bestMatch = 'generic';
    let bestScore = 0;

    for (const [bankCode, config] of this.bankFormats) {
      const score = this.calculateFormatScore(headers, config, sampleData);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = bankCode;
      }
    }

    return bestMatch;
  }

  private calculateFormatScore(
    headers: string[],
    config: BankFormatConfig,
    sampleData?: any[]
  ): number {
    let score = 0;
    let totalFields = 0;

    const headerLower = headers.map(h => h.toLowerCase());

    // Check field mappings
    for (const [field, mapping] of Object.entries(config.fieldMappings)) {
      totalFields++;
      const patterns = mapping.split('|').map(p => p.toLowerCase());
      
      for (const pattern of patterns) {
        if (headerLower.some(h => h.includes(pattern.toLowerCase()))) {
          score++;
          break;
        }
      }
    }

    // Bank-specific patterns
    if (config.name.includes('Barclays') && 
        headerLower.some(h => h.includes('barclays'))) {
      score += 2;
    }

    if (config.name.includes('HSBC') && 
        headerLower.some(h => h.includes('hsbc'))) {
      score += 2;
    }

    return totalFields > 0 ? (score / totalFields) * 100 : 0;
  }

  normalizeTransaction(
    rawData: Record<string, any>,
    bankFormat: string = 'generic'
  ): NormalizedTransaction | null {
    
    const config = this.bankFormats.get(bankFormat.toLowerCase());
    if (!config) {
      throw new Error(`Unknown bank format: ${bankFormat}`);
    }

    try {
      // Extract fields using mappings
      const extractedData = this.extractFields(rawData, config.fieldMappings);
      
      // Normalize date
      const normalizedDate = this.normalizeDate(
        extractedData.date,
        config.dateFormats
      );

      // Normalize amount
      const normalizedAmount = this.normalizeAmount(
        extractedData.amount,
        config.amountFormat
      );

      // Clean description
      let description = this.cleanDescription(
        extractedData.description || '',
        config.descriptionCleanup
      );

      // Extract merchant if not provided
      let merchant = extractedData.merchant;
      if (!merchant) {
        merchant = this.extractMerchantFromDescription(
          description,
          config.descriptionCleanup
        );
      }

      // Determine transaction type
      const transactionType = this.determineTransactionType(
        normalizedAmount,
        description,
        merchant,
        config.transactionTypeRules
      );

      return {
        transactionId: extractedData.transactionId,
        amount: Math.abs(normalizedAmount),
        currency: config.currencyDefault,
        description: description.trim(),
        date: normalizedDate,
        merchant: merchant?.trim(),
        location: extractedData.location?.trim(),
        type: transactionType
      };

    } catch (error) {
      console.error('Transaction normalization error:', error);
      return null;
    }
  }

  private extractFields(
    rawData: Record<string, any>,
    mappings: FieldMapping
  ): Record<string, any> {
    
    const extracted: Record<string, any> = {};
    
    for (const [field, mapping] of Object.entries(mappings)) {
      const patterns = mapping.split('|');
      
      for (const pattern of patterns) {
        // Try exact match first
        if (rawData[pattern] !== undefined) {
          extracted[field] = rawData[pattern];
          break;
        }
        
        // Try case-insensitive match
        const key = Object.keys(rawData).find(
          k => k.toLowerCase() === pattern.toLowerCase()
        );
        if (key && rawData[key] !== undefined) {
          extracted[field] = rawData[key];
          break;
        }
        
        // Try partial match
        const partialKey = Object.keys(rawData).find(
          k => k.toLowerCase().includes(pattern.toLowerCase()) ||
               pattern.toLowerCase().includes(k.toLowerCase())
        );
        if (partialKey && rawData[partialKey] !== undefined) {
          extracted[field] = rawData[partialKey];
          break;
        }
      }
    }
    
    return extracted;
  }

  private normalizeDate(dateStr: string, formats: string[]): string {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }

    const cleanDateStr = dateStr.toString().trim();
    
    // Try each format
    for (const format of formats) {
      try {
        const date = this.parseDate(cleanDateStr, format);
        if (date && !isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback: try native Date parsing
    const fallbackDate = new Date(cleanDateStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0];
    }

    // Last resort: return today's date
    return new Date().toISOString().split('T')[0];
  }

  private parseDate(dateStr: string, format: string): Date | null {
    const formatMap: Record<string, RegExp> = {
      'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      'DD-MM-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      'DD MMM YYYY': /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/
    };

    const regex = formatMap[format];
    if (!regex) return null;

    const match = dateStr.match(regex);
    if (!match) return null;

    switch (format) {
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY':
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      
      case 'MM/DD/YYYY':
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      
      case 'YYYY-MM-DD':
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      
      case 'DD MMM YYYY':
        const monthMap: Record<string, number> = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const month = monthMap[match[2].toLowerCase()];
        if (month === undefined) return null;
        return new Date(parseInt(match[3]), month, parseInt(match[1]));
      
      default:
        return null;
    }
  }

  private normalizeAmount(amountStr: any, format: AmountFormat): number {
    if (typeof amountStr === 'number') {
      return amountStr;
    }

    let cleanAmount = amountStr.toString().trim();
    
    // Remove currency symbols
    if (format.currencySymbol) {
      cleanAmount = cleanAmount.replace(new RegExp(`\\${format.currencySymbol}`, 'g'), '');
    }
    
    // Handle negative formats
    let isNegative = false;
    
    if (format.negativeFormat === 'parentheses') {
      if (cleanAmount.includes('(') && cleanAmount.includes(')')) {
        isNegative = true;
        cleanAmount = cleanAmount.replace(/[()]/g, '');
      }
    } else if (format.negativeFormat === 'cr_dr') {
      if (cleanAmount.toLowerCase().includes('dr')) {
        isNegative = true;
        cleanAmount = cleanAmount.replace(/dr/gi, '');
      }
    } else if (format.negativeFormat === 'minus') {
      if (cleanAmount.includes('-')) {
        isNegative = true;
        cleanAmount = cleanAmount.replace('-', '');
      }
    }

    // Remove thousands separators
    if (format.thousandsSeparator) {
      cleanAmount = cleanAmount.replace(
        new RegExp(`\\${format.thousandsSeparator}`, 'g'), 
        ''
      );
    }

    // Handle decimal separator
    if (format.decimalSeparator === ',') {
      cleanAmount = cleanAmount.replace(',', '.');
    }

    const amount = parseFloat(cleanAmount);
    return isNaN(amount) ? 0 : (isNegative ? -amount : amount);
  }

  private cleanDescription(
    description: string,
    rules: DescriptionCleanupRule[]
  ): string {
    
    let cleaned = description;
    
    for (const rule of rules) {
      cleaned = cleaned.replace(rule.pattern, rule.replacement);
    }
    
    return cleaned.trim();
  }

  private extractMerchantFromDescription(
    description: string,
    rules: DescriptionCleanupRule[]
  ): string | undefined {
    
    for (const rule of rules) {
      if (rule.extractMerchant) {
        const match = description.match(rule.pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return undefined;
  }

  private determineTransactionType(
    amount: number,
    description: string,
    merchant: string | undefined,
    rules: TransactionTypeRule[]
  ): 'income' | 'expense' | 'transfer' {
    
    for (const rule of rules) {
      if (this.evaluateTransactionTypeCondition(rule.condition, {
        amount,
        description,
        merchant
      })) {
        return rule.type;
      }
    }
    
    // Default logic
    return amount >= 0 ? 'income' : 'expense';
  }

  private evaluateTransactionTypeCondition(
    condition: TransactionTypeRule['condition'],
    data: { amount: number; description: string; merchant?: string }
  ): boolean {
    
    let fieldValue: any;
    
    switch (condition.field) {
      case 'amount':
        fieldValue = data.amount;
        break;
      case 'description':
        fieldValue = data.description;
        break;
      case 'merchant':
        fieldValue = data.merchant || '';
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'contains':
        return fieldValue.toString().toLowerCase().includes(
          condition.value.toString().toLowerCase()
        );
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && 
               fieldValue > (condition.value as number);
      case 'less_than':
        return typeof fieldValue === 'number' && 
               fieldValue < (condition.value as number);
      case 'regex':
        return new RegExp(condition.value.toString()).test(fieldValue.toString());
      default:
        return false;
    }
  }

  validateTransaction(
    transaction: NormalizedTransaction,
    bankFormat: string = 'generic'
  ): ValidationResult {
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixedFields: []
    };

    // Required field validation
    if (!transaction.amount || transaction.amount === 0) {
      result.errors.push('Amount is required and must be non-zero');
      result.isValid = false;
    }

    if (!transaction.date) {
      result.errors.push('Date is required');
      result.isValid = false;
    }

    if (!transaction.description || transaction.description.trim().length === 0) {
      result.errors.push('Description is required');
      result.isValid = false;
    }

    // Date validation
    const date = new Date(transaction.date);
    if (isNaN(date.getTime())) {
      result.errors.push('Invalid date format');
      result.isValid = false;
    } else {
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const oneYearFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      if (date < twoYearsAgo) {
        result.warnings.push('Transaction date is more than 2 years old');
      }
      
      if (date > oneYearFuture) {
        result.warnings.push('Transaction date is more than 1 year in the future');
      }
    }

    // Amount validation
    if (transaction.amount < 0) {
      result.warnings.push('Negative amount detected - will be converted to positive');
    }

    if (transaction.amount > 1000000) {
      result.warnings.push('Very large transaction amount');
    }

    // Description validation
    if (transaction.description.length > 500) {
      result.warnings.push('Description is very long and may be truncated');
    }

    return result;
  }

  normalizeBatch(
    rawTransactions: Record<string, any>[],
    bankFormat?: string
  ): {
    normalized: NormalizedTransaction[];
    errors: Array<{ index: number; error: string; data: any }>;
    format: string;
  } {
    
    // Auto-detect format if not provided
    if (!bankFormat && rawTransactions.length > 0) {
      const headers = Object.keys(rawTransactions[0]);
      bankFormat = this.detectBankFormat(headers, rawTransactions.slice(0, 5));
    }

    const format = bankFormat || 'generic';
    const normalized: NormalizedTransaction[] = [];
    const errors: Array<{ index: number; error: string; data: any }> = [];

    rawTransactions.forEach((raw, index) => {
      try {
        const normalizedTransaction = this.normalizeTransaction(raw, format);
        if (normalizedTransaction) {
          const validation = this.validateTransaction(normalizedTransaction, format);
          if (validation.isValid) {
            normalized.push(normalizedTransaction);
          } else {
            errors.push({
              index,
              error: validation.errors.join(', '),
              data: raw
            });
          }
        } else {
          errors.push({
            index,
            error: 'Failed to normalize transaction',
            data: raw
          });
        }
      } catch (error) {
        errors.push({
          index,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: raw
        });
      }
    });

    return { normalized, errors, format };
  }
}