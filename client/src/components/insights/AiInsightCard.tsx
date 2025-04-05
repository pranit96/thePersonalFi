import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AiInsightCardProps {
  insight: AiInsight;
}

const insightTypeToColor: Record<string, { border: string, button: string, textButton: string }> = {
  "spending_pattern": {
    border: "border-primary",
    button: "bg-primary/20",
    textButton: "text-primary"
  },
  "saving_opportunity": {
    border: "border-secondary",
    button: "bg-secondary/20",
    textButton: "text-secondary"
  },
  "goal_achievement": {
    border: "border-accent",
    button: "bg-accent/20",
    textButton: "text-accent"
  }
};

export default function AiInsightCard({ insight }: AiInsightCardProps) {
  const colors = insightTypeToColor[insight.type] || insightTypeToColor.spending_pattern;
  
  return (
    <div className={cn(
      "bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-4 border-l-2",
      colors.border
    )}>
      <h4 className="text-sm font-medium mb-2">{insight.title}</h4>
      <p className="text-xs text-text/70 mb-3">{insight.description}</p>
      <Button 
        variant="ghost"
        size="sm"
        className={cn(
          "text-xs px-3 py-1 rounded-full h-auto",
          colors.button,
          colors.textButton
        )}
      >
        {insight.actionText}
      </Button>
    </div>
  );
}
