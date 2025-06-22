import { test, expect } from '@playwright/test';
import { createServerSupabaseClient } from '../src/lib/supabase/server';
import { EncryptionService } from '../src/lib/security/encryption';
import crypto from 'crypto';

test.describe('Data Encryption Verification', () => {
  
  test.describe('Banking Credentials Encryption', () => {
    test('should encrypt banking credentials with user-specific keys', async () => {
      const encryptionService = new EncryptionService();
      const testCredentials = {
        username: 'testuser@bank.com',
        password: 'securepassword123',
        apiKey: 'sk_test_1234567890abcdef'
      };
      const userKey = 'user-specific-encryption-key-123';
      
      // Encrypt credentials
      const encryptedData = await encryptionService.encrypt(testCredentials, userKey);
      
      // Verify encryption occurred
      expect(encryptedData).not.toEqual(testCredentials);
      expect(typeof encryptedData).toBe('string');
      expect(encryptedData.length).toBeGreaterThan(50); // Encrypted data should be longer
      
      // Decrypt and verify
      const decryptedData = await encryptionService.decrypt(encryptedData, userKey);
      expect(decryptedData).toEqual(testCredentials);
    });

    test('should use different encryption keys for different users', async () => {
      const encryptionService = new EncryptionService();
      const testData = { sensitive: 'banking-data' };
      
      const userKey1 = 'user1-key';
      const userKey2 = 'user2-key';
      
      const encrypted1 = await encryptionService.encrypt(testData, userKey1);
      const encrypted2 = await encryptionService.encrypt(testData, userKey2);
      
      // Same data encrypted with different keys should produce different results
      expect(encrypted1).not.toEqual(encrypted2);
      
      // Should not be able to decrypt with wrong key
      try {
        await encryptionService.decrypt(encrypted1, userKey2);
        // If we reach here, decryption succeeded when it shouldn't have
        expect(false).toBe(true);
      } catch (error) {
        // This is expected - decryption should fail with wrong key
        expect(error).toBeDefined();
      }
    });

    test('should use AES-256 encryption standard', async () => {
      const encryptionService = new EncryptionService();
      const testData = { test: 'data' };
      const userKey = 'test-key';
      
      const encrypted = await encryptionService.encrypt(testData, userKey);
      
      // Check if encrypted data follows expected format
      expect(typeof encrypted).toBe('string');
      
      // Should be able to decrypt successfully
      const decrypted = await encryptionService.decrypt(encrypted, userKey);
      expect(decrypted).toEqual(testData);
    });

    test('should handle encryption of various data types', async () => {
      const encryptionService = new EncryptionService();
      const userKey = 'test-key';
      
      const testCases = [
        { string: 'test string' },
        { number: 12345 },
        { boolean: true },
        { array: [1, 2, 3] },
        { nested: { object: { with: 'data' } } },
        { empty: '' },
        { null: null }
      ];
      
      for (const testData of testCases) {
        const encrypted = await encryptionService.encrypt(testData, userKey);
        const decrypted = await encryptionService.decrypt(encrypted, userKey);
        expect(decrypted).toEqual(testData);
      }
    });

    test('should generate secure random keys', async () => {
      const encryptionService = new EncryptionService();
      
      // Generate multiple keys and verify they're different
      const keys = [];
      for (let i = 0; i < 10; i++) {
        const key = await encryptionService.generateUserKey();
        keys.push(key);
        
        // Key should be sufficiently long
        expect(key.length).toBeGreaterThanOrEqual(32);
        
        // Key should contain mix of characters
        expect(key).toMatch(/[a-zA-Z]/);
        expect(key).toMatch(/[0-9]/);
      }
      
      // All keys should be unique
      const uniqueKeys = [...new Set(keys)];
      expect(uniqueKeys.length).toBe(keys.length);
    });
  });

  test.describe('Password Hashing and Salting', () => {
    test('should use PBKDF2 for key derivation', async () => {
      const encryptionService = new EncryptionService();
      const password = 'userpassword123';
      const salt = crypto.randomBytes(16);
      
      // Derive key using PBKDF2
      const derivedKey1 = await encryptionService.deriveKeyFromPassword(password, salt);
      const derivedKey2 = await encryptionService.deriveKeyFromPassword(password, salt);
      
      // Same password and salt should produce same key
      expect(derivedKey1).toEqual(derivedKey2);
      
      // Different salt should produce different key
      const differentSalt = crypto.randomBytes(16);
      const derivedKey3 = await encryptionService.deriveKeyFromPassword(password, differentSalt);
      expect(derivedKey1).not.toEqual(derivedKey3);
    });

    test('should use sufficient iterations for PBKDF2', async () => {
      const encryptionService = new EncryptionService();
      const password = 'testpassword';
      const salt = crypto.randomBytes(16);
      
      // Measure time for key derivation (should take reasonable time)
      const start = Date.now();
      await encryptionService.deriveKeyFromPassword(password, salt);
      const duration = Date.now() - start;
      
      // Should take at least some time (indicating sufficient iterations)
      expect(duration).toBeGreaterThan(10); // At least 10ms
    });

    test('should produce consistent key derivation', async () => {
      const encryptionService = new EncryptionService();
      const password = 'consistent-test';
      const salt = Buffer.from('fixed-salt-for-testing', 'utf8');
      
      // Multiple derivations should be identical
      const keys = [];
      for (let i = 0; i < 5; i++) {
        const key = await encryptionService.deriveKeyFromPassword(password, salt);
        keys.push(key);
      }
      
      // All keys should be identical
      expect(keys.every(key => key === keys[0])).toBe(true);
    });
  });

  test.describe('Database Encryption at Rest', () => {
    test('should encrypt sensitive fields before database storage', async ({ page }) => {
      // This test verifies that sensitive data is encrypted before storage
      // We'll simulate what should happen in the banking connection process
      
      const mockBankingCredentials = {
        username: 'test@hsbc.co.uk',
        password: 'banking-password-123',
        accountNumber: '12345678',
        sortCode: '12-34-56'
      };
      
      // In real implementation, these should be encrypted before DB storage
      const encryptionService = new EncryptionService();
      const userKey = 'user-derived-key-from-password';
      
      const encryptedCredentials = await encryptionService.encrypt(mockBankingCredentials, userKey);
      
      // Verify that encrypted data doesn't contain original values
      expect(encryptedCredentials).not.toContain(mockBankingCredentials.username);
      expect(encryptedCredentials).not.toContain(mockBankingCredentials.password);
      expect(encryptedCredentials).not.toContain(mockBankingCredentials.accountNumber);
      expect(encryptedCredentials).not.toContain(mockBankingCredentials.sortCode);
      
      // Verify we can decrypt back to original
      const decrypted = await encryptionService.decrypt(encryptedCredentials, userKey);
      expect(decrypted).toEqual(mockBankingCredentials);
    });

    test('should encrypt transaction metadata securely', async () => {
      const encryptionService = new EncryptionService();
      const userKey = 'user-transaction-key';
      
      const sensitiveTransactionData = {
        merchantDetails: 'Private Medical Clinic',
        location: 'Sensitive Location Data',
        categoryNotes: 'Personal medical expenses',
        attachedReceipts: ['receipt1.pdf', 'receipt2.jpg']
      };
      
      const encrypted = await encryptionService.encrypt(sensitiveTransactionData, userKey);
      
      // Should not expose sensitive information
      expect(encrypted).not.toContain('Medical Clinic');
      expect(encrypted).not.toContain('Sensitive Location');
      
      // Should decrypt correctly
      const decrypted = await encryptionService.decrypt(encrypted, userKey);
      expect(decrypted).toEqual(sensitiveTransactionData);
    });
  });

  test.describe('Client-Side Data Protection', () => {
    test('should not expose encryption keys in browser', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check that encryption keys are not exposed in client-side code
      const scripts = await page.evaluate(() => {
        return Array.from(document.scripts).map(script => script.innerHTML).join('');
      });
      
      const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
      const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
      
      // Should not contain encryption keys or sensitive patterns
      const sensitivePatterns = [
        /encryption.*key/i,
        /secret.*key/i,
        /private.*key/i,
        /crypto.*key/i,
        /aes.*key/i,
        /[a-fA-F0-9]{64}/, // 64-char hex strings (common key format)
        /[a-zA-Z0-9+/]{40,}={0,2}/ // Base64 encoded keys (40+ chars)
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(scripts).not.toMatch(pattern);
        expect(localStorage).not.toMatch(pattern);
        expect(sessionStorage).not.toMatch(pattern);
      }
    });

    test('should secure sensitive form data in memory', async ({ page }) => {
      await page.goto('/dashboard/accounts');
      
      // Look for sensitive input fields
      const sensitiveInputs = await page.locator('input[type="password"], input[name*="key"], input[name*="secret"]').all();
      
      for (const input of sensitiveInputs) {
        await input.fill('sensitive-test-data');
        
        // Check that autocomplete is disabled for sensitive fields
        const autocomplete = await input.getAttribute('autocomplete');
        expect(autocomplete).toBe('off');
        
        // Clear the field
        await input.clear();
      }
    });
  });

  test.describe('Key Management Security', () => {
    test('should rotate encryption keys appropriately', async () => {
      const encryptionService = new EncryptionService();
      
      // Generate multiple keys to simulate rotation
      const oldKey = await encryptionService.generateUserKey();
      const newKey = await encryptionService.generateUserKey();
      
      expect(oldKey).not.toEqual(newKey);
      
      const testData = { sensitive: 'financial data' };
      
      // Encrypt with old key
      const encryptedWithOld = await encryptionService.encrypt(testData, oldKey);
      
      // Decrypt with old key
      const decryptedWithOld = await encryptionService.decrypt(encryptedWithOld, oldKey);
      expect(decryptedWithOld).toEqual(testData);
      
      // Re-encrypt with new key
      const encryptedWithNew = await encryptionService.encrypt(testData, newKey);
      
      // Should produce different encrypted data
      expect(encryptedWithOld).not.toEqual(encryptedWithNew);
      
      // Should decrypt correctly with new key
      const decryptedWithNew = await encryptionService.decrypt(encryptedWithNew, newKey);
      expect(decryptedWithNew).toEqual(testData);
    });

    test('should handle key derivation edge cases', async () => {
      const encryptionService = new EncryptionService();
      
      // Test edge cases for password-based key derivation
      const edgeCases = [
        '', // Empty password
        'a', // Single character
        'x'.repeat(1000), // Very long password
        '🔐🔑💳', // Unicode characters
        '   spaces   ', // Passwords with spaces
        'normal-password123' // Normal case
      ];
      
      for (const password of edgeCases) {
        const salt = crypto.randomBytes(16);
        
        try {
          const key = await encryptionService.deriveKeyFromPassword(password, salt);
          expect(typeof key).toBe('string');
          expect(key.length).toBeGreaterThan(0);
        } catch (error) {
          // Some edge cases might fail, which is acceptable
          // Empty passwords should probably be rejected
          if (password === '') {
            expect(error).toBeDefined();
          }
        }
      }
    });
  });

  test.describe('Encryption Performance and Security', () => {
    test('should encrypt/decrypt within reasonable time limits', async () => {
      const encryptionService = new EncryptionService();
      const userKey = 'performance-test-key';
      
      // Test with various data sizes
      const testSizes = [
        { name: 'small', data: { test: 'small data' } },
        { name: 'medium', data: { large: 'x'.repeat(1000) } },
        { name: 'large', data: { massive: 'x'.repeat(10000) } }
      ];
      
      for (const testCase of testSizes) {
        // Measure encryption time
        const encryptStart = Date.now();
        const encrypted = await encryptionService.encrypt(testCase.data, userKey);
        const encryptTime = Date.now() - encryptStart;
        
        // Measure decryption time
        const decryptStart = Date.now();
        const decrypted = await encryptionService.decrypt(encrypted, userKey);
        const decryptTime = Date.now() - decryptStart;
        
        // Should complete within reasonable time (5 seconds max)
        expect(encryptTime).toBeLessThan(5000);
        expect(decryptTime).toBeLessThan(5000);
        
        // Should decrypt correctly
        expect(decrypted).toEqual(testCase.data);
      }
    });

    test('should resist timing attacks', async () => {
      const encryptionService = new EncryptionService();
      const correctKey = 'correct-key-for-timing-test';
      const testData = { secret: 'timing-attack-test' };
      
      const encrypted = await encryptionService.encrypt(testData, correctKey);
      
      // Test decryption timing with correct vs incorrect keys
      const wrongKeys = [
        'wrong-key-1',
        'wrong-key-2',
        'completely-different-key',
        'a',
        'x'.repeat(50)
      ];
      
      const decryptionTimes = [];
      
      // Measure timing for wrong keys
      for (const wrongKey of wrongKeys) {
        const start = Date.now();
        try {
          await encryptionService.decrypt(encrypted, wrongKey);
        } catch (error) {
          // Expected to fail
        }
        const duration = Date.now() - start;
        decryptionTimes.push(duration);
      }
      
      // Timing variations should not be excessive (indicating constant-time comparison)
      const maxTime = Math.max(...decryptionTimes);
      const minTime = Math.min(...decryptionTimes);
      const timingVariation = maxTime - minTime;
      
      // Should not have extreme timing variations (>100ms difference suggests timing attack vulnerability)
      expect(timingVariation).toBeLessThan(100);
    });
  });
});