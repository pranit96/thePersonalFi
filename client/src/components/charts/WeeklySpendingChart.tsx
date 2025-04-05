import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { Transaction } from "@shared/schema";
import { getDayOfWeek } from "@/lib/utils";

interface WeeklySpendingChartProps {
  transactions: Transaction[];
}

export default function WeeklySpendingChart({ transactions }: WeeklySpendingChartProps) {
  const chartData = useMemo(() => {
    // Get the past 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date,
        day: getDayOfWeek(date),
        expenses: 0,
        average: 0,
        isPeak: false
      };
    });
    
    // Group transactions by day
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const dayIndex = days.findIndex(d => 
        d.date.getDate() === transactionDate.getDate() && 
        d.date.getMonth() === transactionDate.getMonth() &&
        d.date.getFullYear() === transactionDate.getFullYear()
      );
      
      if (dayIndex >= 0 && transaction.amount < 0) {
        days[dayIndex].expenses += Math.abs(transaction.amount);
      }
    });
    
    // Calculate average and find peak day
    const totalSpending = days.reduce((sum, day) => sum + day.expenses, 0);
    const averageSpending = totalSpending / days.filter(day => day.expenses > 0).length || 0;
    
    let maxExpense = 0;
    let maxExpenseIndex = -1;
    
    days.forEach((day, index) => {
      day.average = averageSpending;
      if (day.expenses > maxExpense) {
        maxExpense = day.expenses;
        maxExpenseIndex = index;
      }
    });
    
    if (maxExpenseIndex >= 0) {
      days[maxExpenseIndex].isPeak = true;
    }
    
    return days;
  }, [transactions]);
  
  return (
    <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display font-bold">Weekly Spending</h3>
        <div className="flex text-xs space-x-2">
          <Button variant="ghost" size="sm" className="px-2 py-1 rounded-full bg-primary/20 text-primary h-auto">Week</Button>
          <Button variant="ghost" size="sm" className="px-2 py-1 rounded-full bg-white/5 h-auto">Month</Button>
          <Button variant="ghost" size="sm" className="px-2 py-1 rounded-full bg-white/5 h-auto">Year</Button>
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(248, 250, 252, 0.05)" />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(248, 250, 252, 0.7)', fontSize: 12 }}
            />
            <YAxis 
              hide 
              domain={[0, 'dataMax + 100']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid var(--border)',
                borderRadius: '8px', 
                color: 'var(--foreground)'
              }}
              formatter={(value) => [`$${value.toFixed(2)}`, undefined]}
            />
            <Bar 
              dataKey="expenses" 
              radius={[4, 4, 0, 0]}
              fill={(data) => {
                const { isPeak } = data as any;
                return isPeak ? "#EC4899" : "#6366F1";
              }}
              opacity={0.8}
            />
            <Line 
              type="monotone" 
              dataKey="average" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: "#10B981", r: 4 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2 text-xs text-text/70">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-primary mr-1"></span>
          <span>Expenses</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-secondary mr-1"></span>
          <span>Average</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-accent mr-1"></span>
          <span>Peak day</span>
        </div>
      </div>
    </div>
  );
}
