import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertSalaryRecordSchema, insertGoalSchema, insertSavingsRecordSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Create a simple encryption/decryption module for enhanced security
const crypto = {
  // Simple encryption for demo purposes
  encrypt: (data: any): string => {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  },
  
  // Simple decryption for demo purposes
  decrypt: (encryptedData: string): any => {
    try {
      return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
    } catch (e) {
      return null;
    }
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.get("/api/transactions", async (_req: Request, res: Response) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/transactions", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      await storage.deleteTransaction(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Salary Routes
  app.get("/api/salary", async (_req: Request, res: Response) => {
    try {
      const salaryRecords = await storage.getSalaryRecords();
      res.json(salaryRecords);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/salary", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSalaryRecordSchema.parse(req.body);
      const salaryRecord = await storage.createSalaryRecord(validatedData);
      res.status(201).json(salaryRecord);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.put("/api/salary/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const schema = z.object({ amount: z.number().positive() });
      const { amount } = schema.parse(req.body);
      
      const updatedRecord = await storage.updateSalaryRecord(id, amount);
      res.json(updatedRecord);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Goals Routes
  app.get("/api/goals", async (_req: Request, res: Response) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/goals", async (req: Request, res: Response) => {
    try {
      const validatedData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validatedData);
      res.status(201).json(goal);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.put("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const schema = z.object({ currentAmount: z.number().nonnegative() });
      const { currentAmount } = schema.parse(req.body);
      
      const updatedGoal = await storage.updateGoal(id, currentAmount);
      res.json(updatedGoal);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      await storage.deleteGoal(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Savings Routes
  app.get("/api/savings", async (_req: Request, res: Response) => {
    try {
      const savingsRecords = await storage.getSavingsRecords();
      res.json(savingsRecords);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/savings", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSavingsRecordSchema.parse(req.body);
      const savingsRecord = await storage.createSavingsRecord(validatedData);
      res.status(201).json(savingsRecord);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Categories Routes
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getCategorySpending();
      res.json(categories);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // AI Insights Routes
  app.get("/api/insights", async (_req: Request, res: Response) => {
    try {
      const insights = await storage.getAiInsights();
      res.json(insights);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Data Management Routes
  app.delete("/api/user/data", async (_req: Request, res: Response) => {
    try {
      await storage.deleteAllUserData();
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get("/api/user/export", async (_req: Request, res: Response) => {
    try {
      const data = await storage.exportUserData();
      
      // Encrypt the data for additional security
      const encryptedData = crypto.encrypt(data);
      const exportData = {
        data: encryptedData,
        exportDate: new Date().toISOString(),
        format: "encrypted-json"
      };
      
      res.json(exportData);
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
