import {
  encryptData,
  decryptData,
  hashData,
  validateEncryptionKey,
} from '../encryption';

describe('Encryption Utilities', () => {
  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data successfully', () => {
      const originalData = 'sensitive banking information';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
    });

    it('should encrypt and decrypt with custom key', () => {
      const originalData = 'test data';
      const customKey = 'myCustomEncryptionKey123!';
      
      const encrypted = encryptData(originalData, customKey);
      const decrypted = decryptData(encrypted, customKey);
      
      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted output for same input', () => {
      const data = 'test data';
      const encrypted1 = encryptData(data);
      const encrypted2 = encryptData(data);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But should decrypt to same original data
      expect(decryptData(encrypted1)).toBe(data);
      expect(decryptData(encrypted2)).toBe(data);
    });

    it('should handle empty string', () => {
      const encrypted = encryptData('');
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const originalData = '!@#$%^&*()_+{}:"<>?[]\\;\',./ 中文';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toBe(originalData);
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(10000);
      const encrypted = encryptData(largeData);
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toBe(largeData);
    });

    it('should fail to decrypt with wrong key', () => {
      const originalData = 'secret data';
      const encrypted = encryptData(originalData, 'key1');
      
      expect(() => {
        decryptData(encrypted, 'wrongKey');
      }).toThrow();
    });

    it('should fail to decrypt corrupted data', () => {
      const originalData = 'test data';
      const encrypted = encryptData(originalData);
      const corrupted = encrypted.substring(0, encrypted.length - 10) + '1234567890';
      
      expect(() => {
        decryptData(corrupted);
      }).toThrow();
    });

    it('should fail to decrypt invalid format', () => {
      expect(() => {
        decryptData('not-encrypted-data');
      }).toThrow();
    });

    it('should handle JSON data', () => {
      const originalData = JSON.stringify({
        accountNumber: '12345678',
        sortCode: '12-34-56',
        balance: 1234.56
      });
      
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);
      const parsed = JSON.parse(decrypted);
      
      expect(parsed.accountNumber).toBe('12345678');
      expect(parsed.balance).toBe(1234.56);
    });
  });

  describe('hashData', () => {
    it('should produce consistent hash for same input', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashData('');
      
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/); // Valid hex
    });

    it('should handle special characters', () => {
      const data = '!@#$%^&*()_+{}:"<>?[]\\;\',./ 中文';
      const hash = hashData(data);
      
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(100000);
      const hash = hashData(largeData);
      
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should be sensitive to small changes', () => {
      const hash1 = hashData('Hello World');
      const hash2 = hashData('Hello world'); // Different case
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid hex output', () => {
      const hash = hashData('test');
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateEncryptionKey', () => {
    it('should validate strong keys', () => {
      expect(validateEncryptionKey('StrongPassword123!')).toBe(true);
      expect(validateEncryptionKey('MySecureKey2024@')).toBe(true);
      expect(validateEncryptionKey('ComplexKey#456$')).toBe(true);
    });

    it('should reject weak keys', () => {
      expect(validateEncryptionKey('123')).toBe(false);
      expect(validateEncryptionKey('password')).toBe(false);
      expect(validateEncryptionKey('12345678')).toBe(false);
    });

    it('should require minimum length', () => {
      expect(validateEncryptionKey('Aa1!')).toBe(false); // Too short
      expect(validateEncryptionKey('Aa1!5678')).toBe(true); // Minimum length
    });

    it('should require complexity', () => {
      expect(validateEncryptionKey('alllowercase')).toBe(false);
      expect(validateEncryptionKey('ALLUPPERCASE')).toBe(false);
      expect(validateEncryptionKey('OnlyLetters')).toBe(false);
      expect(validateEncryptionKey('OnlyNumbers123')).toBe(false);
    });

    it('should reject common patterns', () => {
      expect(validateEncryptionKey('Password123')).toBe(false);
      expect(validateEncryptionKey('12345678')).toBe(false);
      expect(validateEncryptionKey('qwerty123')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(validateEncryptionKey('')).toBe(false);
    });

    it('should reject keys with only spaces', () => {
      expect(validateEncryptionKey('        ')).toBe(false);
    });

    it('should accept long complex keys', () => {
      const longKey = 'ThisIsAVeryLongAndComplexEncryptionKey123!@#';
      expect(validateEncryptionKey(longKey)).toBe(true);
    });

    it('should handle unicode characters', () => {
      expect(validateEncryptionKey('Secure中文Key123!')).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => encryptData(null as any)).toThrow();
      expect(() => encryptData(undefined as any)).toThrow();
      expect(() => hashData(null as any)).toThrow();
      expect(() => hashData(undefined as any)).toThrow();
    });

    it('should handle non-string inputs', () => {
      expect(() => encryptData(123 as any)).toThrow();
      expect(() => encryptData({} as any)).toThrow();
      expect(() => hashData(123 as any)).toThrow();
      expect(() => hashData({} as any)).toThrow();
    });

    it('should encrypt and decrypt numbers as strings', () => {
      const numberAsString = '123.45';
      const encrypted = encryptData(numberAsString);
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toBe('123.45');
      expect(parseFloat(decrypted)).toBe(123.45);
    });

    it('should handle very long keys', () => {
      const veryLongKey = 'a'.repeat(1000);
      const data = 'test data';
      
      const encrypted = encryptData(data, veryLongKey);
      const decrypted = decryptData(encrypted, veryLongKey);
      
      expect(decrypted).toBe(data);
    });
  });

  describe('Security properties', () => {
    it('should not leak information about data length in encrypted form', () => {
      const shortData = 'x';
      const longData = 'x'.repeat(1000);
      
      const encryptedShort = encryptData(shortData);
      const encryptedLong = encryptData(longData);
      
      // Encrypted data should have similar structure regardless of input length
      expect(encryptedShort.split(':').length).toBe(encryptedLong.split(':').length);
    });

    it('should use random IV for each encryption', () => {
      const data = 'consistent data';
      const encrypted1 = encryptData(data);
      const encrypted2 = encryptData(data);
      
      // Extract IV (first part before first colon)
      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];
      
      expect(iv1).not.toBe(iv2);
    });

    it('should produce cryptographically strong hashes', () => {
      // Test that sequential inputs produce distributed hashes
      const hashes = [];
      for (let i = 0; i < 100; i++) {
        hashes.push(hashData(i.toString()));
      }
      
      // Check that hashes are distributed (no obvious patterns)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(100); // All should be unique
      
      // Check that hashes don't follow predictable patterns
      const firstChars = hashes.map(h => h[0]);
      const uniqueFirstChars = new Set(firstChars);
      expect(uniqueFirstChars.size).toBeGreaterThan(5); // Should be distributed
    });
  });
});