import { useMemo, useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import Header from "@/components/layout/Header";
import AiInsightCard from "@/components/insights/AiInsightCard";
import { CategorySpending } from "@shared/schema";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#6366F1", "#10B981", "#EC4899", "#F59E0B", "#3B82F6", "#EF4444"];

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Insights() {
  const { toast } = useToast();
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const { 
    transactions, 
    salaryRecords, 
    goals, 
    savingsRecords, 
    categorySpending, 
    aiInsights,
    aiServiceMeta,
    isLoading,
    refreshInsights
  } = useFinance();
  
  const monthlySpendingData = useMemo(() => {
    // Create data for the last 6 months
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      
      // Filter transactions for this month
      const monthlyExpenses = transactions
        .filter(t => {
          const transDate = new Date(t.date);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.amount < 0;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Filter income for this month
      const monthlyIncome = transactions
        .filter(t => {
          const transDate = new Date(t.date);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.amount > 0;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Filter savings for this month
      const monthlySavings = savingsRecords
        .filter(s => {
          const saveDate = new Date(s.date);
          return saveDate.getMonth() === month.getMonth() && 
                 saveDate.getFullYear() === month.getFullYear();
        })
        .reduce((sum, s) => sum + s.amount, 0);
      
      data.push({
        name: monthName,
        expenses: monthlyExpenses,
        income: monthlyIncome,
        savings: monthlySavings
      });
    }
    
    return data;
  }, [transactions, savingsRecords]);
  
  const categoryData = useMemo(() => {
    return categorySpending.map(category => ({
      name: category.name,
      value: category.amount,
      percentage: category.percentage
    }));
  }, [categorySpending]);
  
  // Function to manually generate insights
  const handleGenerateInsights = async () => {
    if (isGeneratingInsights || aiServiceMeta.apiKeyMissing) return;
    
    setIsGeneratingInsights(true);
    try {
      await apiRequest('POST', '/api/insights/generate', {});
      // Refresh insights data
      await refreshInsights();
      toast({
        title: "Insights Generated",
        description: "New financial insights have been generated based on your data.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate insights. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-light/95 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 text-text">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs">{payload[0].payload.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };
  
  const MonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-dark/95 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-3 text-text">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm my-1" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text font-medium">Analyzing your financial data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Header title="Financial Insights" subtitle="Smart analysis of your spending and saving habits" />
      
      {/* AI Insights Section */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
        <div className="flex items-center mb-6">
          <h3 className="font-display font-bold flex-1">AI Financial Insights</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGenerateInsights}
              disabled={isGeneratingInsights || aiServiceMeta.apiKeyMissing}
              className="text-xs bg-primary hover:bg-primary/80 text-primary-foreground py-1 px-3 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingInsights ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white/90 rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3"></path><path d="M18.42 6.5 16.3 8.62"></path><path d="M21 12h-3"></path><path d="M18.42 17.5 16.3 15.38"></path><path d="M12 21v-3"></path><path d="M7.58 17.5 9.7 15.38"></path><path d="M3 12h3"></path><path d="M7.58 6.5 9.7 8.62"></path></svg>
                  Generate Insights
                </>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
              <div className="text-accent">🤖</div>
            </div>
          </div>
        </div>
        
        {/* API Key Status Banner */}
        {aiServiceMeta.apiKeyMissing && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <span>AI features are limited. Contact your administrator to set up the Groq API key.</span>
          </div>
        )}
        
        {/* AI Status Info - Simplified */}
        {aiServiceMeta.apiKeyMissing && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <span>AI features are limited. Contact your administrator to set up the AI API key.</span>
          </div>
        )}
        
        {/* Error Message */}
        {aiServiceMeta.error && (
          <div className="mb-4 p-3 bg-destructive/20 border border-destructive/30 text-destructive-foreground rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
              <path d="m9 9 6 6"></path>
              <path d="m15 9-6 6"></path>
            </svg>
            <span>{aiServiceMeta.error}</span>
          </div>
        )}
        
        {aiInsights.length === 0 ? (
          <div className="text-center py-8 text-text/70">
            <p>No insights available yet.</p>
            <p className="text-sm mt-2">
              {aiServiceMeta.apiKeyMissing 
                ? "AI features require a Groq API key to function properly." 
                : "Add more financial data to get personalized AI insights!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {aiInsights.map(insight => (
              <AiInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
      
      {/* Monthly Trends Chart */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
        <h3 className="font-display font-bold mb-6">Monthly Financial Trends</h3>
        
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlySpendingData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(248, 250, 252, 0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(248, 250, 252, 0.7)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(248, 250, 252, 0.7)', fontSize: 12 }}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="text-text">{value}</span>}
              />
              <Bar dataKey="income" name="Income" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Spending Distribution */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
        <h3 className="font-display font-bold mb-6">Spending Distribution</h3>
        
        {categorySpending.length === 0 ? (
          <div className="text-center py-8 text-text/70">
            <p>No spending data available yet.</p>
            <p className="text-sm mt-2">Add transactions to see your spending distribution!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Top Spending Categories</h4>
              <div className="space-y-4">
                {categorySpending.slice(0, 4).map((category, index) => (
                  <div key={category.id} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm">{category.name}</span>
                        <span className="text-sm font-mono">{formatCurrency(category.amount)}</span>
                      </div>
                      <div className="text-xs text-text/70">{category.percentage}% of total spending</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-background-dark/30 rounded-lg">
                <h4 className="font-medium mb-2">Spending Insights</h4>
                <ul className="text-sm space-y-2 text-text/80">
                  <li className="flex">
                    <span className="mr-2">•</span>
                    <span>
                      {categorySpending[0]?.name} is your largest spending category at {formatCurrency(categorySpending[0]?.amount)}.
                    </span>
                  </li>
                  {(() => {
                    const increasedCategory = categorySpending.find(c => c.changePercentage !== null && c.changePercentage > 0);
                    return increasedCategory && (
                      <li className="flex">
                        <span className="mr-2">•</span>
                        <span>
                          {increasedCategory.name} spending increased by {increasedCategory.changePercentage || 0}% this month.
                        </span>
                      </li>
                    );
                  })()}
                  
                  {(() => {
                    const decreasedCategory = categorySpending.find(c => c.changePercentage !== null && c.changePercentage < 0);
                    return decreasedCategory && (
                      <li className="flex text-secondary">
                        <span className="mr-2">•</span>
                        <span>
                          Great job! You reduced {decreasedCategory.name} spending by {Math.abs(decreasedCategory.changePercentage || 0)}%.
                        </span>
                      </li>
                    );
                  })()}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
