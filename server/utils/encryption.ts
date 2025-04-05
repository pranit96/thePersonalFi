import crypto from 'crypto';

// Get the encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('ENCRYPTION_KEY is not set. Data encryption will not work properly.');
} else {
  // Log the first few characters of the key for debugging
  console.log(`ENCRYPTION_KEY is set with length: ${ENCRYPTION_KEY.length}. First 4 chars: ${ENCRYPTION_KEY.substring(0, 4)}...`);
}

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts data using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @returns The encrypted data as a hex string (IV + Auth Tag + Encrypted Data)
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('Cannot encrypt: ENCRYPTION_KEY is not set');
    return text; // Return plaintext as fallback
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Log key length for debugging
    console.log(`Key length in bytes: ${Buffer.from(ENCRYPTION_KEY, 'hex').length}`);
    
    // For AES-256, we need a 32-byte (256-bit) key
    const key = Buffer.from(ENCRYPTION_KEY, 'hex').length === 32 
      ? Buffer.from(ENCRYPTION_KEY, 'hex')
      : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    
    // Create cipher with key and iv
    const cipher = crypto.createCipheriv(
      ALGORITHM, 
      key, 
      iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the auth tag (for GCM mode)
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return IV + Auth Tag + Encrypted Data
    return iv.toString('hex') + authTag + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * @param encryptedText - The encrypted text with IV prepended (hex encoded)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('Cannot decrypt: ENCRYPTION_KEY is not set');
    return encryptedText; // Return as-is as fallback
  }

  try {
    // Extract the IV (first 32 hex chars = 16 bytes)
    const iv = Buffer.from(encryptedText.slice(0, 32), 'hex');
    
    // Extract the auth tag (next 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encryptedText.slice(32, 64), 'hex');
    
    // Extract the encrypted data (the rest)
    const encryptedData = encryptedText.slice(64);
    
    // For AES-256, we need a 32-byte (256-bit) key
    const key = Buffer.from(ENCRYPTION_KEY, 'hex').length === 32 
      ? Buffer.from(ENCRYPTION_KEY, 'hex')
      : crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
      
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      key, 
      iv
    );
    
    // Set auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hashes data using SHA-256 (for non-reversible encryption like passwords)
 * @param data - The data to hash
 * @returns Hashed data
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Securely compares two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns Whether the strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

/**
 * Encrypts sensitive financial data object for database storage
 * @param data - The object containing sensitive financial data
 * @returns String with encrypted data
 */
export function encryptFinancialData(data: Record<string, any>): string {
  return encrypt(JSON.stringify(data));
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
  } catch (error) {
    console.error('Failed to decrypt financial data:', error);
    return {};
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
  const hashedPassword = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  
  // Return the salt and hash together
  return `${salt}:${hashedPassword}`;
}

/**
 * Verifies a password against a stored hash
 * @param password - The plaintext password to verify
 * @param storedHash - The stored hash with salt
 * @returns Whether the password matches
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  // Extract the salt and hash
  const [salt, hash] = storedHash.split(':');
  
  // Hash the password with the extracted salt
  const hashedPassword = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  
  // Return true if the generated hash matches the stored hash
  return hash === hashedPassword;
}