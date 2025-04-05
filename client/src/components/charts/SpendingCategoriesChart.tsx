import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CategorySpending } from "@shared/schema";
import { Button } from "@/components/ui/button";
import CategoryProgressBar from "@/components/categories/CategoryProgressBar";
import { formatCurrency } from "@/lib/utils";

interface SpendingCategoriesChartProps {
  categories: CategorySpending[];
}

const COLORS = ["#6366F1", "#10B981", "#EC4899", "#F59E0B", "#3B82F6", "#EF4444"];

export default function SpendingCategoriesChart({ categories }: SpendingCategoriesChartProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'lastMonth'>('month');
  
  const chartData = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return categories.map(category => ({
      name: category.name || 'Uncategorized',
      value: category.amount || 0,
      percentage: category.percentage || 0
    }));
  }, [categories]);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-dark/95 backdrop-blur-xl border border-border shadow-lg rounded-lg p-2 text-foreground dark:bg-background-dark dark:text-foreground">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs">{payload[0].payload.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display font-bold">Spending Categories</h3>
        <div className="flex text-xs space-x-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('month')}
            className={`px-2 py-1 rounded-full h-auto ${
              timeRange === 'month' ? 'bg-primary/20 text-primary' : 'bg-white/5'
            }`}
          >
            This Month
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('lastMonth')}
            className={`px-2 py-1 rounded-full h-auto ${
              timeRange === 'lastMonth' ? 'bg-primary/20 text-primary' : 'bg-white/5'
            }`}
          >
            Last Month
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-[240px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart className="fill-foreground [&_.recharts-default-tooltip]:!bg-background-dark [&_.recharts-tooltip-cursor]:!fill-background-dark">
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                stroke="transparent"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-4">
          {categories.map((category, index) => (
            <CategoryProgressBar 
              key={category.id} 
              category={category} 
              color={`bg-[${COLORS[index % COLORS.length]}]`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
