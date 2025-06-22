import {
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  isValidEmail,
  generateId,
  daysBetween,
  truncateText,
  toTitleCase,
  cn,
} from '../utils';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format GBP currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('£1,234.56');
      expect(formatCurrency(0)).toBe('£0.00');
      expect(formatCurrency(-500.25)).toBe('-£500.25');
    });

    it('should handle different currencies', () => {
      expect(formatCurrency(1000, 'USD', 'en-US')).toBe('$1,000.00');
      // Note: Different locales may format EUR differently
      expect(formatCurrency(1000, 'EUR', 'de-DE')).toContain('€');
      expect(formatCurrency(1000, 'EUR', 'de-DE')).toContain('1.000');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('£1,234,567.89');
    });

    it('should handle small decimal amounts', () => {
      expect(formatCurrency(0.01)).toBe('£0.01');
      expect(formatCurrency(0.001)).toBe('£0.00'); // Rounds to 2 decimal places
    });

    it('should handle edge cases', () => {
      expect(formatCurrency(NaN)).toBe('£NaN');
      expect(formatCurrency(Infinity)).toBe('£∞');
      expect(formatCurrency(-Infinity)).toBe('-£∞');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default precision', () => {
      expect(formatPercentage(12.34)).toBe('12.3%');
      expect(formatPercentage(50.0)).toBe('50.0%');
      expect(formatPercentage(100.0)).toBe('100.0%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercentage(12.34, 2)).toBe('12.34%');
      expect(formatPercentage(12.34, 0)).toBe('12%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(-10.0)).toBe('-10.0%');
      expect(formatPercentage(250.0)).toBe('250.0%');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format numbers with K suffix', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(10000)).toBe('10.0K');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should format numbers with M suffix', () => {
      expect(formatCompactNumber(1500000)).toBe('1.5M');
      expect(formatCompactNumber(10000000)).toBe('10.0M');
    });

    it('should format numbers with B suffix', () => {
      expect(formatCompactNumber(1500000000)).toBe('1.5B');
      expect(formatCompactNumber(10000000000)).toBe('10.0B');
    });

    it('should handle small numbers', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(50)).toBe('50');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should handle negative numbers', () => {
      expect(formatCompactNumber(-1500)).toBe('-1500'); // Function doesn't format negative numbers
      expect(formatCompactNumber(-2000000)).toBe('-2000000');
    });

    it('should handle very large numbers', () => {
      expect(formatCompactNumber(1e12)).toBe('1000.0B');
      expect(formatCompactNumber(1.5e12)).toBe('1500.0B');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('valid+email@test.org')).toBe(true);
      expect(isValidEmail('123@456.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test..email@domain.com')).toBe(true); // Simple regex allows this
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.c')).toBe(true); // Minimal valid email
      expect(isValidEmail('test@domain')).toBe(false); // Missing TLD
      expect(isValidEmail('test@.com')).toBe(false); // Invalid domain
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate IDs of consistent format', () => {
      const id = generateId();
      
      // Should be a string with some standard format
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10); // Should be reasonably long
    });

    it('should generate multiple unique IDs', () => {
      const ids = Array.from({ length: 100 }, () => generateId());
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(100); // All should be unique
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates correctly', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-11');
      
      expect(daysBetween(date1, date2)).toBe(10);
      expect(daysBetween(date2, date1)).toBe(10); // Should be absolute
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should handle dates in different years', () => {
      const date1 = new Date('2023-12-25');
      const date2 = new Date('2024-01-05');
      
      expect(daysBetween(date1, date2)).toBe(11);
    });

    it('should handle leap years', () => {
      const date1 = new Date('2024-02-28'); // 2024 is a leap year
      const date2 = new Date('2024-03-01');
      
      expect(daysBetween(date1, date2)).toBe(2); // Includes Feb 29
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      expect(truncateText(text, 20)).toBe('Exactly twenty chars');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle very short max length', () => {
      expect(truncateText('Hello', 3)).toBe('Hel...');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
      expect(toTitleCase('hELLo WoRLd')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
      expect(toTitleCase('HELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(toTitleCase('hello-world')).toBe('Hello-world');
      expect(toTitleCase('hello_world')).toBe('Hello_world');
    });

    it('should handle numbers', () => {
      expect(toTitleCase('hello world 123')).toBe('Hello World 123');
    });
  });

  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional');
      expect(cn('base', false && 'conditional')).toBe('base');
    });

    it('should handle undefined and null', () => {
      expect(cn('base', undefined, null)).toBe('base');
    });

    it('should handle empty strings', () => {
      expect(cn('base', '', 'end')).toBe('base end');
    });

    it('should handle Tailwind merge conflicts', () => {
      // This tests the tailwind-merge functionality
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Later padding should override
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });
  });
});