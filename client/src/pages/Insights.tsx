
import { useMemo, useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import Header from "@/components/layout/Header";
import AiInsightCard from "@/components/insights/AiInsightCard";
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
          if (!t.date) return false;
          const transDate = new Date(t.date);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.amount < 0;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Filter income for this month
      const monthlyIncome = transactions
        .filter(t => {
          if (!t.date) return false;
          const transDate = new Date(t.date);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.amount > 0;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Filter savings for this month
      const monthlySavings = savingsRecords
        .filter(s => {
          if (!s.date) return false;
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
        <div className="bg-background-light border border-white/10 shadow-lg rounded-lg p-3 text-text">
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
        <div className="bg-background-dark backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-3 text-text">
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
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">
      <Header title="Financial Insights" subtitle="Smart analysis of your spending and saving habits" />
      
      {/* AI Insights Section */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-8 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-display text-2xl font-bold">AI Financial Insights</h3>
            <p className="text-text/70 mt-1">Personalized analysis of your financial behavior</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleGenerateInsights}
              disabled={isGeneratingInsights || aiServiceMeta.apiKeyMissing}
              className="text-sm bg-primary hover:bg-primary/80 text-primary-foreground py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingInsights ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white/90 rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3"></path><path d="M18.42 6.5 16.3 8.62"></path><path d="M21 12h-3"></path><path d="M18.42 17.5 16.3 15.38"></path><path d="M12 21v-3"></path><path d="M7.58 17.5 9.7 15.38"></path><path d="M3 12h3"></path><path d="M7.58 6.5 9.7 8.62"></path></svg>
                  Generate Insights
                </>
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <div className="text-accent text-lg">🤖</div>
            </div>
          </div>
        </div>
        
        {/* API Key Status Banner */}
        {aiServiceMeta.apiKeyMissing && (
          <div className="mb-8 p-5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-lg flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <span className="font-medium">AI features are limited. Contact your administrator to set up the Groq API key.</span>
          </div>
        )}
        
        {/* Error Message */}
        {aiServiceMeta.error && (
          <div className="mb-8 p-5 bg-destructive/20 border border-destructive/30 text-destructive-foreground rounded-lg flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
              <path d="m9 9 6 6"></path>
              <path d="m15 9-6 6"></path>
            </svg>
            <span className="font-medium">{aiServiceMeta.error}</span>
          </div>
        )}
        
        {aiInsights.length === 0 ? (
          <div className="text-center py-16 bg-background-dark/30 rounded-xl">
            <div className="w-20 h-20 bg-background-light/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/50">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <p className="text-text/80 text-xl font-medium">No insights available yet</p>
            <p className="text-base mt-3 text-text/60 max-w-md mx-auto">
              {aiServiceMeta.apiKeyMissing 
                ? "AI features require a Groq API key to function properly." 
                : "Add more financial data to get personalized AI insights!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeleton placeholders
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-background-light/60 shadow-lg p-6 animate-pulse">
                  <div className="h-5 bg-white/10 rounded w-2/3 mb-4"></div>
                  <div className="h-20 bg-white/5 rounded mb-4"></div>
                  <div className="h-9 bg-white/10 rounded w-full mt-4"></div>
                </div>
              ))
            ) : (
              aiInsights.map(insight => (
                <AiInsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Monthly Trends Chart */}
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-8 mb-8">
        <h3 className="font-display text-2xl font-bold mb-8">Monthly Financial Trends</h3>
        
        <div className="h-[450px]">
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
                width={80}
                tickFormatter={(value) => formatCurrency(value, false)}
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
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-8 mb-8">
        <h3 className="font-display text-2xl font-bold mb-8">Spending Distribution</h3>
        
        {categorySpending.length === 0 ? (
          <div className="text-center py-16 bg-background-dark/30 rounded-xl">
            <div className="w-20 h-20 bg-background-light/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/50">
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2"></path>
                <path d="M12 21v2"></path>
                <path d="M4.22 4.22l1.42 1.42"></path>
                <path d="M18.36 18.36l1.42 1.42"></path>
                <path d="M1 12h2"></path>
                <path d="M21 12h2"></path>
                <path d="M4.22 19.78l1.42-1.42"></path>
                <path d="M18.36 5.64l1.42-1.42"></path>
              </svg>
            </div>
            <p className="text-text/80 text-xl font-medium">No spending data available yet</p>
            <p className="text-base mt-3 text-text/60">Add transactions to see your spending distribution!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-[400px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1 }}
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
            
            <div className="flex flex-col">
              <h4 className="font-medium text-xl mb-6">Top Spending Categories</h4>
              <div className="space-y-6 mb-6">
                {categorySpending.slice(0, 4).map((category, index) => (
                  <div key={category.id} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="font-mono font-medium">{formatCurrency(category.amount)}</span>
                      </div>
                      <div className="w-full bg-background-dark/50 h-2 rounded-full mt-2">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${category.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length] 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-text/70 mt-1">{category.percentage}% of total spending</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto p-6 bg-background-dark/40 backdrop-blur-sm rounded-lg border border-white/5">
                <h4 className="font-medium text-lg mb-4">Spending Insights</h4>
                <ul className="space-y-4 text-text/90">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary mt-1">•</span>
                    <span>
                      {categorySpending[0]?.name} is your largest spending category at {formatCurrency(categorySpending[0]?.amount)}.
                    </span>
                  </li>
                  {(() => {
                    const increasedCategory = categorySpending.find(c => c.changePercentage !== null && c.changePercentage > 0);
                    return increasedCategory && (
                      <li className="flex items-start">
                        <span className="mr-2 text-destructive mt-1">•</span>
                        <span>
                          {increasedCategory.name} spending increased by {increasedCategory.changePercentage || 0}% this month.
                        </span>
                      </li>
                    );
                  })()}
                  
                  {(() => {
                    const decreasedCategory = categorySpending.find(c => c.changePercentage !== null && c.changePercentage < 0);
                    return decreasedCategory && (
                      <li className="flex items-start">
                        <span className="mr-2 text-secondary mt-1">•</span>
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
    </div>
  );
}
