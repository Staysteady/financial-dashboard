import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts sensitive financial data before storing in database
 */
export function encryptData(data: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts sensitive financial data when retrieving from database
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
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
