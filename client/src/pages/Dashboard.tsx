import { useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import Header from "@/components/layout/Header";
import FinancialSummaryCard from "@/components/cards/FinancialSummaryCard";
import WeeklySpendingChart from "@/components/charts/WeeklySpendingChart";
import GoalProgressCard from "@/components/goals/GoalProgressCard";
import TransactionItem from "@/components/transactions/TransactionItem";
import AiInsightCard from "@/components/insights/AiInsightCard";
import SpendingCategoriesChart from "@/components/charts/SpendingCategoriesChart";
import { Wallet, CreditCard, PiggyBank, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { 
    transactions, 
    salaryRecords, 
    goals, 
    savingsRecords, 
    categorySpending, 
    aiInsights,
    isLoading
  } = useFinance();
  
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 4);
  }, [transactions]);
  
  // Calculate monthly income, expenses, savings, and investments
  const monthlyIncome = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return transactions
      .filter(t => new Date(t.date).getMonth() === currentMonth && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  
  const monthlyExpenses = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return transactions
      .filter(t => new Date(t.date).getMonth() === currentMonth && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);
  
  const monthlySavings = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return savingsRecords
      .filter(s => new Date(s.date).getMonth() === currentMonth)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [savingsRecords]);
  
  const totalInvestments = useMemo(() => {
    return 12480.33; // Mock value for now
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text font-medium">Loading your financial data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Header 
        title="Financial Overview" 
        subtitle="Track your progress and stay on top of your finances" 
      />
      
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <FinancialSummaryCard
          title="Monthly Income"
          amount={monthlyIncome}
          icon={<Wallet className="text-primary" />}
          change={12}
          iconBackground="bg-primary/20"
        />
        
        <FinancialSummaryCard
          title="Expenses"
          amount={monthlyExpenses}
          icon={<CreditCard className="text-accent" />}
          change={8}
          iconBackground="bg-accent/20"
        />
        
        <FinancialSummaryCard
          title="Savings"
          amount={monthlySavings}
          icon={<PiggyBank className="text-secondary" />}
          change={4}
          iconBackground="bg-secondary/20"
        />
        
        <FinancialSummaryCard
          title="Investments"
          amount={totalInvestments}
          icon={<TrendingUp className="text-primary" />}
          change={7.2}
          compareText="total growth"
          iconBackground="bg-primary/20"
        />
      </div>
      
      {/* Weekly spending and saving charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-8">
        <div className="lg:col-span-4">
          <WeeklySpendingChart transactions={transactions} />
        </div>
        
        <div className="lg:col-span-3">
          <GoalProgressCard goals={goals} />
        </div>
      </div>
      
      {/* Recent transactions and AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-8">
        <div className="lg:col-span-4 bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold">Recent Transactions</h3>
            <Link href="/transactions">
              <a className="text-xs text-primary hover:underline">View all</a>
            </Link>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-text/70">
              <p>No transactions yet.</p>
              <p className="text-sm mt-2">Start tracking your spending!</p>
            </div>
          ) : (
            recentTransactions.map(transaction => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          )}
        </div>
        
        <div className="lg:col-span-3 bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5">
          <div className="flex items-center mb-6">
            <h3 className="font-display font-bold flex-1">AI Insights</h3>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
              <div className="text-accent">🤖</div>
            </div>
          </div>
          
          {aiInsights.length === 0 ? (
            <div className="text-center py-8 text-text/70">
              <p>No insights yet.</p>
              <p className="text-sm mt-2">Add more transactions to get personalized insights!</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-full">
              {aiInsights.map(insight => (
                <AiInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Spending categories */}
      <SpendingCategoriesChart categories={categorySpending} />
      
      {/* Privacy notice */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-4">
        <div className="flex items-start">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mt-1 mr-4">
            <ShieldCheck className="text-secondary" />
          </div>
          <div>
            <h3 className="font-display font-bold mb-2">Your Data is Secure</h3>
            <p className="text-sm text-text/70 mb-3">
              All your financial data is encrypted and stored securely. We never share your information with third parties, and you can delete your data at any time.
            </p>
            <div className="flex space-x-3">
              <Link href="/privacy">
                <Button variant="ghost" className="text-xs px-3 py-1 rounded-full bg-secondary/20 text-secondary h-auto">
                  Privacy Settings
                </Button>
              </Link>
              <Button variant="ghost" className="text-xs px-3 py-1 rounded-full bg-white/10 text-text/70 h-auto">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
