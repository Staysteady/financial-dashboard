import {
  generateSecureToken,
  hashPassword,
  verifyPassword,
  sanitizeInput,
  validatePasswordStrength,
  maskSensitiveData,
  validators,
} from '../security';

describe('Security Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // Hex string is 2x the byte length
    });

    it('should generate token of default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // Default 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with only hex characters', () => {
      const token = generateSecureToken(16);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle different lengths', () => {
      expect(generateSecureToken(8)).toHaveLength(16);
      expect(generateSecureToken(64)).toHaveLength(128);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with generated salt', () => {
      const password = 'testPassword123';
      const result = hashPassword(password);
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result.hash).toHaveLength(64); // SHA-256 hex
      expect(result.salt).toHaveLength(64); // 32 bytes hex
    });

    it('should hash password with provided salt', () => {
      const password = 'testPassword123';
      const salt = 'a1b2c3d4e5f6';
      const result = hashPassword(password, salt);
      
      expect(result.salt).toBe(salt);
      expect(result.hash).toHaveLength(64);
    });

    it('should produce different hashes for different passwords', () => {
      const result1 = hashPassword('password1');
      const result2 = hashPassword('password2');
      
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should produce same hash for same password and salt', () => {
      const password = 'testPassword';
      const salt = 'fixedSalt123';
      
      const result1 = hashPassword(password, salt);
      const result2 = hashPassword(password, salt);
      
      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'testPassword123';
      const { hash, salt } = hashPassword(password);
      
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const { hash, salt } = hashPassword(password);
      
      expect(verifyPassword(wrongPassword, hash, salt)).toBe(false);
    });

    it('should reject with wrong salt', () => {
      const password = 'testPassword123';
      const { hash } = hashPassword(password);
      const wrongSalt = 'wrongSalt123';
      
      expect(verifyPassword(password, hash, wrongSalt)).toBe(false);
    });

    it('should handle empty password', () => {
      const { hash, salt } = hashPassword('');
      
      expect(verifyPassword('', hash, salt)).toBe(true);
      expect(verifyPassword('notEmpty', hash, salt)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("test")';
      const result = sanitizeInput(input);
      
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert(1)';
      const result = sanitizeInput(input);
      
      expect(result).not.toContain('onclick=');
    });

    it('should handle normal text', () => {
      const input = 'Hello world 123';
      const result = sanitizeInput(input);
      
      expect(result).toBe(input); // Should be unchanged
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      
      expect(result).toBe('hello world');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('123');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(5);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide feedback for missing requirements', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.feedback).toContain('Password must contain at least one uppercase letter');
      expect(result.feedback).toContain('Password must contain at least one number');
      expect(result.feedback).toContain('Password must contain at least one special character');
    });

    it('should check password length', () => {
      const result = validatePasswordStrength('Aa1!');
      
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    it('should detect common passwords', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.score).toBe(0);
      expect(result.feedback).toContain('Password is too common');
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask credit card fields', () => {
      const data = { credit_card: '1234567890123456' };
      const result = maskSensitiveData(data);
      
      expect(result.credit_card).not.toBe('1234567890123456');
      expect(result.credit_card).toBe('12**********56');
    });

    it('should mask password fields', () => {
      const data = { password: 'mySecretPassword' };
      const result = maskSensitiveData(data);
      
      expect(result.password).toBe('my**********rd');
    });

    it('should mask account numbers', () => {
      const data = { account_number: '12345678' };
      const result = maskSensitiveData(data);
      
      expect(result.account_number).toBe('12****78');
    });

    it('should mask short sensitive fields', () => {
      const data = { pin: '1234' };
      const result = maskSensitiveData(data);
      
      expect(result.pin).toBe('****');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John Doe',
          password: 'secret123'
        }
      };
      const result = maskSensitiveData(data);
      
      expect(result.user.name).toBe('John Doe');
      expect(result.user.password).toBe('se*****23');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        account_number: '12345678'
      };
      const result = maskSensitiveData(data);
      
      expect(result.name).toBe('John Doe');
      expect(result.age).toBe(30);
      expect(result.account_number).toBe('12****78');
    });
  });

  describe('validators', () => {
    describe('email', () => {
      it('should validate email addresses', () => {
        expect(validators.email('test@example.com')).toBe(true);
        expect(validators.email('user@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validators.email('invalid')).toBe(false);
        expect(validators.email('test@')).toBe(false);
      });
    });

    describe('amount', () => {
      it('should validate valid amounts', () => {
        expect(validators.amount(100)).toBe(true);
        expect(validators.amount(0.01)).toBe(true);
        expect(validators.amount(-100)).toBe(true);
      });

      it('should reject invalid amounts', () => {
        expect(validators.amount(NaN)).toBe(false);
        expect(validators.amount(Infinity)).toBe(false);
        expect(validators.amount(-Infinity)).toBe(false);
      });

      it('should reject amounts outside range', () => {
        expect(validators.amount(9999999999)).toBe(false);
        expect(validators.amount(-9999999999)).toBe(false);
      });
    });

    describe('currency', () => {
      it('should validate currency codes', () => {
        expect(validators.currency('GBP')).toBe(true);
        expect(validators.currency('USD')).toBe(true);
        expect(validators.currency('EUR')).toBe(true);
      });

      it('should handle case insensitive', () => {
        expect(validators.currency('gbp')).toBe(true);
        expect(validators.currency('usd')).toBe(true);
      });

      it('should reject invalid currency codes', () => {
        expect(validators.currency('XXX')).toBe(false);
        expect(validators.currency('INVALID')).toBe(false);
      });
    });

    describe('date', () => {
      it('should validate date strings', () => {
        expect(validators.date('2024-01-01')).toBe(true);
        expect(validators.date('2024-12-31')).toBe(true);
      });

      it('should reject invalid dates', () => {
        expect(validators.date('invalid')).toBe(false);
        expect(validators.date('2024-13-01')).toBe(false);
      });

      it('should reject dates outside reasonable range', () => {
        expect(validators.date('1800-01-01')).toBe(false);
        expect(validators.date('2200-01-01')).toBe(false);
      });
    });

    describe('uuid', () => {
      it('should validate UUID format', () => {
        expect(validators.uuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        expect(validators.uuid('invalid-uuid')).toBe(false);
        expect(validators.uuid('123-456-789')).toBe(false);
      });
    });
  });
});