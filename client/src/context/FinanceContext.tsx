import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  type Transaction, 
  type SalaryRecord, 
  type Goal,
  type SavingsRecord,
  type CategorySpending,
  type AiInsight
} from "@shared/schema";

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
  // Query hooks
  const { 
    data: transactions = [],
    isLoading: isLoadingTransactions
  } = useQuery({
    queryKey: ['/api/transactions'],
  });
  
  const {
    data: salaryRecords = [],
    isLoading: isLoadingSalary
  } = useQuery({
    queryKey: ['/api/salary'],
  });
  
  const {
    data: goals = [],
    isLoading: isLoadingGoals
  } = useQuery({
    queryKey: ['/api/goals'],
  });
  
  const {
    data: savingsRecords = [],
    isLoading: isLoadingSavings
  } = useQuery({
    queryKey: ['/api/savings'],
  });
  
  const {
    data: categorySpending = [],
    isLoading: isLoadingCategories
  } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  const {
    data: aiInsights = [],
    isLoading: isLoadingInsights
  } = useQuery({
    queryKey: ['/api/insights'],
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
  
  return (
    <FinanceContext.Provider
      value={{
        // Transactions
        transactions,
        addTransaction: async (transaction) => {
          await addTransactionMutation.mutateAsync(transaction);
        },
        deleteTransaction: async (id) => {
          await deleteTransactionMutation.mutateAsync(id);
        },
        
        // Salary
        salaryRecords,
        addSalaryRecord: async (record) => {
          await addSalaryMutation.mutateAsync(record);
        },
        updateSalaryRecord: async (id, amount) => {
          await updateSalaryMutation.mutateAsync({ id, amount });
        },
        
        // Goals
        goals,
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
        savingsRecords,
        addSavingsRecord: async (record) => {
          await addSavingsMutation.mutateAsync(record);
        },
        
        // Categories
        categorySpending,
        
        // AI Insights
        aiInsights,
        
        // Loading states
        isLoading
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}
