import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { insertTransactionSchema, insertSalaryRecordSchema, insertGoalSchema, insertSavingsRecordSchema, users } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { encrypt, decrypt, encryptFinancialData, decryptFinancialData } from "./utils/encryption";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import { extractTransactionsFromPDF, cleanupTemporaryFiles } from "./services/pdfService";
import { sendWelcomeEmail, sendDataExportEmail } from "./services/emailService";
import { 
  generateSpendingInsights, 
  generatePersonalizedAdvice, 
  answerCustomFinancialQuestion 
} from "./services/aiService";
import { rateLimiter, RATE_LIMITS } from "./services/rateLimiterService";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

import { WebSocketServer, WebSocket as WSWebSocket } from 'ws';

// Keep track of connected WebSocket clients by user ID
const connectedClients: Map<number, Set<WSWebSocket>> = new Map();

// Helper function to send messages to a specific user
function sendNotificationToUser(userId: number, message: any): void {
  const userClients = connectedClients.get(userId);
  if (userClients && userClients.size > 0) {
    const messageStr = JSON.stringify(message);
    // Convert Set to Array to avoid iteration issues
    Array.from(userClients).forEach(client => {
      if (client.readyState === WSWebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Health check endpoint for API and Database connectivity
  app.get("/api/health/check", async (_req: Request, res: Response) => {
    try {
      // Check database connection by executing a simple query
      await db.execute(sql`SELECT 1 AS health_check`);

      // Check user schema structure
      let userSchemaStatus = "unknown";
      let authSystem = "unknown";
      try {
        await db.select().from(users).limit(1);
        userSchemaStatus = "verified";
        authSystem = "email-based"; // Using email instead of username for authentication
      } catch (schemaError) {
        console.error("Schema check failed:", schemaError);
        userSchemaStatus = "error";
      }

      return res.status(200).json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        encryption: process.env.ENCRYPTION_KEY ? "configured" : "missing",
        session: process.env.SESSION_SECRET ? "configured" : "missing",
        dbConfig: {
          configured: !!process.env.DATABASE_URL,
          host: process.env.PGHOST ? "configured" : "missing",
          user: process.env.PGUSER ? "configured" : "missing",
          database: process.env.PGDATABASE ? "configured" : "missing"
        },
        schema: {
          version: "v2", // Updated schema version
          usersTable: userSchemaStatus
        },
        authSystem: authSystem
      });
    } catch (error) {
      console.error("Health check failed:", error);
      return res.status(500).json({
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Authentication middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  // Error handler middleware
  const handleError = (err: any, res: Response) => {
    console.error("API Error:", err);

    if (err instanceof z.ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ message: validationError.message });
    }

    res.status(500).json({ message: err.message || "Internal server error" });
  };

  // Transactions Routes
  app.get("/api/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Add userId to the validated data
      const data = { ...req.body, userId };
      const validatedData = insertTransactionSchema.parse(data);

      // If data encryption is enabled, encrypt sensitive details
      const user = req.user as any;
      if (user.dataEncryptionEnabled && validatedData.description) {
        // Store sensitive details in encrypted format
        const sensitiveData = {
          fullDescription: validatedData.description,
          notes: req.body.notes,
          metadata: req.body.metadata
        };
        validatedData.encryptedData = encryptFinancialData(sensitiveData);
      }

      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Ensure the transaction belongs to the user (would be implemented in storage)
      await storage.deleteTransaction(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Salary Routes
  app.get("/api/salary", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const salaryRecords = await storage.getSalaryRecords();
      res.json(salaryRecords);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/salary", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Add userId to the validated data
      const data = { ...req.body, userId };
      const validatedData = insertSalaryRecordSchema.parse(data);

      // Create salary record without encryption
      const salaryRecord = await storage.createSalaryRecord(validatedData);
      res.status(201).json(salaryRecord);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/salary/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const schema = z.object({ amount: z.number().positive() });
      const { amount } = schema.parse(req.body);

      // Ensure the record belongs to the user (would be implemented in storage)
      const updatedRecord = await storage.updateSalaryRecord(id, amount);
      res.json(updatedRecord);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Goals Routes
  app.get("/api/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const goals = await storage.getGoals();

      // Check if advice parameter is provided and truthy
      const includeAdvice = req.query.advice === 'true';

      if (includeAdvice && process.env.GROQ_API_KEY && goals.length > 0) {
        try {
          // Get transactions and salary data for AI analysis
          const transactions = await storage.getTransactions();
          const salaryRecords = await storage.getSalaryRecords();

          // Import AI service
          const { generatePersonalizedAdvice } = await import('./services/aiService');

          // Generate advice asynchronously
          const advice = await generatePersonalizedAdvice(goals, transactions, salaryRecords);

          // Return goals with advice
          return res.json({
            goals,
            advice,
            hasAdvice: true
          });
        } catch (aiError) {
          console.error("Error generating goal advice:", aiError);
          // Return only goals if AI fails
          return res.json({ goals, hasAdvice: false });
        }
      }

      // Default: return just the goals
      res.json({ goals, hasAdvice: false });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Handle targetDate conversion explicitly
      let data = { ...req.body, userId };
      if (data.targetDate && typeof data.targetDate === 'string') {
        data.targetDate = new Date(data.targetDate);
      }

      // Now validate the data
      const validatedData = insertGoalSchema.parse(data);

      const goal = await storage.createGoal(validatedData);
      res.status(201).json(goal);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/goals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const schema = z.object({ currentAmount: z.number().nonnegative() });
      const { currentAmount } = schema.parse(req.body);

      // Ensure the goal belongs to the user (would be implemented in storage)
      const updatedGoal = await storage.updateGoal(id, currentAmount);
      res.json(updatedGoal);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Ensure the goal belongs to the user (would be implemented in storage)
      await storage.deleteGoal(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Savings Routes
  app.get("/api/savings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const savingsRecords = await storage.getSavingsRecords();
      res.json(savingsRecords);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/savings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Add userId to the validated data
      const data = { ...req.body, userId };
      const validatedData = insertSavingsRecordSchema.parse(data);

      const savingsRecord = await storage.createSavingsRecord(validatedData);
      res.status(201).json(savingsRecord);
    } catch (err) {
      handleError(err, res);
    }
  });

  // AI-powered custom insights using Groq SDK
  app.post("/api/insights/custom", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Check for GROQ_API_KEY
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        return res.status(503).json({ 
          message: "AI insights are temporarily unavailable (API key not configured)",
          _meta: {
            aiLimits: {
              remaining: 0,
              total: 0,
              resetsIn: 'N/A',
              apiKeyMissing: true
            }
          }
        });
      }

      // Validate request for custom insight query
      const schema = z.object({ 
        question: z.string().min(5).max(200),
        timeframe: z.enum(["week", "month", "quarter", "year", "all"]).optional()
      });

      const { question, timeframe = "month" } = schema.parse(req.body);

      // Get user's financial data
      const transactions = await storage.getTransactions();
      const salaryRecords = await storage.getSalaryRecords();
      const goals = await storage.getGoals();
      const savingsRecords = await storage.getSavingsRecords();

      // Import the AI service functionality
      const { answerCustomFinancialQuestion } = await import('./services/aiService');

      // Call the AI service with the user's question and financial data
      const response = await answerCustomFinancialQuestion(
        question,
        transactions,
        salaryRecords,
        goals,
        savingsRecords
      );

      // Check remaining quota from the imported rate limiter
      const remainingQuota = rateLimiter.getRemainingQuota('CUSTOM_QUESTIONS', RATE_LIMITS.CUSTOM_QUESTIONS);

      // Return the AI-generated insights with rate limit information
      res.json({
        answer: response.answer,
        actionItems: response.actionItems,
        generatedAt: new Date().toISOString(),
        question,
        _meta: {
          aiLimits: {
            remaining: remainingQuota,
            total: RATE_LIMITS.CUSTOM_QUESTIONS,
            resetsIn: 'approximately 1 hour'
          }
        }
      });
    } catch (err) {
      console.error("AI insights error:", err);

      // Get rate limit information from imported rate limiter
      const remainingQuota = rateLimiter.getRemainingQuota('CUSTOM_QUESTIONS', RATE_LIMITS.CUSTOM_QUESTIONS);

      // Check if it's a rate limit error
      const isRateLimitError = err instanceof Error && err.message.includes('rate limit');

      // Send an error response with metadata
      res.status(isRateLimitError ? 429 : 500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
        _meta: {
          aiLimits: {
            remaining: remainingQuota,
            total: RATE_LIMITS.CUSTOM_QUESTIONS,
            resetsIn: 'approximately 1 hour',
            isRateLimitError
          }
        }
      });
    }
  });

  // Categories Routes
  app.get("/api/categories", requireAuth, async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getCategorySpending();
      res.json(categories);
    } catch (err) {
      handleError(err, res);
    }
  });

  // AI Insights Route
  app.get("/api/insights", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // First check if we have stored insights
      const savedInsights = await storage.getAiInsights();

      // If we have enough saved insights or don't have Groq API key, return saved ones
      if (savedInsights.length >= 3 || !process.env.GROQ_API_KEY) {
        // Return with appropriate metadata
        return res.json({
          insights: savedInsights,
          _meta: {
            aiLimits: process.env.GROQ_API_KEY 
              ? { remaining: 0, total: 0, resetsIn: 'N/A', apiKeyMissing: false }
              : { remaining: 0, total: 0, resetsIn: 'N/A', apiKeyMissing: true }
          }
        });
      }

      // Otherwise, generate new insights
      const transactions = await storage.getTransactions();
      const salaryRecords = await storage.getSalaryRecords();
      const goals = await storage.getGoals();
      const savingsRecords = await storage.getSavingsRecords();

      // Import the AI service functionality
      const { generateSpendingInsights } = await import('./services/aiService');

      try {
        // Generate new insights using AI
        const newInsights = await generateSpendingInsights(
          transactions,
          salaryRecords,
          goals,
          savingsRecords
        );

        // Get rate limit information from imported rate limiter
        const remainingQuota = rateLimiter.getRemainingQuota('GENERAL_INSIGHTS', RATE_LIMITS.GENERAL_INSIGHTS);

        // Return combined insights with rate limit metadata
        const insights = [...savedInsights, ...newInsights];
        res.json({
          insights,
          _meta: {
            aiLimits: {
              remaining: remainingQuota,
              total: RATE_LIMITS.GENERAL_INSIGHTS,
              resetsIn: 'approximately 1 hour'
            }
          }
        });
      } catch (aiError) {
        console.error("Error generating AI insights:", aiError);
        // Still return saved insights on error with rate limit info from imported rate limiter
        const remainingQuota = rateLimiter.getRemainingQuota('GENERAL_INSIGHTS', RATE_LIMITS.GENERAL_INSIGHTS);

        res.json({
          insights: savedInsights,
          _meta: {
            aiLimits: {
              remaining: remainingQuota,
              total: RATE_LIMITS.GENERAL_INSIGHTS,
              resetsIn: 'approximately 1 hour',
              error: aiError instanceof Error ? aiError.message : 'Unknown error'
            }
          }
        });
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  // Manual Generate Insights Route
  app.post('/api/insights/generate', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify API key is configured
      if (!process.env.GROQ_API_KEY) {
        return res.status(400).json({ 
          error: 'AI API key is not configured. Please contact your administrator.'
        });
      }

      // Get storage instance for the user
      const userId = req.user.id;
      //Check rate limit before proceeding
      if (!rateLimiter.canProceed('GENERAL_INSIGHTS', RATE_LIMITS.GENERAL_INSIGHTS)) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again in an hour when the rate limit resets.'
        });
      }

      // Get all the financial data needed for analysis
      const transactions = await storage.getTransactions(userId);
      const salaryRecords = await storage.getSalaryRecords(userId);
      const goals = await storage.getGoals(userId);
      const savingsRecords = await storage.getSavingsRecords(userId);

      // Import the AI service functionality
      const { generateSpendingInsights } = await import('./services/aiService');

      // Generate new insights using AI
      const newInsights = await generateSpendingInsights(
        transactions,
        salaryRecords,
        goals,
        savingsRecords
      );

      // Add insights to storage
      if (newInsights && newInsights.length > 0) {
        await storage.addAiInsights(newInsights, userId);
      }

      // Get remaining quota after processing
      const remainingQuota = rateLimiter.getRemainingQuota('GENERAL_INSIGHTS', RATE_LIMITS.GENERAL_INSIGHTS);

      // Return success with metadata
      res.json({
        success: true,
        count: newInsights.length,
        _meta: {
          aiLimits: {
            remaining: remainingQuota,
            total: RATE_LIMITS.GENERAL_INSIGHTS,
            resetsIn: 'approximately 1 hour',
            apiKeyMissing: false
          }
        }
      });
    } catch (err) {
      console.error("Manual insights generation error:", err);
      res.status(500).json({ 
        error: err instanceof Error ? err.message : 'Failed to generate AI insights'
      });
    }
  });

  // PDF Upload and Processing
  app.post("/api/upload/pdf", requireAuth, upload.array('pdf', 10), async (req: Request, res: Response) => {
    let userId: number | undefined;
    let uploadedFiles: Express.Multer.File[] = [];

    try {
      // Get the files and user ID
      uploadedFiles = req.files as Express.Multer.File[] || [];
      userId = req.user?.id;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No PDF files provided" });
      }

      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      // Check if we have the Groq API key for AI parsing
      if (!process.env.GROQ_API_KEY) {
        console.warn("GROQ_API_KEY not available, will use pattern matching only for PDF parsing");
      }

      // Get rate limit information for PDF processing using imported rate limiter
      const remainingQuota = rateLimiter.getRemainingQuota('PDF_PROCESSING', RATE_LIMITS.PDF_PROCESSING);

      // Send an initial response to let the client know processing has started
      res.status(202).json({ 
        message: "PDF processing started", 
        files: uploadedFiles.length,
        status: "processing",
        _meta: {
          aiLimits: {
            remaining: remainingQuota,
            total: RATE_LIMITS.PDF_PROCESSING,
            resetsIn: 'approximately 1 hour',
            apiKeyMissing: !process.env.GROQ_API_KEY
          }
        }
      });

      // Process all PDFs asynchronously after sending the response
      const filePaths = uploadedFiles.map(file => file.path);
      const { processMultiplePDFs } = await import('./services/pdfService');

      // Extract transactions from all PDFs
      const transactions = await processMultiplePDFs(filePaths, userId);

      if (!transactions || transactions.length === 0) {
        console.warn("Could not extract any transactions from the uploaded PDFs");

        // Send error notification to user via WebSocket
        sendNotificationToUser(userId, {
          type: 'pdf_processing_error',
          message: 'Could not extract any transactions from the uploaded PDFs',
          data: {
            fileCount: uploadedFiles.length,
            success: false,
            timestamp: new Date().toISOString()
          }
        });

        return;
      }

      // Save all extracted transactions
      const savedTransactions = [];
      for (const transaction of transactions) {
        try {
          const saved = await storage.createTransaction(transaction);
          savedTransactions.push(saved);
        } catch (saveError) {
          console.error("Failed to save transaction:", saveError);
          // Continue with other transactions even if one fails
        }
      }

      console.log(`Successfully processed ${uploadedFiles.length} PDFs and extracted ${savedTransactions.length} transactions`);

      // Send notification to user via WebSocket if they're connected
      sendNotificationToUser(userId, {
        type: 'pdf_processing_complete',
        message: `Successfully processed ${uploadedFiles.length} PDFs and extracted ${savedTransactions.length} transactions`,
        data: {
          fileCount: uploadedFiles.length,
          transactionCount: savedTransactions.length,
          success: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Error processing PDF uploads:", err);

      // Send error notification to user via WebSocket if we have userId
      if (userId) {
        sendNotificationToUser(userId, {
          type: 'pdf_processing_error',
          message: 'An error occurred while processing your PDF files',
          data: {
            error: err instanceof Error ? err.message : 'Unknown error',
            fileCount: uploadedFiles.length,
            success: false,
            timestamp: new Date().toISOString(),
            // Add rate limit info if it's rate limit error
            ...(err instanceof Error && err.message.includes('rate limit') ? {
              rateLimit: {
                isLimitError: true,
                resetsIn: 'approximately 1 hour'
              }
            } : {})
          }
        });
      }
    }
  });

  // Run temporary file cleanup periodically
  setInterval(cleanupTemporaryFiles, 24 * 60 * 60 * 1000); // Once per day

  // Data Management Routes
  app.delete("/api/user/data", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      await storage.deleteAllUserData();
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/user/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not available" });
      }

      const user = req.user;
      const data = await storage.exportUserData();

      // Encrypt the data for additional security
      const encryptedData = encryptFinancialData(data);
      const exportData = {
        data: encryptedData,
        exportDate: new Date().toISOString(),
        format: "encrypted-json"
      };

      // Generate a temporary download link (in a real app this would be a signed URL)
      const downloadLink = `/api/download/${encryptedData.substring(0, 32)}`;

      // Send email notification (asynchronously, don't wait for it)
      if (user && 'email' in user) {
        sendDataExportEmail(user, downloadLink).catch(console.error);
      }

      res.json(exportData);
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WSWebSocket, req) => {
    console.log('WebSocket client connected');

    // Extract userId from the session
    const sessionId = req.url?.split('sessionId=')[1];
    if (!sessionId) {
      console.warn('WebSocket connection without valid session ID');
      return;
    }

    // Store the WebSocket connection for this user
    let userId: number | undefined;

    // Send initial message
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to financial tracker notifications' }));

    // Handle authentication message from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === 'auth' && data.userId) {
          userId = parseInt(data.userId);
          if (!isNaN(userId)) {
            // Add this connection to the user's set of connections
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }

            const existingSet = connectedClients.get(userId);
            if (existingSet) {
              existingSet.add(ws);
            }

            console.log(`WebSocket authenticated for user ${userId}`);
            ws.send(JSON.stringify({ 
              type: 'auth_success',
              message: 'Authentication successful'
            }));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        const userClients = connectedClients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            connectedClients.delete(userId);
          }
        }
      }
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}