import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  merchant: text("merchant").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  encryptedData: text("encrypted_data"), // For encrypted version of sensitive data
  userId: integer("user_id").notNull().default(1), // Default to 1 for demo purposes
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  merchant: true,
  amount: true,
  category: true,
  description: true,
  encryptedData: true,
  userId: true,
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
  date: timestamp("date").defaultNow().notNull(),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").default(0).notNull(),
  completed: boolean("completed").default(false),
  encryptedData: text("encrypted_data"), // For encrypted goal data
  userId: integer("user_id").notNull().default(1), // Default to 1 for demo purposes
  isPrivate: boolean("is_private").default(true).notNull(), // Privacy control
});

export const insertGoalSchema = createInsertSchema(goals).pick({
  name: true,
  targetAmount: true,
  encryptedData: true,
  userId: true,
  isPrivate: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Savings Records
export const savingsRecords = pgTable("savings_records", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  goalId: integer("goal_id"),
});

export const insertSavingsRecordSchema = createInsertSchema(savingsRecords).pick({
  amount: true,
  description: true,
  goalId: true,
});

export type InsertSavingsRecord = z.infer<typeof insertSavingsRecordSchema>;
export type SavingsRecord = typeof savingsRecords.$inferSelect;

// Category Spending (for analytics)
export const categorySpending = pgTable("category_spending", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  percentage: real("percentage").notNull(),
  changePercentage: real("change_percentage").default(0),
});

export type CategorySpending = typeof categorySpending.$inferSelect;

// AI Insights
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  type: text("type").notNull(), // spending_pattern, saving_opportunity, goal_achievement
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionText: text("action_text").notNull(),
});

export type AiInsight = typeof aiInsights.$inferSelect;

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Will store hashed password
  email: text("email"),
  dataEncryptionEnabled: boolean("data_encryption_enabled").default(true).notNull(),
  dataSharingEnabled: boolean("data_sharing_enabled").default(false).notNull(),
  anonymizedAnalytics: boolean("anonymized_analytics").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  dataEncryptionEnabled: true,
  dataSharingEnabled: true,
  anonymizedAnalytics: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
