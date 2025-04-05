import crypto from 'crypto';

// Use environment variable for encryption key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
if (!ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY environment variable is not set!');
  throw new Error('ENCRYPTION_KEY must be set for secure data encryption');
}

// Ensure key is of correct length for AES-256 (32 bytes)
const NORMALIZED_KEY = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Encrypts sensitive data using AES-256-CBC
 * @param text - The plaintext to encrypt
 * @returns Encrypted data with IV prepended (hex encoded)
 */
export function encrypt(text: string): string {
  try {
    // Create a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with normalized key and iv
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      NORMALIZED_KEY, 
      iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data for use in decryption
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * @param encryptedText - The encrypted text with IV prepended (hex encoded)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  try {
    // Extract IV from the encrypted text
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    
    // Create decipher with normalized key and iv
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      NORMALIZED_KEY, 
      iv
    );
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hashes data using SHA-256 (for non-reversible encryption like passwords)
 * @param data - The data to hash
 * @returns Hashed data
 */
export function hash(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Securely compares two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns Whether the strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  // To prevent timing attacks, we need to compare strings of the same length
  try {
    // Ensure both buffers are of the same length
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    
    // If the lengths are different, they're not equal, but compare them anyway
    // to avoid timing attacks
    if (bufA.length !== bufB.length) {
      // Create a new buffer of the same length as bufA
      const fakeBuf = Buffer.alloc(bufA.length, 0);
      // Compare with fakeBuf to maintain constant time operation
      crypto.timingSafeEqual(bufA, fakeBuf);
      return false;
    }
    
    // If the lengths are the same, do a proper secure comparison
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    console.error('Secure compare error:', err);
    return false;
  }
}

/**
 * Encrypts sensitive financial data object for database storage
 * @param data - The object containing sensitive financial data
 * @returns String with encrypted data
 */
export function encryptFinancialData(data: Record<string, any>): string {
  try {
    return encrypt(JSON.stringify(data));
  } catch (err) {
    console.error('Error encrypting financial data:', err);
    throw new Error('Failed to encrypt financial data');
  }
}

/**
 * Decrypts sensitive financial data from database
 * @param encryptedData - The encrypted data string
 * @returns Decrypted object with financial data
 */
export function decryptFinancialData(encryptedData: string): Record<string, any> {
  try {
    const decrypted = decrypt(encryptedData);
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Error decrypting financial data:', err);
    throw new Error('Failed to decrypt financial data');
  }
}

/**
 * Creates a password hash with salt for secure storage
 * @param password - The plaintext password
 * @returns Hashed password with salt
 */
export function hashPassword(password: string): string {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const hash = crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
  
  // Return the salt and hash separated by a colon
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash
 * @param password - The plaintext password to verify
 * @param storedHash - The stored hash with salt
 * @returns Whether the password matches
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    
    // Hash the input password with the stored salt
    const inputHash = crypto
      .createHash('sha256')
      .update(password + salt)
      .digest('hex');
    
    // Use secure comparison to verify
    return secureCompare(inputHash, hash);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}