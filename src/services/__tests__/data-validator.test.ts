import {
  cleanAmount,
  cleanDescription,
  cleanDate,
  cleanCurrency,
  fixDateFormat,
} from '../data-validator';

describe('Data Validation and Cleaning', () => {
  describe('cleanAmount', () => {
    it('should clean valid number strings', () => {
      expect(cleanAmount('123.45')).toEqual({
        isValid: true,
        cleanValue: 123.45,
        originalValue: '123.45'
      });
      
      expect(cleanAmount('1,234.56')).toEqual({
        isValid: true,
        cleanValue: 1234.56,
        originalValue: '1,234.56'
      });
    });

    it('should clean currency symbols', () => {
      expect(cleanAmount('£123.45')).toEqual({
        isValid: true,
        cleanValue: 123.45,
        originalValue: '£123.45'
      });
      
      expect(cleanAmount('$1,000.00')).toEqual({
        isValid: true,
        cleanValue: 1000.00,
        originalValue: '$1,000.00'
      });
    });

    it('should handle negative amounts', () => {
      expect(cleanAmount('-123.45')).toEqual({
        isValid: true,
        cleanValue: -123.45,
        originalValue: '-123.45'
      });
      
      expect(cleanAmount('(123.45)')).toEqual({
        isValid: true,
        cleanValue: -123.45,
        originalValue: '(123.45)'
      });
    });

    it('should handle numeric inputs', () => {
      expect(cleanAmount(123.45)).toEqual({
        isValid: true,
        cleanValue: 123.45,
        originalValue: 123.45
      });
    });

    it('should reject invalid inputs', () => {
      const result = cleanAmount('not a number');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid amount format');
    });

    it('should reject null and undefined', () => {
      expect(cleanAmount(null).isValid).toBe(false);
      expect(cleanAmount(undefined).isValid).toBe(false);
    });

    it('should handle zero', () => {
      expect(cleanAmount('0')).toEqual({
        isValid: true,
        cleanValue: 0,
        originalValue: '0'
      });
      
      expect(cleanAmount('0.00')).toEqual({
        isValid: true,
        cleanValue: 0,
        originalValue: '0.00'
      });
    });

    it('should handle whitespace', () => {
      expect(cleanAmount('  123.45  ')).toEqual({
        isValid: true,
        cleanValue: 123.45,
        originalValue: '  123.45  '
      });
    });

    it('should handle different decimal separators', () => {
      expect(cleanAmount('123,45')).toEqual({
        isValid: true,
        cleanValue: 123.45,
        originalValue: '123,45'
      });
    });
  });

  describe('cleanDescription', () => {
    it('should clean normal descriptions', () => {
      const result = cleanDescription('Coffee Shop Purchase');
      expect(result).toEqual({
        isValid: true,
        cleanValue: 'Coffee Shop Purchase',
        originalValue: 'Coffee Shop Purchase'
      });
    });

    it('should trim whitespace', () => {
      const result = cleanDescription('  Payment to Store  ');
      expect(result).toEqual({
        isValid: true,
        cleanValue: 'Payment to Store',
        originalValue: '  Payment to Store  '
      });
    });

    it('should normalize multiple spaces', () => {
      const result = cleanDescription('ATM    WITHDRAWAL    BANK');
      expect(result).toEqual({
        isValid: true,
        cleanValue: 'ATM WITHDRAWAL BANK',
        originalValue: 'ATM    WITHDRAWAL    BANK'
      });
    });

    it('should remove special characters', () => {
      const result = cleanDescription('PAYMENT***TO***MERCHANT');
      expect(result.cleanValue).toBe('PAYMENT TO MERCHANT');
    });

    it('should handle empty strings', () => {
      const result = cleanDescription('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'A'.repeat(500);
      const result = cleanDescription(longDesc);
      expect(result.cleanValue.length).toBeLessThanOrEqual(255); // Should be truncated
    });

    it('should handle null and undefined', () => {
      expect(cleanDescription(null).isValid).toBe(false);
      expect(cleanDescription(undefined).isValid).toBe(false);
    });

    it('should normalize case', () => {
      const result = cleanDescription('tesco express london');
      expect(result.cleanValue).toBe('Tesco Express London');
    });

    it('should handle numeric strings', () => {
      const result = cleanDescription('123456789');
      expect(result).toEqual({
        isValid: true,
        cleanValue: '123456789',
        originalValue: '123456789'
      });
    });
  });

  describe('cleanDate', () => {
    it('should clean ISO date strings', () => {
      const result = cleanDate('2024-01-15');
      expect(result).toEqual({
        isValid: true,
        cleanValue: '2024-01-15',
        originalValue: '2024-01-15'
      });
    });

    it('should clean UK date format', () => {
      const result = cleanDate('15/01/2024');
      expect(result).toEqual({
        isValid: true,
        cleanValue: '2024-01-15',
        originalValue: '15/01/2024'
      });
    });

    it('should clean US date format', () => {
      const result = cleanDate('01/15/2024');
      expect(result).toEqual({
        isValid: true,
        cleanValue: '2024-01-15',
        originalValue: '01/15/2024'
      });
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const result = cleanDate(date);
      expect(result).toEqual({
        isValid: true,
        cleanValue: '2024-01-15',
        originalValue: date
      });
    });

    it('should reject invalid dates', () => {
      const result = cleanDate('not a date');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    it('should reject impossible dates', () => {
      const result = cleanDate('2024-13-32');
      expect(result.isValid).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(cleanDate(null).isValid).toBe(false);
      expect(cleanDate(undefined).isValid).toBe(false);
    });

    it('should handle timestamps', () => {
      const timestamp = 1705363200000; // 2024-01-15 in milliseconds
      const result = cleanDate(timestamp);
      expect(result.isValid).toBe(true);
      expect(result.cleanValue).toBe('2024-01-15');
    });

    it('should handle various formats', () => {
      const formats = [
        '2024-01-15',
        '15-01-2024',
        '01-15-2024',
        '15.01.2024',
        '15 Jan 2024',
        'Jan 15, 2024'
      ];
      
      formats.forEach(format => {
        const result = cleanDate(format);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('cleanCurrency', () => {
    it('should clean valid currency codes', () => {
      expect(cleanCurrency('GBP')).toEqual({
        isValid: true,
        cleanValue: 'GBP',
        originalValue: 'GBP'
      });
      
      expect(cleanCurrency('USD')).toEqual({
        isValid: true,
        cleanValue: 'USD',
        originalValue: 'USD'
      });
    });

    it('should normalize case', () => {
      expect(cleanCurrency('gbp')).toEqual({
        isValid: true,
        cleanValue: 'GBP',
        originalValue: 'gbp'
      });
    });

    it('should map currency symbols', () => {
      expect(cleanCurrency('£')).toEqual({
        isValid: true,
        cleanValue: 'GBP',
        originalValue: '£'
      });
      
      expect(cleanCurrency('$')).toEqual({
        isValid: true,
        cleanValue: 'USD',
        originalValue: '$'
      });
      
      expect(cleanCurrency('€')).toEqual({
        isValid: true,
        cleanValue: 'EUR',
        originalValue: '€'
      });
    });

    it('should reject invalid currencies', () => {
      const result = cleanCurrency('XXX');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid currency');
    });

    it('should handle null and undefined', () => {
      expect(cleanCurrency(null).isValid).toBe(false);
      expect(cleanCurrency(undefined).isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(cleanCurrency('  GBP  ')).toEqual({
        isValid: true,
        cleanValue: 'GBP',
        originalValue: '  GBP  '
      });
    });

    it('should handle empty string', () => {
      const result = cleanCurrency('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('fixDateFormat', () => {
    it('should fix common UK date formats', () => {
      expect(fixDateFormat('15/01/2024')).toBe('2024-01-15');
      expect(fixDateFormat('01/01/24')).toBe('2024-01-01');
      expect(fixDateFormat('1/1/2024')).toBe('2024-01-01');
    });

    it('should fix dotted date formats', () => {
      expect(fixDateFormat('15.01.2024')).toBe('2024-01-15');
      expect(fixDateFormat('1.1.24')).toBe('2024-01-01');
    });

    it('should fix dashed formats', () => {
      expect(fixDateFormat('15-01-2024')).toBe('2024-01-15');
      expect(fixDateFormat('01-15-2024')).toBe('2024-01-15');
    });

    it('should handle already correct ISO format', () => {
      expect(fixDateFormat('2024-01-15')).toBe('2024-01-15');
    });

    it('should handle text dates', () => {
      expect(fixDateFormat('15 Jan 2024')).toBe('2024-01-15');
      expect(fixDateFormat('Jan 15, 2024')).toBe('2024-01-15');
      expect(fixDateFormat('January 15, 2024')).toBe('2024-01-15');
    });

    it('should return null for invalid formats', () => {
      expect(fixDateFormat('not a date')).toBeNull();
      expect(fixDateFormat('32/13/2024')).toBeNull();
      expect(fixDateFormat('')).toBeNull();
    });

    it('should handle two-digit years', () => {
      expect(fixDateFormat('15/01/24')).toBe('2024-01-15');
      expect(fixDateFormat('15/01/99')).toBe('1999-01-15'); // Assumes 1900s for high values
    });

    it('should handle ambiguous dates consistently', () => {
      // Should prefer DD/MM/YYYY format for UK context
      expect(fixDateFormat('02/03/2024')).toBe('2024-03-02'); // 2nd March, not 3rd February
    });

    it('should handle edge cases', () => {
      expect(fixDateFormat('29/02/2024')).toBe('2024-02-29'); // Leap year
      expect(fixDateFormat('29/02/2023')).toBeNull(); // Invalid leap year
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle various null-like inputs', () => {
      const nullLikeValues = [null, undefined, '', '   ', 'NULL', 'null'];
      
      nullLikeValues.forEach(value => {
        expect(cleanAmount(value).isValid).toBe(false);
        expect(cleanDescription(value).isValid).toBe(false);
        expect(cleanDate(value).isValid).toBe(false);
        expect(cleanCurrency(value).isValid).toBe(false);
      });
    });

    it('should handle extremely large numbers', () => {
      const largeNumber = '999999999999999.99';
      const result = cleanAmount(largeNumber);
      expect(result.isValid).toBe(true);
      expect(result.cleanValue).toBe(999999999999999.99);
    });

    it('should handle very precise decimals', () => {
      const preciseNumber = '123.123456789';
      const result = cleanAmount(preciseNumber);
      expect(result.isValid).toBe(true);
      expect(result.cleanValue).toBeCloseTo(123.12, 2); // Rounded to 2 decimal places
    });

    it('should provide helpful error messages', () => {
      expect(cleanAmount('abc').error).toContain('Invalid amount format');
      expect(cleanDate('invalid').error).toContain('Invalid date format');
      expect(cleanCurrency('XYZ').error).toContain('Invalid currency');
      expect(cleanDescription('').error).toContain('empty');
    });

    it('should preserve original values for debugging', () => {
      const result = cleanAmount('£1,234.56');
      expect(result.originalValue).toBe('£1,234.56');
      expect(result.cleanValue).toBe(1234.56);
    });
  });
});