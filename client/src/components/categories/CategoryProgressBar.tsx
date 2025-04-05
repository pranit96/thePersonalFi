import { CategorySpending } from "@shared/schema";
import { formatCurrency, formatPercentage, getChangeColor } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CategoryProgressBarProps {
  category: CategorySpending;
  color: string;
}

export default function CategoryProgressBar({ category, color }: CategoryProgressBarProps) {
  const changeDirection = category.changePercentage > 0 ? '+' : '';
  const changeColor = getChangeColor(category.changePercentage, true);
  
  return (
    <div className="flex items-center">
      <div className={`w-4 h-4 rounded-full ${color} mr-3`}></div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <h4 className="text-sm font-medium">{category.name}</h4>
          <span className="text-sm font-mono">{formatCurrency(category.amount)}</span>
        </div>
        <Progress value={category.percentage} className="h-2 bg-white/10" indicatorClassName={color} />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-text/70">{formatPercentage(category.percentage)}</span>
          <span className={`text-xs ${changeColor}`}>
            {category.changePercentage === 0 
              ? 'No change' 
              : `${changeDirection}${category.changePercentage}% vs last month`}
          </span>
        </div>
      </div>
    </div>
  );
}
