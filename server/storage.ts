import { 
  users, type User, type InsertUser,
  transactions, type Transaction, type InsertTransaction,
  salaryRecords, type SalaryRecord, type InsertSalaryRecord,
  goals, type Goal, type InsertGoal,
  savingsRecords, type SavingsRecord, type InsertSavingsRecord,
  categorySpending, type CategorySpending,
  aiInsights, type AiInsight
} from "@shared/schema";

// Interfaces for all storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
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
      { name: "Housing & Utilities", amount: 1250, percentage: 35, changePercentage: -2 },
      { name: "Food & Dining", amount: 640.50, percentage: 22, changePercentage: 5 },
      { name: "Entertainment", amount: 320.25, percentage: 18, changePercentage: 0 },
      { name: "Transportation", amount: 230, percentage: 15, changePercentage: -1 }
    ];
    
    categories.forEach(cat => {
      const category: CategorySpending = {
        id: this.currentCategoryId++,
        name: cat.name,
        amount: cat.amount,
        percentage: cat.percentage,
        changePercentage: cat.changePercentage
      };
      this.categorySpendingList.set(category.id, category);
    });
  }
  
  // Helper to initialize AI insights for the demo
  private initializeAiInsights() {
    const insights = [
      { 
        type: "spending_pattern", 
        title: "Spending Pattern Detected", 
        description: "Your dining expenses have increased by 25% this month compared to your 6-month average.",
        actionText: "Get Budget Tips"
      },
      { 
        type: "saving_opportunity", 
        title: "Saving Opportunity", 
        description: "You could save $45/month by consolidating your streaming subscriptions.",
        actionText: "View Analysis"
      },
      { 
        type: "goal_achievement", 
        title: "Goal Achievement", 
        description: "At your current saving rate, you'll reach your \"Home Down Payment\" goal 2 months ahead of schedule.",
        actionText: "Adjust Goals"
      }
    ];
    
    insights.forEach(insight => {
      const aiInsight: AiInsight = {
        id: this.currentInsightId++,
        date: new Date().toISOString(),
        type: insight.type,
        title: insight.title,
        description: insight.description,
        actionText: insight.actionText
      };
      this.aiInsightsList.set(aiInsight.id, aiInsight);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
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
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      date: new Date().toISOString()
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
      date: new Date().toISOString()
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
      date: new Date().toISOString(),
      currentAmount: 0,
      completed: false
    };
    this.goalsList.set(id, goal);
    return goal;
  }
  
  async updateGoal(id: number, currentAmount: number): Promise<Goal> {
    const goal = this.goalsList.get(id);
    if (!goal) {
      throw new Error(`Goal with ID ${id} not found`);
    }
    
    const completed = currentAmount >= goal.targetAmount;
    const updatedGoal = { ...goal, currentAmount, completed };
    this.goalsList.set(id, updatedGoal);
    
    // Generate AI insight when a goal is close to completion or completed
    if (completed || (currentAmount / goal.targetAmount >= 0.9)) {
      this.generateGoalInsight(updatedGoal);
    }
    
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
      date: new Date().toISOString()
    };
    this.savingsRecordsList.set(id, savingsRecord);
    
    // If this saving is associated with a goal, update the goal's current amount
    if (savingsRecord.goalId) {
      const goal = this.goalsList.get(savingsRecord.goalId);
      if (goal) {
        this.updateGoal(savingsRecord.goalId, goal.currentAmount + savingsRecord.amount);
      }
    }
    
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
  
  // Data Management methods
  async deleteAllUserData(): Promise<void> {
    this.transactionsList.clear();
    this.salaryRecordsList.clear();
    this.goalsList.clear();
    this.savingsRecordsList.clear();
    // Keep categories but reset amounts
    for (const category of this.categorySpendingList.values()) {
      category.amount = 0;
      category.percentage = 0;
      category.changePercentage = 0;
    }
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
    let category = Array.from(this.categorySpendingList.values())
      .find(c => c.name.toLowerCase() === transaction.category.toLowerCase());
    
    if (!category) {
      // Create new category if it doesn't exist
      category = {
        id: this.currentCategoryId++,
        name: transaction.category,
        amount: 0,
        percentage: 0,
        changePercentage: 0
      };
      this.categorySpendingList.set(category.id, category);
    }
    
    // Update category amount
    category.amount += amount;
    
    // Recalculate percentages for all categories
    const totalSpending = Array.from(this.categorySpendingList.values())
      .reduce((sum, cat) => sum + cat.amount, 0);
    
    for (const cat of this.categorySpendingList.values()) {
      if (totalSpending > 0) {
        cat.percentage = Math.round((cat.amount / totalSpending) * 100);
      } else {
        cat.percentage = 0;
      }
    }
  }
  
  private generateTransactionInsights(transaction: Transaction): void {
    // Only generate insights for expenses
    if (transaction.amount >= 0) return;
    
    const category = transaction.category;
    const amount = Math.abs(transaction.amount);
    
    // Get all transactions in this category
    const categoryTransactions = Array.from(this.transactionsList.values())
      .filter(t => t.category === category && t.amount < 0);
    
    // If we have multiple transactions in this category, analyze patterns
    if (categoryTransactions.length >= 3) {
      const avgSpending = categoryTransactions
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) / categoryTransactions.length;
      
      // If this transaction is significantly higher than average
      if (amount > avgSpending * 1.5) {
        const insight: AiInsight = {
          id: this.currentInsightId++,
          date: new Date().toISOString(),
          type: "spending_pattern",
          title: `High ${category} Spending Detected`,
          description: `Your recent ${category} expense of $${amount.toFixed(2)} is ${Math.round((amount / avgSpending - 1) * 100)}% higher than your average.`,
          actionText: "View Spending Tips"
        };
        this.aiInsightsList.set(insight.id, insight);
      }
    }
  }
  
  private generateGoalInsight(goal: Goal): void {
    const percentComplete = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    
    let insight: AiInsight;
    if (goal.completed) {
      insight = {
        id: this.currentInsightId++,
        date: new Date().toISOString(),
        type: "goal_achievement",
        title: "Goal Completed! 🎉",
        description: `Congratulations! You've reached your "${goal.name}" goal of ${goal.targetAmount.toFixed(2)}.`,
        actionText: "Set New Goal"
      };
    } else {
      insight = {
        id: this.currentInsightId++,
        date: new Date().toISOString(),
        type: "goal_achievement",
        title: "Almost There!",
        description: `You're ${percentComplete}% of the way to your "${goal.name}" goal.`,
        actionText: "Review Goal"
      };
    }
    
    this.aiInsightsList.set(insight.id, insight);
  }
}

export const storage = new MemStorage();
