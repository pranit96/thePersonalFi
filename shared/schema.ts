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
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  merchant: true,
  amount: true,
  category: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Salary Records
export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: real("amount").notNull(),
  source: text("source").default("Primary Job"),
});

export const insertSalaryRecordSchema = createInsertSchema(salaryRecords).pick({
  amount: true,
  source: true,
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
});

export const insertGoalSchema = createInsertSchema(goals).pick({
  name: true,
  targetAmount: true,
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
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
