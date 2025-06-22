import { createServerSupabaseClient } from '@/lib/supabase';

export interface ValidationRule {
  id: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  description: string;
  severity: 'error' | 'warning' | 'info';
  rule: ValidationRuleConfig;
  isActive: boolean;
}

export interface ValidationRuleConfig {
  // For required validation
  allowEmpty?: boolean;
  
  // For format validation
  pattern?: string;
  dateFormat?: string;
  currencyFormat?: string;
  
  // For range validation
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  
  // For custom validation
  customFunction?: string;
  customMessage?: string;
}

export interface ValidationResult {
  field: string;
  value: any;
  isValid: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleId: string;
  suggestedFix?: any;
}

export interface DataCleaningResult {
  originalValue: any;
  cleanedValue: any;
  wasModified: boolean;
  modifications: string[];
  confidence: number;
}

export interface TransactionValidationReport {
  transactionId: string;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: ValidationResult[];
  cleaned: boolean;
  cleaningResults?: Record<string, DataCleaningResult>;
}

export class DataValidator {
  private supabase = createServerSupabaseClient();
  
  private defaultRules: ValidationRule[] = [
    {
      id: 'amount_required',
      field: 'amount',
      type: 'required',
      description: 'Transaction amount is required',
      severity: 'error',
      rule: { allowEmpty: false },
      isActive: true
    },
    {
      id: 'amount_positive',
      field: 'amount',
      type: 'range',
      description: 'Transaction amount must be positive',
      severity: 'error',
      rule: { min: 0.01 },
      isActive: true
    },
    {
      id: 'amount_reasonable',
      field: 'amount',
      type: 'range',
      description: 'Transaction amount seems unusually large',
      severity: 'warning',
      rule: { max: 50000 },
      isActive: true
    },
    {
      id: 'date_required',
      field: 'date',
      type: 'required',
      description: 'Transaction date is required',
      severity: 'error',
      rule: { allowEmpty: false },
      isActive: true
    },
    {
      id: 'date_format',
      field: 'date',
      type: 'format',
      description: 'Transaction date must be in valid format',
      severity: 'error',
      rule: { dateFormat: 'YYYY-MM-DD' },
      isActive: true
    },
    {
      id: 'date_range',
      field: 'date',
      type: 'range',
      description: 'Transaction date is outside reasonable range',
      severity: 'warning',
      rule: { 
        minDate: '2020-01-01',
        maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      isActive: true
    },
    {
      id: 'description_required',
      field: 'description',
      type: 'required',
      description: 'Transaction description is required',
      severity: 'error',
      rule: { allowEmpty: false },
      isActive: true
    },
    {
      id: 'description_length',
      field: 'description',
      type: 'range',
      description: 'Transaction description is too long',
      severity: 'warning',
      rule: { max: 500 },
      isActive: true
    },
    {
      id: 'currency_format',
      field: 'currency',
      type: 'format',
      description: 'Currency code must be 3 characters',
      severity: 'error',
      rule: { pattern: '^[A-Z]{3}$' },
      isActive: true
    },
    {
      id: 'type_valid',
      field: 'type',
      type: 'format',
      description: 'Transaction type must be valid',
      severity: 'error',
      rule: { pattern: '^(income|expense|transfer)$' },
      isActive: true
    }
  ];

  async validateTransaction(
    transaction: Record<string, any>,
    customRules: ValidationRule[] = []
  ): Promise<TransactionValidationReport> {
    
    const allRules = [...this.defaultRules, ...customRules].filter(rule => rule.isActive);
    const results: ValidationResult[] = [];
    
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    // Apply each validation rule
    for (const rule of allRules) {
      const result = await this.applyValidationRule(transaction, rule);
      if (result) {
        results.push(result);
        
        switch (result.severity) {
          case 'error':
            errorCount++;
            break;
          case 'warning':
            warningCount++;
            break;
          case 'info':
            infoCount++;
            break;
        }
      }
    }

    return {
      transactionId: transaction.id || 'unknown',
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      results,
      cleaned: false
    };
  }

  private async applyValidationRule(
    transaction: Record<string, any>,
    rule: ValidationRule
  ): Promise<ValidationResult | null> {
    
    const fieldValue = transaction[rule.field];
    
    try {
      switch (rule.type) {
        case 'required':
          return this.validateRequired(fieldValue, rule);
        
        case 'format':
          return this.validateFormat(fieldValue, rule);
        
        case 'range':
          return this.validateRange(fieldValue, rule);
        
        case 'custom':
          return this.validateCustom(fieldValue, rule, transaction);
        
        default:
          return null;
      }
    } catch (error) {
      return {
        field: rule.field,
        value: fieldValue,
        isValid: false,
        severity: 'error',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ruleId: rule.id
      };
    }
  }

  private validateRequired(value: any, rule: ValidationRule): ValidationResult | null {
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '');
    
    if (isEmpty && !rule.rule.allowEmpty) {
      return {
        field: rule.field,
        value,
        isValid: false,
        severity: rule.severity,
        message: rule.description,
        ruleId: rule.id,
        suggestedFix: this.getSuggestedFix(rule.field, value)
      };
    }
    
    return null;
  }

  private validateFormat(value: any, rule: ValidationRule): ValidationResult | null {
    if (value === null || value === undefined) return null;
    
    const stringValue = String(value);
    
    // Date format validation
    if (rule.rule.dateFormat) {
      const date = new Date(stringValue);
      if (isNaN(date.getTime())) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: rule.description,
          ruleId: rule.id,
          suggestedFix: this.fixDateFormat(stringValue)
        };
      }
    }
    
    // Pattern validation
    if (rule.rule.pattern) {
      const regex = new RegExp(rule.rule.pattern);
      if (!regex.test(stringValue)) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: rule.description,
          ruleId: rule.id,
          suggestedFix: this.getSuggestedFix(rule.field, value)
        };
      }
    }
    
    return null;
  }

  private validateRange(value: any, rule: ValidationRule): ValidationResult | null {
    if (value === null || value === undefined) return null;
    
    // Numeric range validation
    if (typeof rule.rule.min === 'number' || typeof rule.rule.max === 'number') {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      
      if (isNaN(numValue)) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: 'error',
          message: `${rule.field} must be a valid number`,
          ruleId: rule.id
        };
      }
      
      if (typeof rule.rule.min === 'number' && numValue < rule.rule.min) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (minimum: ${rule.rule.min})`,
          ruleId: rule.id,
          suggestedFix: rule.rule.min
        };
      }
      
      if (typeof rule.rule.max === 'number' && numValue > rule.rule.max) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (maximum: ${rule.rule.max})`,
          ruleId: rule.id
        };
      }
    }
    
    // Date range validation
    if (rule.rule.minDate || rule.rule.maxDate) {
      const dateValue = new Date(String(value));
      
      if (isNaN(dateValue.getTime())) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: 'error',
          message: `${rule.field} must be a valid date`,
          ruleId: rule.id
        };
      }
      
      if (rule.rule.minDate && dateValue < new Date(rule.rule.minDate)) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (minimum date: ${rule.rule.minDate})`,
          ruleId: rule.id
        };
      }
      
      if (rule.rule.maxDate && dateValue > new Date(rule.rule.maxDate)) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (maximum date: ${rule.rule.maxDate})`,
          ruleId: rule.id
        };
      }
    }
    
    // String length validation
    if (typeof value === 'string') {
      if (typeof rule.rule.min === 'number' && value.length < rule.rule.min) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (minimum length: ${rule.rule.min})`,
          ruleId: rule.id
        };
      }
      
      if (typeof rule.rule.max === 'number' && value.length > rule.rule.max) {
        return {
          field: rule.field,
          value,
          isValid: false,
          severity: rule.severity,
          message: `${rule.description} (maximum length: ${rule.rule.max})`,
          ruleId: rule.id,
          suggestedFix: value.substring(0, rule.rule.max)
        };
      }
    }
    
    return null;
  }

  private validateCustom(
    value: any,
    rule: ValidationRule,
    transaction: Record<string, any>
  ): ValidationResult | null {
    // Custom validation logic would go here
    // For now, return null as we haven't implemented custom functions
    return null;
  }

  private getSuggestedFix(field: string, value: any): any {
    switch (field) {
      case 'currency':
        if (typeof value === 'string' && value.length > 0) {
          return value.toUpperCase().substring(0, 3).padEnd(3, 'P');
        }
        return 'GBP';
      
      case 'type':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue.includes('income') || lowerValue.includes('credit')) return 'income';
          if (lowerValue.includes('expense') || lowerValue.includes('debit')) return 'expense';
          if (lowerValue.includes('transfer')) return 'transfer';
        }
        return 'expense';
      
      case 'amount':
        if (typeof value === 'string') {
          const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
          return isNaN(numericValue) ? 0 : Math.abs(numericValue);
        }
        return Math.abs(Number(value)) || 0;
      
      default:
        return null;
    }
  }

  private fixDateFormat(dateString: string): string | null {
    // Try common date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY or MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/ // DD.MM.YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        try {
          // Assume UK format (DD/MM/YYYY) for ambiguous cases
          const [, part1, part2, part3] = match;
          
          if (format === formats[2]) { // YYYY-MM-DD
            return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          } else {
            // Convert to YYYY-MM-DD
            const day = parseInt(part1);
            const month = parseInt(part2);
            const year = parseInt(part3);
            
            if (day <= 12 && month > 12) {
              // Likely MM/DD/YYYY
              return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
            } else {
              // Likely DD/MM/YYYY
              return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  async cleanTransaction(
    transaction: Record<string, any>
  ): Promise<{
    cleanedTransaction: Record<string, any>;
    cleaningResults: Record<string, DataCleaningResult>;
  }> {
    
    const cleanedTransaction = { ...transaction };
    const cleaningResults: Record<string, DataCleaningResult> = {};

    // Clean amount
    if (transaction.amount !== undefined) {
      const cleaningResult = this.cleanAmount(transaction.amount);
      cleanedTransaction.amount = cleaningResult.cleanedValue;
      cleaningResults.amount = cleaningResult;
    }

    // Clean description
    if (transaction.description !== undefined) {
      const cleaningResult = this.cleanDescription(transaction.description);
      cleanedTransaction.description = cleaningResult.cleanedValue;
      cleaningResults.description = cleaningResult;
    }

    // Clean date
    if (transaction.date !== undefined) {
      const cleaningResult = this.cleanDate(transaction.date);
      cleanedTransaction.date = cleaningResult.cleanedValue;
      cleaningResults.date = cleaningResult;
    }

    // Clean currency
    if (transaction.currency !== undefined) {
      const cleaningResult = this.cleanCurrency(transaction.currency);
      cleanedTransaction.currency = cleaningResult.cleanedValue;
      cleaningResults.currency = cleaningResult;
    }

    // Clean merchant
    if (transaction.merchant !== undefined) {
      const cleaningResult = this.cleanMerchant(transaction.merchant);
      cleanedTransaction.merchant = cleaningResult.cleanedValue;
      cleaningResults.merchant = cleaningResult;
    }

    // Clean type
    if (transaction.type !== undefined) {
      const cleaningResult = this.cleanTransactionType(transaction.type);
      cleanedTransaction.type = cleaningResult.cleanedValue;
      cleaningResults.type = cleaningResult;
    }

    return { cleanedTransaction, cleaningResults };
  }

  private cleanAmount(amount: any): DataCleaningResult {
    const originalValue = amount;
    const modifications: string[] = [];
    let cleanedValue = amount;
    let confidence = 1.0;

    if (typeof amount === 'string') {
      // Remove currency symbols and formatting
      cleanedValue = amount.replace(/[£$€¥,\s]/g, '');
      
      // Handle negative indicators
      if (amount.includes('(') && amount.includes(')')) {
        cleanedValue = cleanedValue.replace(/[()]/g, '');
        cleanedValue = -parseFloat(cleanedValue);
        modifications.push('Converted parentheses to negative');
      } else if (amount.toLowerCase().includes('cr')) {
        cleanedValue = parseFloat(cleanedValue.replace(/cr/gi, ''));
        modifications.push('Removed credit indicator');
      } else if (amount.toLowerCase().includes('dr')) {
        cleanedValue = -parseFloat(cleanedValue.replace(/dr/gi, ''));
        modifications.push('Converted debit indicator to negative');
      } else {
        cleanedValue = parseFloat(cleanedValue);
      }

      if (isNaN(cleanedValue)) {
        cleanedValue = 0;
        confidence = 0.1;
        modifications.push('Could not parse amount, set to 0');
      } else {
        modifications.push('Removed formatting characters');
      }
    } else if (typeof amount === 'number') {
      cleanedValue = amount;
    } else {
      cleanedValue = 0;
      confidence = 0.1;
      modifications.push('Invalid amount type, set to 0');
    }

    // Ensure positive amount
    if (cleanedValue < 0) {
      cleanedValue = Math.abs(cleanedValue);
      modifications.push('Converted to positive amount');
    }

    return {
      originalValue,
      cleanedValue,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  private cleanDescription(description: any): DataCleaningResult {
    const originalValue = description;
    const modifications: string[] = [];
    let cleanedValue = String(description || '');
    let confidence = 1.0;

    if (cleanedValue.length === 0) {
      cleanedValue = 'Transaction';
      confidence = 0.5;
      modifications.push('Added default description');
    } else {
      // Clean whitespace
      const originalLength = cleanedValue.length;
      cleanedValue = cleanedValue.trim().replace(/\s+/g, ' ');
      
      if (cleanedValue.length !== originalLength) {
        modifications.push('Normalized whitespace');
      }

      // Remove excessive special characters
      const cleaned = cleanedValue.replace(/[^\w\s.,()-]/g, '');
      if (cleaned !== cleanedValue) {
        cleanedValue = cleaned;
        modifications.push('Removed special characters');
      }

      // Truncate if too long
      if (cleanedValue.length > 500) {
        cleanedValue = cleanedValue.substring(0, 500);
        modifications.push('Truncated to 500 characters');
      }
    }

    return {
      originalValue,
      cleanedValue,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  private cleanDate(date: any): DataCleaningResult {
    const originalValue = date;
    const modifications: string[] = [];
    let cleanedValue = date;
    let confidence = 1.0;

    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        cleanedValue = new Date().toISOString().split('T')[0];
        confidence = 0.3;
        modifications.push('Invalid date, set to today');
      } else {
        cleanedValue = date.toISOString().split('T')[0];
      }
    } else if (typeof date === 'string') {
      const fixedDate = this.fixDateFormat(date);
      if (fixedDate) {
        cleanedValue = fixedDate;
        modifications.push('Fixed date format');
      } else {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          cleanedValue = new Date().toISOString().split('T')[0];
          confidence = 0.3;
          modifications.push('Could not parse date, set to today');
        } else {
          cleanedValue = parsedDate.toISOString().split('T')[0];
        }
      }
    } else {
      cleanedValue = new Date().toISOString().split('T')[0];
      confidence = 0.3;
      modifications.push('Invalid date type, set to today');
    }

    return {
      originalValue,
      cleanedValue,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  private cleanCurrency(currency: any): DataCleaningResult {
    const originalValue = currency;
    const modifications: string[] = [];
    let cleanedValue = String(currency || '').toUpperCase().trim();
    let confidence = 1.0;

    if (cleanedValue.length === 0) {
      cleanedValue = 'GBP';
      confidence = 0.7;
      modifications.push('Set default currency to GBP');
    } else if (cleanedValue.length !== 3) {
      // Try to map common currency representations
      const currencyMap: Record<string, string> = {
        '£': 'GBP',
        'POUND': 'GBP',
        'POUNDS': 'GBP',
        '$': 'USD',
        'DOLLAR': 'USD',
        'DOLLARS': 'USD',
        '€': 'EUR',
        'EURO': 'EUR',
        'EUROS': 'EUR'
      };

      if (currencyMap[cleanedValue]) {
        cleanedValue = currencyMap[cleanedValue];
        modifications.push('Mapped currency symbol to code');
      } else {
        cleanedValue = 'GBP';
        confidence = 0.5;
        modifications.push('Unknown currency, set to GBP');
      }
    }

    return {
      originalValue,
      cleanedValue,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  private cleanMerchant(merchant: any): DataCleaningResult {
    const originalValue = merchant;
    const modifications: string[] = [];
    let cleanedValue = String(merchant || '').trim();
    let confidence = 1.0;

    if (cleanedValue.length > 0) {
      // Remove common payment processing prefixes
      const prefixes = [
        'CARD PAYMENT TO ',
        'PAYMENT TO ',
        'TXN ',
        'POS ',
        'CONTACTLESS '
      ];

      for (const prefix of prefixes) {
        if (cleanedValue.toUpperCase().startsWith(prefix)) {
          cleanedValue = cleanedValue.substring(prefix.length).trim();
          modifications.push(`Removed prefix: ${prefix.trim()}`);
          break;
        }
      }

      // Clean up formatting
      cleanedValue = cleanedValue
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s&.-]/g, '')
        .trim();

      // Convert to title case
      cleanedValue = cleanedValue
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      if (cleanedValue !== String(merchant || '').trim()) {
        modifications.push('Cleaned and formatted merchant name');
      }
    }

    return {
      originalValue,
      cleanedValue: cleanedValue || undefined,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  private cleanTransactionType(type: any): DataCleaningResult {
    const originalValue = type;
    const modifications: string[] = [];
    let cleanedValue = String(type || '').toLowerCase().trim();
    let confidence = 1.0;

    const typeMap: Record<string, string> = {
      'debit': 'expense',
      'credit': 'income',
      'deposit': 'income',
      'withdrawal': 'expense',
      'payment': 'expense',
      'receipt': 'income',
      'in': 'income',
      'out': 'expense'
    };

    if (typeMap[cleanedValue]) {
      cleanedValue = typeMap[cleanedValue];
      modifications.push('Mapped type to standard value');
    } else if (!['income', 'expense', 'transfer'].includes(cleanedValue)) {
      cleanedValue = 'expense';
      confidence = 0.6;
      modifications.push('Unknown type, defaulted to expense');
    }

    return {
      originalValue,
      cleanedValue,
      wasModified: modifications.length > 0,
      modifications,
      confidence
    };
  }

  async validateAndCleanTransaction(
    transaction: Record<string, any>
  ): Promise<TransactionValidationReport> {
    
    // First clean the transaction
    const { cleanedTransaction, cleaningResults } = await this.cleanTransaction(transaction);
    
    // Then validate the cleaned transaction
    const validationReport = await this.validateTransaction(cleanedTransaction);
    
    // Add cleaning results to the report
    validationReport.cleaned = Object.values(cleaningResults).some(result => result.wasModified);
    validationReport.cleaningResults = cleaningResults;

    return validationReport;
  }

  async validateTransactionBatch(
    transactions: Record<string, any>[],
    options: {
      autoClean?: boolean;
      stopOnFirstError?: boolean;
      maxErrors?: number;
    } = {}
  ): Promise<{
    reports: TransactionValidationReport[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      cleaned: number;
      errors: number;
      warnings: number;
    };
  }> {
    
    const reports: TransactionValidationReport[] = [];
    let errorCount = 0;
    
    const summary = {
      total: transactions.length,
      valid: 0,
      invalid: 0,
      cleaned: 0,
      errors: 0,
      warnings: 0
    };

    for (const transaction of transactions) {
      try {
        const report = options.autoClean 
          ? await this.validateAndCleanTransaction(transaction)
          : await this.validateTransaction(transaction);
        
        reports.push(report);
        
        if (report.isValid) {
          summary.valid++;
        } else {
          summary.invalid++;
        }
        
        if (report.cleaned) {
          summary.cleaned++;
        }
        
        summary.errors += report.errorCount;
        summary.warnings += report.warningCount;
        
        // Check stopping conditions
        if (options.stopOnFirstError && !report.isValid) {
          break;
        }
        
        if (options.maxErrors && summary.errors >= options.maxErrors) {
          break;
        }
        
      } catch (error) {
        errorCount++;
        reports.push({
          transactionId: transaction.id || 'unknown',
          isValid: false,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          results: [{
            field: 'general',
            value: transaction,
            isValid: false,
            severity: 'error',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ruleId: 'validation_error'
          }],
          cleaned: false
        });
        
        summary.invalid++;
        summary.errors++;
      }
    }

    return { reports, summary };
  }
}