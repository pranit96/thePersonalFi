import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AiInsightCardProps {
  insight: AiInsight;
}

/**
 * A card component to display AI-generated financial insights
 */
export const AiInsightCard = ({ insight }: AiInsightCardProps) => {
  // Determine the background color based on the insight type
  const getTypeColor = (type: string): string => {
    const typeMap: Record<string, string> = {
      'spending_pattern': 'from-purple-600/20 to-purple-800/20 border-purple-400/30',
      'saving_opportunity': 'from-blue-600/20 to-blue-800/20 border-blue-400/30',
      'goal_achievement': 'from-green-600/20 to-green-800/20 border-green-400/30',
      'goal_progress': 'from-emerald-600/20 to-emerald-800/20 border-emerald-400/30',
      'warning': 'from-red-600/20 to-red-800/20 border-red-400/30'
    };

    return typeMap[type] || 'from-slate-600/20 to-slate-800/20 border-slate-400/30';
  };

  // Get insight content from either description or content field
  const insightContent = insight.description || insight.content || "No details available";

  return (
    <div className={cn(
      "rounded-lg border bg-gradient-to-b p-6 shadow-lg transition-all duration-300 hover:shadow-xl",
      getTypeColor(insight.type)
    )}>
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold">{insight.title}</h3>
        <p className="mt-2 text-sm text-text/70">{insightContent}</p>
      </div>

      {insight.actionText && (
        <Button 
          variant="outline" 
          className="mt-4 w-full bg-background/30 hover:bg-background/50"
        >
          {insight.actionText}
        </Button>
      )}
    </div>
  );
};

export default AiInsightCard;