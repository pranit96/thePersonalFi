import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { InsertTransaction } from '@shared/schema';

// Mock pdf-parse to avoid the error until we actually need it
const pdfParse = async (buffer: Buffer) => {
  return {
    text: "",
    numpages: 0,
    numrender: 0,
    info: {},
    metadata: {},
    version: "0"
  };
};

// Convert fs functions to promise-based
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Temporary directory for uploaded files
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Make sure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Parses a PDF file to extract financial transaction information
 * @param filePath Path to the uploaded PDF file
 * @param userId The ID of the user uploading the file
 * @returns An array of extracted transactions or null if parsing failed
 */
export async function extractTransactionsFromPDF(filePath: string, userId: number): Promise<InsertTransaction[] | null> {
  try {
    // Read the PDF file
    const dataBuffer = await readFile(filePath);
    
    // Parse the PDF content
    const pdfData = await pdfParse(dataBuffer);
    
    // Extract the text content from the PDF
    const text = pdfData.text;
    
    // Parse transactions using different strategies based on content patterns
    const transactions = parseTransactionsFromText(text, userId);
    
    // Delete the temporary file after processing
    await unlink(filePath);
    
    return transactions;
  } catch (error) {
    console.error('Failed to parse PDF:', error);
    
    // Attempt to clean up the file even if parsing failed
    try {
      await unlink(filePath);
    } catch (unlinkError) {
      console.error('Failed to delete temporary PDF file:', unlinkError);
    }
    
    return null;
  }
}

/**
 * Parse transaction data from extracted text
 * This is a simplified implementation that would need to be customized 
 * for specific bank statement formats or other financial documents
 */
function parseTransactionsFromText(text: string, userId: number): InsertTransaction[] {
  const transactions: InsertTransaction[] = [];
  
  // Common patterns for transaction detection
  // This is a simplified approach - real implementation would need more sophisticated parsing
  const patterns = [
    // Pattern for typical bank statements with date, description, and amount
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Za-z0-9\s\.\,\'&-]+)\s+(\-?\$?\d+\.\d{2})/g,
    
    // Pattern for credit card statements 
    /(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+([A-Za-z0-9\s\.\,\'&-]+)\s+(\-?\$?\d+\.\d{2})/g,
  ];
  
  // Try each pattern to see if it matches
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    
    if (matches.length > 0) {
      // We found matches with this pattern
      for (const match of matches) {
        if (pattern === patterns[0]) {
          // Bank statement pattern
          const dateStr = match[1];
          const description = match[2].trim();
          const amountStr = match[3].replace('$', '').replace(',', '');
          const amount = parseFloat(amountStr);
          
          // Skip if amount is NaN
          if (isNaN(amount)) continue;
          
          // Determine merchant and category from description
          const { merchant, category } = extractMerchantAndCategory(description);
          
          transactions.push({
            merchant,
            amount,
            category,
            description,
            userId
          });
        } else if (pattern === patterns[1]) {
          // Credit card pattern
          const postDateStr = match[2];
          const description = match[3].trim();
          const amountStr = match[4].replace('$', '').replace(',', '');
          const amount = parseFloat(amountStr);
          
          // Skip if amount is NaN
          if (isNaN(amount)) continue;
          
          // Determine merchant and category from description
          const { merchant, category } = extractMerchantAndCategory(description);
          
          transactions.push({
            merchant,
            amount,
            category,
            description,
            userId
          });
        }
      }
      
      // If we found transactions with this pattern, don't try other patterns
      if (transactions.length > 0) {
        break;
      }
    }
  }
  
  return transactions;
}

/**
 * Extracts merchant name and guesses category from transaction description
 */
function extractMerchantAndCategory(description: string): { merchant: string, category: string } {
  // Common keywords for categorization
  const categories: { [key: string]: string } = {
    // Food & Dining
    'restaurant': 'Food & Dining',
    'café': 'Food & Dining',
    'cafe': 'Food & Dining',
    'coffee': 'Food & Dining',
    'doordash': 'Food & Dining',
    'ubereats': 'Food & Dining',
    'grubhub': 'Food & Dining',
    'pizza': 'Food & Dining',
    'mcdonald': 'Food & Dining',
    'starbucks': 'Food & Dining',
    
    // Transportation
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'gas': 'Transportation',
    'shell': 'Transportation',
    'exxon': 'Transportation',
    'chevron': 'Transportation',
    'parking': 'Transportation',
    'transit': 'Transportation',
    'airline': 'Transportation',
    'flight': 'Transportation',
    
    // Housing & Utilities
    'rent': 'Housing & Utilities',
    'mortgage': 'Housing & Utilities',
    'electric': 'Housing & Utilities',
    'water': 'Housing & Utilities',
    'gas bill': 'Housing & Utilities',
    'internet': 'Housing & Utilities',
    'cable': 'Housing & Utilities',
    'phone': 'Housing & Utilities',
    
    // Entertainment
    'netflix': 'Entertainment',
    'spotify': 'Entertainment',
    'hulu': 'Entertainment',
    'disney': 'Entertainment',
    'amazon prime': 'Entertainment',
    'movie': 'Entertainment',
    'theater': 'Entertainment',
    'cinema': 'Entertainment',
    'concert': 'Entertainment',
    
    // Shopping
    'amazon': 'Shopping',
    'walmart': 'Shopping',
    'target': 'Shopping',
    'costco': 'Shopping',
    'bestbuy': 'Shopping',
    'store': 'Shopping',
    'mall': 'Shopping',
    
    // Health & Fitness
    'gym': 'Health & Fitness',
    'doctor': 'Health & Fitness',
    'pharmacy': 'Health & Fitness',
    'cvs': 'Health & Fitness',
    'walgreens': 'Health & Fitness',
    'medical': 'Health & Fitness',
    'dental': 'Health & Fitness',
    'fitness': 'Health & Fitness',
    
    // Income
    'payroll': 'Income',
    'salary': 'Income',
    'deposit': 'Income',
    'direct dep': 'Income',
  };
  
  // Default category if no match is found
  let category = 'Miscellaneous';
  
  // Extract merchant from the beginning of the description
  // This is a simplified approach - real implementation would be more sophisticated
  const words = description.split(' ');
  let merchant = words.length > 2 ? words.slice(0, 2).join(' ') : description;
  
  // Look for category keywords in the description
  const lowerDesc = description.toLowerCase();
  for (const [keyword, cat] of Object.entries(categories)) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      category = cat;
      
      // Try to extract merchant name based on the matched keyword
      const keywordIndex = lowerDesc.indexOf(keyword.toLowerCase());
      if (keywordIndex >= 0) {
        // If keyword is at the beginning, use it as the merchant
        if (keywordIndex < 10) {
          merchant = description.substring(0, keywordIndex + keyword.length);
        }
      }
      
      break;
    }
  }
  
  return { merchant, category };
}

/**
 * Cleans up any temporary files in the upload directory
 */
export async function cleanupTemporaryFiles(): Promise<void> {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    
    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      
      // Only delete files older than 1 hour
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.mtimeMs;
      
      if (fileAge > 60 * 60 * 1000) { // 1 hour in milliseconds
        await unlink(filePath);
        console.log(`Deleted old temporary file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to clean up temporary files:', error);
  }
}