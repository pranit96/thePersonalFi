import { 
  users, type User, type InsertUser,
  transactions, type Transaction, type InsertTransaction,
  salaryRecords, type SalaryRecord, type InsertSalaryRecord,
  goals, type Goal, type InsertGoal,
  savingsRecords, type SavingsRecord, type InsertSavingsRecord,
  categorySpending, type CategorySpending,
  aiInsights, type AiInsight
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, max } from "drizzle-orm";
import { 
  encrypt, decrypt, hash, secureCompare,
  encryptFinancialData, decryptFinancialData, 
  hashPassword, verifyPassword 
} from "./utils/encryption";
import connectPg from "connect-pg-simple";
import session from "express-session";

// Interfaces for all storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Salary
  getSalaryRecords(): Promise<SalaryRecord[]>;
  getSalaryRecord(id: number): Promise<SalaryRecord | undefined>;
  createSalaryRecord(record: InsertSalaryRecord): Promise<SalaryRecord>;
  updateSalaryRecord(id: number, amount: number): Promise<SalaryRecord>;

  // Goals
  getGoals(): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, currentAmount: number): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;

  // Savings
  getSavingsRecords(): Promise<SavingsRecord[]>;
  createSavingsRecord(record: InsertSavingsRecord): Promise<SavingsRecord>;

  // Categories
  getCategorySpending(): Promise<CategorySpending[]>;

  // AI Insights
  getAiInsights(): Promise<AiInsight[]>;
  addAiInsights(insights: any[]): Promise<void>; // Added method

  // Data Management
  deleteAllUserData(): Promise<void>;
  exportUserData(): Promise<{
    transactions: Transaction[];
    salaryRecords: SalaryRecord[];
    goals: Goal[];
    savingsRecords: SavingsRecord[];
    categorySpending: CategorySpending[];
    aiInsights: AiInsight[];
  }>;

  // Session store for authentication
  sessionStore: session.Store;
}

// Database implementation of IStorage
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create a PostgreSQL session store for authentication
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
      },
      // Don't try to create the table as it already exists
      createTableIfMissing: false,
      // Use the existing session table name
      tableName: 'session',  
      pruneSessionInterval: 60 * 15,        // Prune expired sessions every 15 minutes
      ttl: 60 * 60 * 8,                     // Session time-to-live (8 hours, matching cookie)
      errorLog: (err) => console.error('PostgreSQL session store error:', err),
    });

    // Log successful session store creation
    console.log('PostgreSQL session store initialized successfully');
  }
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = hashPassword(insertUser.password);

    // Store the hashed password instead of plaintext
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();

    return user;
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    const transactionsList = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.date));

    return transactionsList;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));

    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    // Prepare transaction data for insertion
    const transactionDate = insertTransaction.transactionDate || new Date();

    // Prepare metadata
    const metaData = {
      description: insertTransaction.description,
      payee: insertTransaction.payee,
      memo: insertTransaction.memo
    };

    // Insert transaction with data
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        metaData,
        transactionDate,
        date: new Date(), // Set current date
        currency: insertTransaction.currency || 'USD'
      })
      .returning();

    // Update category spending if categoryId is provided
    if (insertTransaction.categoryId) {
      try {
        // Here we would update the category_spending table based on the new transaction
        // This would typically be implemented as a separate database operation
        console.log(`Updating category ${insertTransaction.categoryId} with amount ${insertTransaction.amount}`);
      } catch (err) {
        console.error("Error updating category spending:", err);
      }
    }

    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db
      .delete(transactions)
      .where(eq(transactions.id, id));
  }

  // Salary methods
  async getSalaryRecords(): Promise<SalaryRecord[]> {
    const records = await db
      .select()
      .from(salaryRecords)
      .orderBy(desc(salaryRecords.date));

    return records;
  }

  async getSalaryRecord(id: number): Promise<SalaryRecord | undefined> {
    const [record] = await db
      .select()
      .from(salaryRecords)
      .where(eq(salaryRecords.id, id));

    return record;
  }

  async createSalaryRecord(insertSalaryRecord: InsertSalaryRecord): Promise<SalaryRecord> {
    // Extract data from the insert salary record
    const { amount, source, userId } = insertSalaryRecord;

    // Insert record with data
    const [record] = await db
      .insert(salaryRecords)
      .values({
        amount,
        source,
        userId,
        date: new Date()
      })
      .returning();

    return record;
  }

  async updateSalaryRecord(id: number, amount: number): Promise<SalaryRecord> {
    // Fetch existing record to get its data
    const [existingRecord] = await db
      .select()
      .from(salaryRecords)
      .where(eq(salaryRecords.id, id));

    if (!existingRecord) {
      throw new Error(`Salary record with ID ${id} not found`);
    }

    // Update record
    const [updatedRecord] = await db
      .update(salaryRecords)
      .set({ amount })
      .where(eq(salaryRecords.id, id))
      .returning();

    return updatedRecord;
  }

  // Goals methods
  async getGoals(): Promise<Goal[]> {
    const goalsList = await db
      .select()
      .from(goals)
      .orderBy(desc(goals.date));

    return goalsList;
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id));

    return goal;
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    // Insert goal with default values
    const [goal] = await db
      .insert(goals)
      .values({
        ...insertGoal,
        currentAmount: 0,
        date: new Date()
      })
      .returning();

    return goal;
  }

  async updateGoal(id: number, currentAmount: number): Promise<Goal> {
    // Fetch existing goal to get its data
    const [existingGoal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id));

    if (!existingGoal) {
      throw new Error(`Goal with ID ${id} not found`);
    }

    // Update the goal
    const [updatedGoal] = await db
      .update(goals)
      .set({ currentAmount })
      .where(eq(goals.id, id))
      .returning();

    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    await db
      .delete(goals)
      .where(eq(goals.id, id));
  }

  // Savings methods
  async getSavingsRecords(): Promise<SavingsRecord[]> {
    return db
      .select()
      .from(savingsRecords)
      .orderBy(desc(savingsRecords.date));
  }

  async createSavingsRecord(insertSavingsRecord: InsertSavingsRecord): Promise<SavingsRecord> {
    const [record] = await db
      .insert(savingsRecords)
      .values(insertSavingsRecord)
      .returning();

    // If this saving is associated with a goal, update the goal's current amount
    if (record.goalId) {
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.id, record.goalId));

      if (goal) {
        const currentAmount = (goal.currentAmount || 0) + record.amount;
        await this.updateGoal(goal.id, currentAmount);
      }
    }

    return record;
  }

  // Categories methods
  async getCategorySpending(): Promise<CategorySpending[]> {
    // In a real implementation, this would be a query that aggregates spending by category
    // For now, we'll return some sample data
    const categoriesList = await db
      .select()
      .from(categorySpending);

    return categoriesList;
  }

  // AI Insights methods
  async getAiInsights(): Promise<AiInsight[]> {
    return db
      .select()
      .from(aiInsights)
      .orderBy(desc(aiInsights.date));
  }

    // Added method to add AI insights
  async addAiInsights(insights: any[]): Promise<void> {
    for (const insightData of insights) {
      const newInsight: AiInsight = {
        id:  (await db.select({ maxId: max(aiInsights.id) }).from(aiInsights))[0].maxId + 1, //get next id
        date: new Date(),
        title: insightData.title || "Financial Insight",
        description: insightData.description || "",
        type: mapInsightType(insightData.type || "spending"),
        userId: insightData.userId, // Assuming userId is provided in insightData
        actionText: insightData.actionText || "Take Action"
      };

      await db.insert(aiInsights).values(newInsight);
    }
  }


  // Data Management methods
  async deleteAllUserData(): Promise<void> {
    // In a real application, this should be wrapped in a transaction
    await db.delete(transactions);
    await db.delete(salaryRecords);
    await db.delete(goals);
    await db.delete(savingsRecords);
    // Reset category spending but keep categories
    const categories = await db.select().from(categorySpending);
    for (const category of categories) {
      await db
        .update(categorySpending)
        .set({ amount: 0 })
        .where(eq(categorySpending.id, category.id));
    }
    // Clear insights
    await db.delete(aiInsights);
  }

  async exportUserData(): Promise<{
    transactions: Transaction[];
    salaryRecords: SalaryRecord[];
    goals: Goal[];
    savingsRecords: SavingsRecord[];
    categorySpending: CategorySpending[];
    aiInsights: AiInsight[];
  }> {
    // Fetch all data
    const [
      transactionsList,
      salaryRecordsList,
      goalsList,
      savingsRecordsList,
      categorySpendingList,
      aiInsightsList
    ] = await Promise.all([
      this.getTransactions(),
      this.getSalaryRecords(),
      this.getGoals(),
      this.getSavingsRecords(),
      this.getCategorySpending(),
      this.getAiInsights()
    ]);

    return {
      transactions: transactionsList,
      salaryRecords: salaryRecordsList,
      goals: goalsList,
      savingsRecords: savingsRecordsList,
      categorySpending: categorySpendingList,
      aiInsights: aiInsightsList
    };
  }
}

// Memory Storage implementation kept for reference
export class MemStorage implements IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  private users: Map<number, User>;
  private transactionsList: Map<number, Transaction>;
  private salaryRecordsList: Map<number, SalaryRecord>;
  private goalsList: Map<number, Goal>;
  private savingsRecordsList: Map<number, SavingsRecord>;
  private categorySpendingList: Map<number, CategorySpending>;
  private aiInsightsList: Map<number, AiInsight>;

  // IDs for auto-increment
  private currentUserId: number;
  private currentTransactionId: number;
  private currentSalaryId: number;
  private currentGoalId: number;
  private currentSavingsId: number;
  private currentCategoryId: number;
  private currentInsightId: number;

  constructor() {
    // Initialize session store for in-memory storage
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Initialize storage maps
    this.users = new Map();
    this.transactionsList = new Map();
    this.salaryRecordsList = new Map();
    this.goalsList = new Map();
    this.savingsRecordsList = new Map();
    this.categorySpendingList = new Map();
    this.aiInsightsList = new Map();

    // Initialize IDs
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentSalaryId = 1;
    this.currentGoalId = 1;
    this.currentSavingsId = 1;
    this.currentCategoryId = 1;
    this.currentInsightId = 1;

    // Initialize with sample categories for demo
    this.initializeCategories();
    this.initializeAiInsights();
  }

  // Helper to initialize categories for the demo
  private initializeCategories() {
    const categories = [
      { name: "Housing & Utilities", amount: 1250 },
      { name: "Food & Dining", amount: 640.50 },
      { name: "Entertainment", amount: 320.25 },
      { name: "Transportation", amount: 230 }
    ];

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    categories.forEach(cat => {
      const category: CategorySpending = {
        id: this.currentCategoryId++,
        name: cat.name,
        amount: cat.amount,
        userId: 1,
        month: currentMonth,
        year: currentYear,
        category: null
      };
      this.categorySpendingList.set(category.id, category);
    });
  }

  // Helper to initialize AI insights for the demo
  private initializeAiInsights() {
    const insights = [
      { 
        type: "spending_pattern", 
        userId: 1,
        content: "Your dining expenses have increased by 25% this month compared to your 6-month average."
      },
      { 
        type: "saving_opportunity", 
        userId: 1,
        content: "You could save $45/month by consolidating your streaming subscriptions."
      },
      { 
        type: "goal_achievement", 
        userId: 1,
        content: "At your current saving rate, you'll reach your Home Down Payment goal 2 months ahead of schedule."
      }
    ];

    insights.forEach(insight => {
      const aiInsight: AiInsight = {
        id: this.currentInsightId++,
        date: new Date(),
        type: insight.type,
        userId: insight.userId,
        content: insight.content
      };
      this.aiInsightsList.set(aiInsight.id, aiInsight);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      updatedAt: null,
      email: insertUser.email ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      password: insertUser.password, // This is required
      oauthProvider: null,
      oauthId: null,
      mfaEnabled: false,
      mfaSecret: null,
      profilePicture: insertUser.profilePicture ?? null,
      currency: insertUser.currency ?? "USD",
      defaultSalary: insertUser.defaultSalary ?? 0,
      dataEncryptionEnabled: insertUser.dataEncryptionEnabled ?? true,
      dataSharingEnabled: insertUser.dataSharingEnabled ?? false,
      anonymizedAnalytics: insertUser.anonymizedAnalytics ?? true
    };
    this.users.set(id, user);
    return user;
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactionsList.values());
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactionsList.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;

    // Create metaData object
    const metaData = {
      description: insertTransaction.description,
      payee: insertTransaction.payee,
      memo: insertTransaction.memo
    };

    const transaction: Transaction = {
      ...insertTransaction,
      id,
      date: insertTransaction.transactionDate ?? new Date(),
      description: insertTransaction.description ?? null,
      metaData,
      userId: insertTransaction.userId ?? 1,
      createdAt: new Date(),
      updatedAt: null,
      isReconciled: false,
      isPending: false,
      statementId: null,
      currency: insertTransaction.currency ?? "USD",
      payee: insertTransaction.payee ?? null,
      memo: insertTransaction.memo ?? null,
      categoryId: insertTransaction.categoryId ?? null,
      transactionDate: insertTransaction.transactionDate ?? new Date()
    };

    this.transactionsList.set(id, transaction);

    // Update category spending based on new transaction
    this.updateCategorySpending(transaction);

    // Generate AI insights based on transaction patterns
    this.generateTransactionInsights(transaction);

    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    this.transactionsList.delete(id);
  }

  // Salary methods
  async getSalaryRecords(): Promise<SalaryRecord[]> {
    return Array.from(this.salaryRecordsList.values());
  }

  async getSalaryRecord(id: number): Promise<SalaryRecord | undefined> {
    return this.salaryRecordsList.get(id);
  }

  async createSalaryRecord(insertSalaryRecord: InsertSalaryRecord): Promise<SalaryRecord> {
    const id = this.currentSalaryId++;
    const salaryRecord: SalaryRecord = {
      ...insertSalaryRecord,
      id,
      date: new Date(),
      userId: insertSalaryRecord.userId ?? 1,
      source: insertSalaryRecord.source ?? null,
      encryptedData: null
    };
    this.salaryRecordsList.set(id, salaryRecord);
    return salaryRecord;
  }

  async updateSalaryRecord(id: number, amount: number): Promise<SalaryRecord> {
    const record = this.salaryRecordsList.get(id);
    if (!record) {
      throw new Error(`Salary record with ID ${id} not found`);
    }

    const updatedRecord = { ...record, amount };
    this.salaryRecordsList.set(id, updatedRecord);
    return updatedRecord;
  }

  // Goals methods
  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goalsList.values());
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goalsList.get(id);
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = this.currentGoalId++;
    const goal: Goal = {
      ...insertGoal,
      id,
      date: new Date(),
      currentAmount: 0,
      userId: insertGoal.userId ?? 1,
      targetDate: insertGoal.targetDate ?? null
    };
    this.goalsList.set(id, goal);
    return goal;
  }

  async updateGoal(id: number, currentAmount: number): Promise<Goal> {
    const goal = this.goalsList.get(id);
    if (!goal) {
      throw new Error(`Goal with ID ${id} not found`);
    }

    // Update with the new current amount
    const updatedGoal = { ...goal, currentAmount };
    this.goalsList.set(id, updatedGoal);

    // For the memory storage version, we're simplifying
    // and removing the goal insight generation for now

    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    this.goalsList.delete(id);
  }

  // Savings methods
  async getSavingsRecords(): Promise<SavingsRecord[]> {
    return Array.from(this.savingsRecordsList.values());
  }

  async createSavingsRecord(insertSavingsRecord: InsertSavingsRecord): Promise<SavingsRecord> {
    const id = this.currentSavingsId++;
    const savingsRecord: SavingsRecord = {
      ...insertSavingsRecord,
      id,
      date: new Date(),
      userId: insertSavingsRecord.userId ?? 1,
      amount: insertSavingsRecord.amount
    };
    this.savingsRecordsList.set(id, savingsRecord);

    // Note: The schema doesn't support goal relationships directly,
    // but we can still update goals separately if needed in the business logic layer

    return savingsRecord;
  }

  // Categories methods
  async getCategorySpending(): Promise<CategorySpending[]> {
    return Array.from(this.categorySpendingList.values());
  }

  // AI Insights methods
  async getAiInsights(): Promise<AiInsight[]> {
    return Array.from(this.aiInsightsList.values());
  }

  async addAiInsights(insights: any[]): Promise<void> {
    for (const insightData of insights) {
      const insight: AiInsight = {
        id: this.currentInsightId++,
        date: new Date(),
        title: insightData.title || "Financial Insight",
        description: insightData.description || "",
        type: mapInsightType(insightData.type || "spending"),
        userId: insightData.userId, // Assuming userId is provided in insightData
        actionText: insightData.actionText || "Take Action"
      };
      this.aiInsightsList.set(insight.id, insight);
    }
  }

  // Data Management methods
  async deleteAllUserData(): Promise<void> {
    this.transactionsList.clear();
    this.salaryRecordsList.clear();
    this.goalsList.clear();
    this.savingsRecordsList.clear();
    // Keep categories but reset amounts
    Array.from(this.categorySpendingList.values()).forEach(category => {
      category.amount = 0;
    });
    // Reset AI insights but keep some basic ones
    this.aiInsightsList.clear();
    this.initializeAiInsights();
  }

  async exportUserData(): Promise<{
    transactions: Transaction[];
    salaryRecords: SalaryRecord[];
    goals: Goal[];
    savingsRecords: SavingsRecord[];
    categorySpending: CategorySpending[];
    aiInsights: AiInsight[];
  }> {
    return {
      transactions: Array.from(this.transactionsList.values()),
      salaryRecords: Array.from(this.salaryRecordsList.values()),
      goals: Array.from(this.goalsList.values()),
      savingsRecords: Array.from(this.savingsRecordsList.values()),
      categorySpending: Array.from(this.categorySpendingList.values()),
      aiInsights: Array.from(this.aiInsightsList.values())
    };
  }

  // Helper methods
  private updateCategorySpending(transaction: Transaction): void {
    if (transaction.amount >= 0) return; // Skip income transactions

    const amount = Math.abs(transaction.amount);

    // Find category by ID if available
    let category = transaction.categoryId 
      ? Array.from(this.categorySpendingList.values()).find(c => c.id === transaction.categoryId)
      : null;

    // If no category found, get or create one
    if (!category) {
      // Extract category name from meta data if available
      const categoryName = transaction.description || "Uncategorized";

      // Try to find by name
      category = Array.from(this.categorySpendingList.values())
        .find(c => c.name?.toLowerCase() === categoryName.toLowerCase());

      if (!category) {
        // Create new category if it doesn't exist
        const newCategory: CategorySpending = {
          id: this.currentCategoryId++,
          name: categoryName,
          amount: 0,
          userId: transaction.userId,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          category: null
        };
        this.categorySpendingList.set(newCategory.id, newCategory);
        category = newCategory;
      }
    }

    // Update category amount (safely)
    if (category) {
      category.amount += amount;
    }

    // No percentage calculations as the schema doesn't support it
    // Just use the raw amounts for calculations in the frontend
  }

  private generateTransactionInsights(transaction: Transaction): void {
    // Only generate insights for expenses
    if (transaction.amount >= 0) return;

    const categoryId = transaction.categoryId;
    const amount = Math.abs(transaction.amount);

    // Get all transactions in this category
    const categoryTransactions = Array.from(this.transactionsList.values())
      .filter(t => t.categoryId === categoryId && t.amount < 0);

    // If we have multiple transactions in this category, analyze patterns
    if (categoryTransactions.length >= 3) {
      const avgSpending = categoryTransactions
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) / categoryTransactions.length;

      // If this transaction is significantly higher than average
      if (amount > avgSpending * 1.5) {
        // Find the category name from the category list
        const category = Array.from(this.categorySpendingList.values())
          .find(cat => cat.id === categoryId);

        const categoryName = category?.name || "unknown";

        const insight: AiInsight = {
          id: this.currentInsightId++,
          date: new Date(),
          type: "spending_pattern",
          userId: transaction.userId,
          content: `Your recent ${categoryName} expense of $${amount.toFixed(2)} is ${Math.round((amount / avgSpending - 1) * 100)}% higher than your average.`
        };
        this.aiInsightsList.set(insight.id, insight);
      }
    }
  }

  private generateGoalInsight(goal: Goal): void {
    // Safety check for null values
    if (goal.currentAmount === null) {
      return;
    }
    // Use goal's amount field instead of non-existent targetAmount
    const percentComplete = Math.round((goal.currentAmount / goal.amount) * 100);

    let insight: AiInsight;
    // Instead of using a non-existent completed property, check if goal is complete
    const isCompleted = percentComplete >= 100;

    if (isCompleted) {
      insight = {
        id: this.currentInsightId++,
        date: new Date(),
        type: "goal_achievement",
        userId: goal.userId,
        content: `Congratulations! You've reached your "${goal.name}" goal of $${goal.amount.toFixed(2)}.`
      };
    } else {
      insight = {
        id: this.currentInsightId++,
        date: new Date(),
        type: "goal_progress",
        userId: goal.userId,
        content: `You're ${percentComplete}% of the way to your "${goal.name}" goal.`
      };
    }

    this.aiInsightsList.set(insight.id, insight);
  }
}

// Helper function to map AI insight types to our schema types
function mapInsightType(type: string): string {
  const typeMap: Record<string, string> = {
    "spending": "spending_pattern",
    "saving": "saving_opportunity",
    "goal": "goal_achievement",
    "warning": "spending_pattern"
  };

  return typeMap[type] || "spending_pattern";
}

// Switch to the DatabaseStorage implementation
export const storage = new DatabaseStorage();