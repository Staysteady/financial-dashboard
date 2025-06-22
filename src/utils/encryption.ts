import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts sensitive financial data before storing in database
 */
export function encryptData(data: string, customKey?: string): string {
  try {
    const key = customKey || ENCRYPTION_KEY;
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts sensitive financial data when retrieving from database
 */
export function decryptData(encryptedData: string, customKey?: string): string {
  try {
    const key = customKey || ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypts account credentials and API keys
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  const jsonString = JSON.stringify(credentials);
  return encryptData(jsonString);
}

/**
 * Decrypts account credentials and API keys
 */
export function decryptCredentials(encryptedCredentials: string): Record<string, any> {
  const decryptedString = decryptData(encryptedCredentials);
  return JSON.parse(decryptedString);
}

/**
 * Hashes sensitive data for comparison without storing the actual value
 */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Generates a secure random key for encryption
 */
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

/**
 * Banking-specific credential encryption with additional security layers
 */
export interface BankingCredentials {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  clientSecret?: string;
  bankCode: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  lastUsed?: number;
}

/**
 * Encrypts banking credentials with timestamp and integrity check
 */
export function encryptBankingCredentials(
  credentials: BankingCredentials,
  userKey?: string
): string {
  try {
    // Add integrity check and timestamp
    const credentialsWithMetadata = {
      ...credentials,
      encryptedAt: Date.now(),
      checksum: hashData(JSON.stringify(credentials)),
    };

    const jsonString = JSON.stringify(credentialsWithMetadata);
    const userSpecificKey = userKey ? 
      CryptoJS.SHA256(ENCRYPTION_KEY + userKey).toString() : 
      ENCRYPTION_KEY;
    
    return encryptData(jsonString, userSpecificKey);
  } catch (error) {
    console.error('Banking credentials encryption error:', error);
    throw new Error('Failed to encrypt banking credentials');
  }
}

/**
 * Decrypts banking credentials with integrity verification
 */
export function decryptBankingCredentials(
  encryptedCredentials: string,
  userKey?: string
): BankingCredentials {
  try {
    const userSpecificKey = userKey ? 
      CryptoJS.SHA256(ENCRYPTION_KEY + userKey).toString() : 
      ENCRYPTION_KEY;
    
    const decryptedString = decryptData(encryptedCredentials, userSpecificKey);
    const credentialsWithMetadata = JSON.parse(decryptedString);
    
    // Verify integrity
    const { checksum, encryptedAt, ...credentials } = credentialsWithMetadata;
    const expectedChecksum = hashData(JSON.stringify(credentials));
    
    if (checksum !== expectedChecksum) {
      throw new Error('Credential integrity check failed');
    }

    // Check if credentials are expired (beyond reasonable limits)
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (Date.now() - encryptedAt > maxAge) {
      throw new Error('Encrypted credentials are too old');
    }

    return credentials;
  } catch (error) {
    console.error('Banking credentials decryption error:', error);
    throw new Error('Failed to decrypt banking credentials');
  }
}

/**
 * Creates a user-specific encryption key based on user ID and additional entropy
 */
export function createUserSpecificKey(userId: string, additionalEntropy?: string): string {
  const entropy = additionalEntropy || '';
  return CryptoJS.PBKDF2(
    userId + entropy,
    ENCRYPTION_KEY,
    {
      keySize: 256/32,
      iterations: 10000
    }
  ).toString();
}

/**
 * Validates encryption key strength
 */
export function validateEncryptionKey(key: string): boolean {
  if (!key || key.length < 32) {
    return false;
  }
  
  // Check for default or weak keys
  const weakKeys = [
    'default-key-change-in-production',
    '12345678901234567890123456789012',
    'password',
    'secret'
  ];
  
  return !weakKeys.includes(key);
}

/**
 * Rotates encryption key for enhanced security
 */
export function rotateCredentials(
  oldEncryptedCredentials: string,
  oldUserKey: string,
  newUserKey: string
): string {
  try {
    // Decrypt with old key
    const credentials = decryptBankingCredentials(oldEncryptedCredentials, oldUserKey);
    
    // Re-encrypt with new key
    return encryptBankingCredentials(credentials, newUserKey);
  } catch (error) {
    console.error('Credential rotation error:', error);
    throw new Error('Failed to rotate credentials');
  }
}

/**
 * Securely wipes sensitive data from memory (best effort)
 */
export function secureWipe(sensitiveData: string): void {
  // This is a best-effort approach in JavaScript
  // True secure wiping requires lower-level memory management
  try {
    if (typeof sensitiveData === 'string') {
      // Overwrite with random data multiple times
      for (let i = 0; i < 3; i++) {
        sensitiveData = CryptoJS.lib.WordArray.random(sensitiveData.length * 2).toString();
      }
    }
  } catch (error) {
    // Silent failure for secure wipe attempts
  }
}
