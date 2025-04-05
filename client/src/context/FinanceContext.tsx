import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  type Transaction, 
  type SalaryRecord, 
  type Goal,
  type SavingsRecord,
  type CategorySpending,
  type AiInsight
} from "@shared/schema";

// Type for AI-generated goal advice
interface GoalAdvice {
  title: string;
  description: string;
  goalName: string;
  timeframe: string;
  actionText: string;
}

interface FinanceContextType {
  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id" | "date">) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  
  // Salary
  salaryRecords: SalaryRecord[];
  addSalaryRecord: (record: Omit<SalaryRecord, "id" | "date">) => Promise<void>;
  updateSalaryRecord: (id: number, amount: number) => Promise<void>;
  
  // Goals
  goals: Goal[];
  goalAdvice?: GoalAdvice[];
  hasGoalAdvice: boolean;
  addGoal: (goal: Omit<Goal, "id" | "date" | "currentAmount">) => Promise<void>;
  updateGoal: (id: number, currentAmount: number) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  
  // Savings
  savingsRecords: SavingsRecord[];
  addSavingsRecord: (record: Omit<SavingsRecord, "id" | "date">) => Promise<void>;
  
  // Categories
  categorySpending: CategorySpending[];
  
  // AI Insights
  aiInsights: AiInsight[];
  
  // Loading states
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Query hooks
  const { 
    data: transactions = [] as Transaction[],
    isLoading: isLoadingTransactions
  } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!user, // Only run query if user is authenticated
  });
  
  const {
    data: salaryRecords = [] as SalaryRecord[],
    isLoading: isLoadingSalary
  } = useQuery<SalaryRecord[]>({
    queryKey: ['/api/salary'],
    enabled: !!user,
  });
  
  // Updated query to handle the new response format with advice
  const {
    data: goalsResponse = { goals: [] as Goal[], advice: [], hasAdvice: false },
    isLoading: isLoadingGoals
  } = useQuery<{ goals: Goal[], advice?: any[], hasAdvice: boolean }>({
    queryKey: ['/api/goals'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?advice=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      return await response.json();
    },
    enabled: !!user,
  });
  
  const {
    data: savingsRecords = [] as SavingsRecord[],
    isLoading: isLoadingSavings
  } = useQuery<SavingsRecord[]>({
    queryKey: ['/api/savings'],
    enabled: !!user,
  });
  
  const {
    data: categorySpending = [] as CategorySpending[],
    isLoading: isLoadingCategories
  } = useQuery<CategorySpending[]>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });
  
  const {
    data: aiInsights = [] as AiInsight[],
    isLoading: isLoadingInsights
  } = useQuery<AiInsight[]>({
    queryKey: ['/api/insights'],
    enabled: !!user,
  });
  
  // Mutations for transactions
  const addTransactionMutation = useMutation({
    mutationFn: (transaction: Omit<Transaction, "id" | "date">) => 
      apiRequest('POST', '/api/transactions', transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    }
  });
  
  const deleteTransactionMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    }
  });
  
  // Mutations for salary
  const addSalaryMutation = useMutation({
    mutationFn: (record: Omit<SalaryRecord, "id" | "date">) => 
      apiRequest('POST', '/api/salary', record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/salary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    }
  });
  
  const updateSalaryMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number, amount: number }) => 
      apiRequest('PUT', `/api/salary/${id}`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/salary'] });
    }
  });
  
  // Mutations for goals
  const addGoalMutation = useMutation({
    mutationFn: (goal: Omit<Goal, "id" | "date" | "currentAmount">) => 
      apiRequest('POST', '/api/goals', goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    }
  });
  
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, currentAmount }: { id: number, currentAmount: number }) => 
      apiRequest('PUT', `/api/goals/${id}`, { currentAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    }
  });
  
  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    }
  });
  
  // Mutations for savings
  const addSavingsMutation = useMutation({
    mutationFn: (record: Omit<SavingsRecord, "id" | "date">) => 
      apiRequest('POST', '/api/savings', record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    }
  });
  
  const isLoading = isLoadingTransactions || 
    isLoadingSalary || 
    isLoadingGoals || 
    isLoadingSavings || 
    isLoadingCategories ||
    isLoadingInsights;
  
  // Create typed value object to avoid TypeScript errors
  const contextValue: FinanceContextType = {
    // Transactions
    transactions: transactions as Transaction[],
    addTransaction: async (transaction) => {
      await addTransactionMutation.mutateAsync(transaction);
    },
    deleteTransaction: async (id) => {
      await deleteTransactionMutation.mutateAsync(id);
    },
    
    // Salary
    salaryRecords: salaryRecords as SalaryRecord[],
    addSalaryRecord: async (record) => {
      await addSalaryMutation.mutateAsync(record);
    },
    updateSalaryRecord: async (id, amount) => {
      await updateSalaryMutation.mutateAsync({ id, amount });
    },
    
    // Goals with AI advice
    goals: goalsResponse.goals,
    goalAdvice: goalsResponse.advice,
    hasGoalAdvice: goalsResponse.hasAdvice,
    addGoal: async (goal) => {
      await addGoalMutation.mutateAsync(goal);
    },
    updateGoal: async (id, currentAmount) => {
      await updateGoalMutation.mutateAsync({ id, currentAmount });
    },
    deleteGoal: async (id) => {
      await deleteGoalMutation.mutateAsync(id);
    },
    
    // Savings
    savingsRecords: savingsRecords as SavingsRecord[],
    addSavingsRecord: async (record) => {
      await addSavingsMutation.mutateAsync(record);
    },
    
    // Categories
    categorySpending: categorySpending as CategorySpending[],
    
    // AI Insights
    aiInsights: aiInsights as AiInsight[],
    
    // Loading states
    isLoading
  };

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
}
