import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  amount: real("amount").notNull(),
  userId: integer("user_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  metaData: jsonb("meta_data"),
  categoryId: integer("category_id"),
  isReconciled: boolean("is_reconciled").default(false),
  isPending: boolean("is_pending").default(false),
  transactionDate: timestamp("transaction_date"),
  statementId: integer("statement_id"),
  currency: text("currency").default("USD"),
  description: text("description"),
  payee: text("payee"),
  memo: text("memo"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  amount: true,
  userId: true,
  currency: true,
  description: true,
  payee: true,
  memo: true,
  categoryId: true,
  transactionDate: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Salary Records
export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: real("amount").notNull(),
  source: text("source").default("Primary Job"),
  encryptedData: text("encrypted_data"), // For encrypted salary data
  userId: integer("user_id").notNull().default(1), // Default to 1 for demo purposes
});

export const insertSalaryRecordSchema = createInsertSchema(salaryRecords).pick({
  amount: true,
  source: true,
  encryptedData: true,
  userId: true,
});

export type InsertSalaryRecord = z.infer<typeof insertSalaryRecordSchema>;
export type SalaryRecord = typeof salaryRecords.$inferSelect;

// Goals
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(), // Target amount
  currentAmount: real("current_amount").default(0),
  userId: integer("user_id").notNull().default(1),
  targetDate: timestamp("target_date"),
  date: timestamp("date").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goals)
  .pick({
    name: true,
    amount: true, // Target amount
    userId: true,
    targetDate: true,
    date: true,
  })
  .transform((data) => {
    // Convert targetDate from string to Date if needed
    if (data.targetDate && typeof data.targetDate === 'string') {
      return {
        ...data,
        targetDate: new Date(data.targetDate)
      };
    }
    return data;
  });

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Savings Records
export const savingsRecords = pgTable("savings_records", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: real("amount").notNull(),
  userId: integer("user_id").notNull().default(1),
});

export const insertSavingsRecordSchema = createInsertSchema(savingsRecords).pick({
  amount: true,
  userId: true,
});

export type InsertSavingsRecord = z.infer<typeof insertSavingsRecordSchema>;
export type SavingsRecord = typeof savingsRecords.$inferSelect;

// Category Spending (for analytics)
export const categorySpending = pgTable("category_spending", {
  id: serial("id").primaryKey(),
  name: text("name"),
  amount: real("amount").notNull(),
  userId: integer("user_id"),
  month: integer("month"),
  year: integer("year"),
  category: text("category"),
});

export type CategorySpending = typeof categorySpending.$inferSelect;

// AI Insights
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // spending_pattern, saving_opportunity, goal_achievement
  content: text("content").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export type AiInsight = typeof aiInsights.$inferSelect;

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  password: text("password").notNull(), // Will store hashed password
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  profilePicture: text("profile_picture"),
  currency: text("currency").default("USD"),
  defaultSalary: real("default_salary").default(0),
  dataEncryptionEnabled: boolean("data_encryption_enabled").default(true),
  dataSharingEnabled: boolean("data_sharing_enabled").default(false),
  anonymizedAnalytics: boolean("anonymized_analytics").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  // Custom security features added as virtual properties in TypeScript types
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  password: true,
  profilePicture: true,
  currency: true,
  defaultSalary: true,
  dataEncryptionEnabled: true,
  dataSharingEnabled: true,
  anonymizedAnalytics: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
