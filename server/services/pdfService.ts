import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { InsertTransaction } from '@shared/schema';
import { Groq } from 'groq-sdk';
import pdfParse from 'pdf-parse';
import { rateLimiter, RATE_LIMITS } from './rateLimiterService';

// Initialize Groq client using official SDK (reuse from aiService)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Models to use - using a smaller model for PDF processing to save quota
const PDF_MODEL = 'llama3-8b-8192';  // Smaller model for PDF processing to conserve quota

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
 * Parses a bank statement PDF file to extract financial transaction information using AI
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
    
    // First perform validation to confirm this seems like a bank statement
    if (!validateBankStatement(text)) {
      console.warn('File does not appear to be a valid bank statement');
      await unlink(filePath);
      return null;
    }
    
    // Try AI parsing first (if GROQ_API_KEY is available)
    if (process.env.GROQ_API_KEY) {
      try {
        const aiTransactions = await parseTransactionsWithAI(text, userId);
        
        // Only return AI results if we got some valid transactions
        if (aiTransactions && aiTransactions.length > 0) {
          // Delete the temporary file after processing
          await unlink(filePath);
          return aiTransactions;
        }
      } catch (aiError) {
        console.error('AI parsing failed, falling back to pattern matching:', aiError);
      }
    }
    
    // Fallback to pattern-based parsing
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
 * Uses AI to parse transaction data from bank statements
 * @param text The text content from the PDF
 * @param userId The ID of the user uploading the PDF
 * @returns Parsed transactions
 */
async function parseTransactionsWithAI(text: string, userId: number): Promise<InsertTransaction[]> {
  // Check rate limit for PDF processing
  if (!rateLimiter.canProceed('PDF_PROCESSING', RATE_LIMITS.PDF_PROCESSING)) {
    console.warn('Rate limit exceeded for PDF processing');
    throw new Error('AI PDF processing rate limit reached. Please try again later or use manual transaction entry.');
  }
  
  // Create a sample of the text content (first 3000 chars) to analyze
  const textSample = text.substring(0, 3000);
  
  // Create prompt for the AI to identify the bank statement format
  const formatPrompt = `
  Analyze this bank statement text and determine the format and structure:
  
  ${textSample}
  
  Identify:
  1. Which bank or financial institution issued this statement
  2. The date format used in transactions
  3. The general structure of transaction entries
  4. Where transaction amounts appear and if they use special formatting
  5. How the statement distinguishes between deposits and withdrawals
  
  Return your analysis in JSON format:
  {
    "bankName": "Name of bank",
    "dateFormat": "Description of date format (e.g., MM/DD/YYYY)",
    "structure": "Description of how transactions are structured",
    "amountFormat": "Description of how amounts are formatted",
    "transactionType": "How deposits vs withdrawals are indicated"
  }
  `;
  
  // Get AI analysis of the statement format
  const formatResponse = await groq.chat.completions.create({
    messages: [{ role: "user", content: formatPrompt }],
    model: PDF_MODEL,
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });
  
  const formatAnalysis = JSON.parse(formatResponse.choices[0]?.message?.content || '{}');
  
  // Now create a more specific prompt to extract the actual transactions
  const extractPrompt = `
  You are an expert financial data processor. Extract all financial transactions from this bank statement.
  
  Bank: ${formatAnalysis.bankName || "Unknown bank"}
  Date format: ${formatAnalysis.dateFormat || "Various formats"}
  Transaction structure: ${formatAnalysis.structure || "Standard format"}
  
  BANK STATEMENT TEXT:
  ${text}
  
  For each transaction, extract:
  1. Date (in the original format from the statement)
  2. Description/Merchant name
  3. Amount (as a positive number)
  4. Whether it's a deposit (income) or withdrawal (expense)
  
  Format your response as a valid JSON array of transactions:
  [
    {
      "date": "The transaction date",
      "merchant": "The merchant name or description",
      "amount": 123.45,
      "isDeposit": true/false,
      "category": "Best guess at transaction category"
    }
  ]
  
  Categories to use (choose the most appropriate one):
  - Food & Dining
  - Transportation
  - Housing & Utilities
  - Entertainment
  - Shopping
  - Health & Fitness
  - Income
  - Miscellaneous
  
  Important:
  - Only extract ACTUAL transactions, not summaries or balances
  - Ensure amounts are formatted as numbers without currency symbols
  - If you're unsure about a transaction, skip it
  - Extract at least 5 transactions and at most 30 transactions
  - Focus on the most recent transactions if there are many
  `;
  
  const transactionResponse = await groq.chat.completions.create({
    messages: [{ role: "user", content: extractPrompt }],
    model: PDF_MODEL,
    temperature: 0.1,
    max_tokens: 2500,
    response_format: { type: "json_object" }
  });
  
  try {
    const content = transactionResponse.choices[0]?.message?.content || '[]';
    const transactions = JSON.parse(content);
    
    if (!Array.isArray(transactions)) {
      throw new Error('AI did not return an array of transactions');
    }
    
    // Convert to our application's transaction format
    return transactions.map(t => ({
      merchant: t.merchant,
      // For deposits (income), store as negative amount to match app conventions if needed
      amount: t.isDeposit ? -Math.abs(t.amount) : Math.abs(t.amount),
      category: t.category || 'Miscellaneous',
      description: t.merchant,
      userId
    }));
  } catch (error) {
    console.error('Failed to parse AI response for transactions:', error);
    return [];
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
 * Validates if a document appears to be a bank statement
 * @param text The text content of the PDF
 * @returns Whether the document appears to be a bank statement
 */
function validateBankStatement(text: string): boolean {
  if (!text || text.length < 100) {
    return false;
  }
  
  // Keywords that suggest this is a bank statement
  const bankStatementKeywords = [
    'statement', 'account', 'balance', 'transaction', 'deposit',
    'withdrawal', 'payment', 'transfer', 'credit', 'debit',
    'beginning balance', 'ending balance', 'date', 'description', 'amount'
  ];
  
  // Check if several keywords exist in the document
  const lowerText = text.toLowerCase();
  const matchCount = bankStatementKeywords.reduce((count, keyword) => {
    return lowerText.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
  
  // If we match at least 3 keywords, it's likely a bank statement
  return matchCount >= 3;
}

/**
 * Processes multiple PDF files and extracts transactions from all of them
 * @param filePaths Array of paths to the uploaded PDF files
 * @param userId The ID of the user uploading the files
 * @returns An array of extracted transactions from all files
 */
export async function processMultiplePDFs(filePaths: string[], userId: number): Promise<InsertTransaction[]> {
  // Check if there's sufficient rate limit left for the batch
  // At least ensure we have quota for half the files to use AI processing
  if (filePaths.length > 1 && !rateLimiter.canProceed('PDF_PROCESSING_CHECK', Math.ceil(filePaths.length / 2))) {
    console.warn(`Rate limit insufficient for processing ${filePaths.length} PDF files`);
    throw new Error(`Rate limit reached. You can only process up to ${rateLimiter.getRemainingQuota('PDF_PROCESSING', RATE_LIMITS.PDF_PROCESSING)} files currently. Please try again later with fewer files or when the rate limit resets.`);
  }
  
  const allTransactions: InsertTransaction[] = [];
  const errors: string[] = [];
  
  // Process each file and collect results
  await Promise.all(filePaths.map(async (filePath) => {
    try {
      const transactions = await extractTransactionsFromPDF(filePath, userId);
      if (transactions && transactions.length > 0) {
        allTransactions.push(...transactions);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      errors.push(path.basename(filePath));
      
      // Clean up the file even on error
      try {
        await unlink(filePath);
      } catch (unlinkError) {
        console.error(`Failed to delete file ${filePath} after error:`, unlinkError);
      }
    }
  }));
  
  if (errors.length > 0) {
    console.warn(`Failed to process ${errors.length} files: ${errors.join(', ')}`);
  }
  
  return allTransactions;
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