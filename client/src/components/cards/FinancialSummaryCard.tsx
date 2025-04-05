import { ArrowUp, ArrowDown } from "lucide-react";
import { cn, formatCurrency, getChangeColor } from "@/lib/utils";

interface FinancialSummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  change: number;
  compareText?: string;
  iconBackground?: string;
}

export default function FinancialSummaryCard({
  title,
  amount,
  icon,
  change,
  compareText = "vs last month",
  iconBackground = "bg-primary/20",
}: FinancialSummaryCardProps) {
  const isPositive = change > 0;
  const changeColor = getChangeColor(change);
  
  return (
    <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 transform transition-transform hover:translate-y-[-5px] duration-300">
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-text/70 text-sm">{title}</p>
          <h3 className="text-2xl font-display font-bold">{formatCurrency(amount)}</h3>
        </div>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", iconBackground)}>
          {icon}
        </div>
      </div>
      <div className="flex items-center">
        <span className={cn("flex items-center text-xs", changeColor)}>
          {change !== 0 && (
            isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />
          )}
          {Math.abs(change)}%
        </span>
        <span className="text-xs text-text/50 ml-2">{compareText}</span>
      </div>
    </div>
  );
}
