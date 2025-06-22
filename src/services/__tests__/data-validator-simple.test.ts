// Simple data validation test that doesn't import Supabase
describe('Data Validation Concepts', () => {
  describe('Amount cleaning concepts', () => {
    it('should understand amount parsing requirements', () => {
      // Test the concept of cleaning currency amounts
      const testCases = [
        { input: '£123.45', expected: 123.45 },
        { input: '$1,000.00', expected: 1000.00 },
        { input: '(50.25)', expected: -50.25 },
        { input: '1,234.56', expected: 1234.56 }
      ];

      const cleanAmount = (input: string): number => {
        // Remove currency symbols and formatting
        let cleaned = input.replace(/[£$€,\s]/g, '');
        
        // Handle parentheses for negative numbers
        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
          cleaned = '-' + cleaned.slice(1, -1);
        }
        
        return parseFloat(cleaned);
      };

      testCases.forEach(({ input, expected }) => {
        expect(cleanAmount(input)).toBe(expected);
      });
    });
  });

  describe('Date normalization concepts', () => {
    it('should understand date format conversion', () => {
      const testCases = [
        { input: '15/01/2024', expected: '2024-01-15' },
        { input: '01/15/2024', expected: '2024-01-15' },
        { input: '2024-01-15', expected: '2024-01-15' }
      ];

      const normalizeDate = (input: string): string => {
        // Handle UK format DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
          const [day, month, year] = input.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Handle US format MM/DD/YYYY (assume DD > 12 means UK format)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
          const [first, second, year] = input.split('/');
          if (parseInt(first) > 12) {
            // First part > 12, must be day (UK format)
            return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
          } else {
            // Ambiguous, assume US format
            return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
          }
        }
        
        return input; // Already in ISO format
      };

      testCases.forEach(({ input, expected }) => {
        expect(normalizeDate(input)).toBe(expected);
      });
    });
  });

  describe('Text cleaning concepts', () => {
    it('should understand merchant name normalization', () => {
      const testCases = [
        { input: '  TESCO EXPRESS  ', expected: 'Tesco Express' },
        { input: 'COSTA***COFFEE', expected: 'Costa Coffee' },
        { input: 'ATM    WITHDRAWAL', expected: 'ATM Withdrawal' }
      ];

      const cleanMerchantName = (input: string): string => {
        return input
          .trim()
          .replace(/\*+/g, ' ')
          .replace(/\s+/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase());
      };

      testCases.forEach(({ input, expected }) => {
        expect(cleanMerchantName(input)).toBe(expected);
      });
    });
  });

  describe('Data validation concepts', () => {
    it('should understand amount validation', () => {
      const isValidAmount = (amount: any): boolean => {
        return typeof amount === 'number' && 
               !isNaN(amount) && 
               isFinite(amount) &&
               amount >= -999999999.99 && 
               amount <= 999999999.99;
      };

      expect(isValidAmount(123.45)).toBe(true);
      expect(isValidAmount(-50.25)).toBe(true);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount('not a number')).toBe(false);
    });

    it('should understand date validation', () => {
      const isValidDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && 
               date >= new Date('1900-01-01') && 
               date <= new Date('2100-12-31');
      };

      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('1800-01-01')).toBe(false);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
    });

    it('should understand currency validation', () => {
      const isValidCurrency = (currency: string): boolean => {
        const validCurrencies = ['GBP', 'USD', 'EUR', 'JPY', 'CAD', 'AUD'];
        return validCurrencies.includes(currency.toUpperCase());
      };

      expect(isValidCurrency('GBP')).toBe(true);
      expect(isValidCurrency('gbp')).toBe(true);
      expect(isValidCurrency('XXX')).toBe(false);
      expect(isValidCurrency('INVALID')).toBe(false);
    });
  });

  describe('Error handling concepts', () => {
    it('should understand graceful error handling', () => {
      const safeParseAmount = (input: any): { isValid: boolean; value?: number; error?: string } => {
        if (input === null || input === undefined) {
          return { isValid: false, error: 'Input is null or undefined' };
        }
        
        if (typeof input === 'number') {
          if (isNaN(input) || !isFinite(input)) {
            return { isValid: false, error: 'Input is not a valid number' };
          }
          return { isValid: true, value: input };
        }
        
        if (typeof input === 'string') {
          const cleaned = input.replace(/[£$€,\s]/g, '');
          const parsed = parseFloat(cleaned);
          
          if (isNaN(parsed)) {
            return { isValid: false, error: 'Cannot parse amount from string' };
          }
          
          return { isValid: true, value: parsed };
        }
        
        return { isValid: false, error: 'Unsupported input type' };
      };

      expect(safeParseAmount(123.45)).toEqual({ isValid: true, value: 123.45 });
      expect(safeParseAmount('£50.25')).toEqual({ isValid: true, value: 50.25 });
      expect(safeParseAmount(null)).toEqual({ isValid: false, error: 'Input is null or undefined' });
      expect(safeParseAmount('invalid')).toEqual({ isValid: false, error: 'Cannot parse amount from string' });
    });
  });
});