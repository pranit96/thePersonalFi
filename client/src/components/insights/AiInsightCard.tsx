
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

  // Get an icon based on the insight type
  const getTypeIcon = (type: string): JSX.Element => {
    switch (type) {
      case 'spending_pattern':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'saving_opportunity':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'goal_achievement':
      case 'goal_progress':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get insight content from either description or content field
  const insightContent = insight.description || insight.content || "No details available";
  const insightTitle = insight.title || "Financial Insight";
  const insightDate = insight.date ? new Date(insight.date) : new Date();
  const insightType = insight.type || "spending_pattern";

  return (
    <div className={cn(
      "rounded-lg border bg-gradient-to-b p-6 shadow-lg transition-all duration-300 hover:shadow-xl h-full flex flex-col",
      getTypeColor(insightType)
    )}>
      <div className="mb-1 flex items-center">
        <div className="w-8 h-8 rounded-full bg-background-dark/30 flex items-center justify-center mr-3">
          {getTypeIcon(insightType)}
        </div>
        <h3 className="font-display text-lg font-bold line-clamp-1">{insightTitle}</h3>
      </div>
      
      <div className="mt-3 flex-grow">
        <p className="text-sm text-text/90 leading-relaxed">{insightContent}</p>
      </div>

      {insight.actionText && (
        <Button 
          variant="outline" 
          className="mt-4 w-full bg-background/30 hover:bg-background/50 text-sm font-medium"
        >
          {insight.actionText}
        </Button>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs text-text/60">
        <span>{insightDate.toLocaleDateString()}</span>
        <span className="capitalize">{insightType.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
};

export default AiInsightCard;
