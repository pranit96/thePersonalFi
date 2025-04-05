import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { 
  Utensils, 
  ShoppingBag, 
  Video, 
  Briefcase, 
  CreditCard, 
  Car, 
  Home, 
  Heart,
  Smartphone,
  Zap,
  Coffee
} from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Dining": <Utensils className="text-primary" />,
  "Shopping": <ShoppingBag className="text-secondary" />,
  "Subscription": <Video className="text-accent" />,
  "Income": <Briefcase className="text-green-500" />,
  "Transportation": <Car className="text-yellow-500" />,
  "Housing": <Home className="text-blue-500" />,
  "Healthcare": <Heart className="text-red-500" />,
  "Technology": <Smartphone className="text-purple-500" />,
  "Utilities": <Zap className="text-orange-500" />,
  "Personal": <Coffee className="text-amber-500" />,
  "Default": <CreditCard className="text-gray-500" />
};

function getIconForCategory(category: string): React.ReactNode {
  return categoryIcons[category] || categoryIcons.Default;
}

function getBackgroundForCategory(category: string): string {
  switch (category) {
    case "Dining":
      return "bg-primary/20";
    case "Shopping":
      return "bg-secondary/20";
    case "Subscription":
      return "bg-accent/20";
    case "Income":
      return "bg-green-500/20";
    case "Transportation":
      return "bg-yellow-500/20";
    case "Housing":
      return "bg-blue-500/20";
    case "Healthcare":
      return "bg-red-500/20";
    case "Technology":
      return "bg-purple-500/20";
    case "Utilities":
      return "bg-orange-500/20";
    case "Personal":
      return "bg-amber-500/20";
    default:
      return "bg-gray-500/20";
  }
}

function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format time
  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // If it's today
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeString}`;
  }
  
  // If it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeString}`;
  }
  
  // If it's earlier
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) + `, ${timeString}`;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.amount > 0;
  const amountColor = isIncome ? "text-green-400" : "text-red-400";
  const formattedAmount = isIncome ? 
    `+${formatCurrency(transaction.amount)}` : 
    formatCurrency(transaction.amount);
  
  return (
    <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-3 mb-3 last:mb-0">
      <div className="flex items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getBackgroundForCategory(transaction.category)} mr-3`}>
          {getIconForCategory(transaction.category)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{transaction.merchant}</h4>
          <p className="text-xs text-text/70">{formatTransactionDate(transaction.date)}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono font-medium ${amountColor}`}>{formattedAmount}</p>
          <p className="text-xs text-text/70">{transaction.category}</p>
        </div>
      </div>
    </div>
  );
}
