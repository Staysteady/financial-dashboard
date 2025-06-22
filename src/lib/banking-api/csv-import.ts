import { 
  CSVImportConfig, 
  CSVImportResult, 
  ImportedTransaction 
} from '@/types/banking-api';
import { parse } from 'date-fns';

export class CSVImportService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_ROWS = 10000;

  /**
   * Parse CSV content and import transactions
   */
  static async parseCSV(
    csvContent: string,
    config: CSVImportConfig
  ): Promise<CSVImportResult> {
    try {
      // Validate file size
      if (csvContent.length > this.MAX_FILE_SIZE) {
        return {
          success: false,
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          errors: [{
            row: 0,
            error: 'File size exceeds maximum limit of 10MB'
          }],
          transactions: []
        };
      }

      // Parse CSV rows
      const rows = this.parseCSVContent(csvContent, config.delimiter);
      
      if (rows.length === 0) {
        return {
          success: false,
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          errors: [{
            row: 0,
            error: 'No data found in CSV file'
          }],
          transactions: []
        };
      }

      // Remove headers if present
      const dataRows = config.hasHeaders ? rows.slice(1) : rows;
      
      if (dataRows.length > this.MAX_ROWS) {
        return {
          success: false,
          totalRows: dataRows.length,
          successfulImports: 0,
          failedImports: dataRows.length,
          errors: [{
            row: 0,
            error: `File contains ${dataRows.length} rows, maximum allowed is ${this.MAX_ROWS}`
          }],
          transactions: []
        };
      }

      // Get column headers for validation
      const headers = config.hasHeaders ? rows[0] : [];
      const columnValidation = this.validateColumns(headers, config);
      
      if (!columnValidation.valid) {
        return {
          success: false,
          totalRows: dataRows.length,
          successfulImports: 0,
          failedImports: dataRows.length,
          errors: columnValidation.errors,
          transactions: []
        };
      }

      // Process each row
      const transactions: ImportedTransaction[] = [];
      const errors: Array<{ row: number; error: string }> = [];
      let successfulImports = 0;
      let failedImports = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = config.hasHeaders ? i + 2 : i + 1; // Account for headers

        try {
          const transaction = this.parseTransactionRow(row, config, headers);
          
          if (transaction) {
            transactions.push(transaction);
            successfulImports++;
          } else {
            failedImports++;
            errors.push({
              row: rowNumber,
              error: 'Failed to parse transaction data'
            });
          }
        } catch (error) {
          failedImports++;
          errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown parsing error'
          });
        }
      }

      return {
        success: successfulImports > 0,
        totalRows: dataRows.length,
        successfulImports,
        failedImports,
        errors,
        transactions
      };

    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        successfulImports: 0,
        failedImports: 0,
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : 'Failed to parse CSV file'
        }],
        transactions: []
      };
    }
  }

  /**
   * Parse CSV content into rows
   */
  private static parseCSVContent(content: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (line.trim() === '') continue;

      const row: string[] = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === delimiter && !inQuotes) {
          // End of field
          row.push(currentField.trim());
          currentField = '';
          i++;
        } else {
          currentField += char;
          i++;
        }
      }

      // Add the last field
      row.push(currentField.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Validate required columns exist
   */
  private static validateColumns(
    headers: string[], 
    config: CSVImportConfig
  ): { valid: boolean; errors: Array<{ row: number; error: string }> } {
    const errors: Array<{ row: number; error: string }> = [];

    if (config.hasHeaders && headers.length === 0) {
      errors.push({
        row: 1,
        error: 'No headers found in CSV file'
      });
    }

    // For files with headers, validate column names exist
    if (config.hasHeaders) {
      const requiredColumns = [
        config.dateColumn,
        config.amountColumn,
        config.descriptionColumn
      ];

      for (const column of requiredColumns) {
        if (!headers.includes(column)) {
          errors.push({
            row: 1,
            error: `Required column '${column}' not found in headers`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse a single transaction row
   */
  private static parseTransactionRow(
    row: string[],
    config: CSVImportConfig,
    headers: string[]
  ): ImportedTransaction | null {
    try {
      // Get column indices
      const dateIndex = this.getColumnIndex(config.dateColumn, headers, config.hasHeaders);
      const amountIndex = this.getColumnIndex(config.amountColumn, headers, config.hasHeaders);
      const descriptionIndex = this.getColumnIndex(config.descriptionColumn, headers, config.hasHeaders);
      const categoryIndex = config.categoryColumn ? 
        this.getColumnIndex(config.categoryColumn, headers, config.hasHeaders) : -1;
      const balanceIndex = config.balanceColumn ? 
        this.getColumnIndex(config.balanceColumn, headers, config.hasHeaders) : -1;

      // Validate row has enough columns
      const maxIndex = Math.max(dateIndex, amountIndex, descriptionIndex, categoryIndex, balanceIndex);
      if (row.length <= maxIndex) {
        throw new Error('Row does not have enough columns');
      }

      // Parse date
      const dateStr = row[dateIndex]?.trim();
      if (!dateStr) {
        throw new Error('Date field is empty');
      }

      const date = this.parseDate(dateStr, config.dateFormat);
      if (!date) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }

      // Parse amount
      const amountStr = row[amountIndex]?.trim();
      if (!amountStr) {
        throw new Error('Amount field is empty');
      }

      const amount = this.parseAmount(amountStr);
      if (isNaN(amount)) {
        throw new Error(`Invalid amount: ${amountStr}`);
      }

      // Get description
      const description = row[descriptionIndex]?.trim() || 'Unknown transaction';

      // Get optional fields
      const category = categoryIndex >= 0 ? row[categoryIndex]?.trim() : undefined;
      const balance = balanceIndex >= 0 ? this.parseAmount(row[balanceIndex]?.trim() || '') : undefined;

      // Generate external ID
      const externalId = this.generateExternalId(date, amount, description);

      return {
        externalId,
        amount,
        currency: 'GBP', // Default to GBP, could be configurable
        description,
        date: date.toISOString().split('T')[0],
        type: amount >= 0 ? 'income' : 'expense',
        category,
        balance: !isNaN(balance) ? balance : undefined,
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get column index by name or position
   */
  private static getColumnIndex(
    columnName: string,
    headers: string[],
    hasHeaders: boolean
  ): number {
    if (hasHeaders) {
      const index = headers.findIndex(header => 
        header.toLowerCase().trim() === columnName.toLowerCase().trim()
      );
      if (index === -1) {
        throw new Error(`Column '${columnName}' not found`);
      }
      return index;
    } else {
      // If no headers, assume columnName is a zero-based index
      const index = parseInt(columnName);
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid column index: ${columnName}`);
      }
      return index;
    }
  }

  /**
   * Parse date string using specified format
   */
  private static parseDate(dateStr: string, format: string): Date | null {
    try {
      // Common date formats
      const formats = [
        format,
        'dd/MM/yyyy',
        'MM/dd/yyyy',
        'yyyy-MM-dd',
        'dd-MM-yyyy',
        'MM-dd-yyyy',
        'dd.MM.yyyy',
        'MM.dd.yyyy'
      ];

      for (const fmt of formats) {
        try {
          const date = parse(dateStr, fmt, new Date());
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch {
          continue;
        }
      }

      // Try native Date parsing as fallback
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date : null;

    } catch {
      return null;
    }
  }

  /**
   * Parse amount string to number
   */
  private static parseAmount(amountStr: string): number {
    if (!amountStr) return NaN;

    // Remove common currency symbols and formatting
    let cleaned = amountStr
      .replace(/[£$€¥₹]/g, '') // Currency symbols
      .replace(/,/g, '') // Thousands separators
      .replace(/\s+/g, '') // Whitespace
      .trim();

    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    return parseFloat(cleaned);
  }

  /**
   * Generate a unique external ID for the transaction
   */
  private static generateExternalId(date: Date, amount: number, description: string): string {
    const dateStr = date.toISOString().split('T')[0];
    const hash = this.simpleHash(`${dateStr}-${amount}-${description}`);
    return `csv-import-${hash}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate CSV file format
   */
  static validateCSVFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size exceeds maximum limit of 10MB'
      };
    }

    // Check file type
    const validTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel'
    ];

    const validExtensions = ['.csv', '.txt'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidType && !hasValidExtension) {
      return {
        valid: false,
        error: 'File must be a CSV file (.csv or .txt)'
      };
    }

    return { valid: true };
  }

  /**
   * Get default CSV import configuration
   */
  static getDefaultConfig(): CSVImportConfig {
    return {
      dateColumn: 'Date',
      amountColumn: 'Amount',
      descriptionColumn: 'Description',
      categoryColumn: 'Category',
      balanceColumn: 'Balance',
      dateFormat: 'dd/MM/yyyy',
      hasHeaders: true,
      delimiter: ',',
    };
  }
}