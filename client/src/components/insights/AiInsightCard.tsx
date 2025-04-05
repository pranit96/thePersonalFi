
import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AiInsightCardProps {
  insight: AiInsight;
}

const insightTypeToColor: Record<string, { border: string, bg: string, textButton: string, icon: string }> = {
  "spending_pattern": {
    border: "border-primary",
    bg: "bg-primary/10",
    textButton: "text-primary",
    icon: "💰"
  },
  "saving_opportunity": {
    border: "border-secondary",
    bg: "bg-secondary/10",
    textButton: "text-secondary",
    icon: "💹"
  },
  "goal_achievement": {
    border: "border-accent",
    bg: "bg-accent/10",
    textButton: "text-accent",
    icon: "🎯"
  }
};

export default function AiInsightCard({ insight }: AiInsightCardProps) {
  const colors = insightTypeToColor[insight.type] || insightTypeToColor.spending_pattern;
  
  // Format the insight content for better readability
  const formatContent = (content: string) => {
    // Split the content into sections if it contains section headers
    if (content.includes("\n\n")) {
      return content.split("\n\n").map((section, i) => (
        <p key={i} className="text-sm text-text/80 mb-2">
          {section}
        </p>
      ));
    }
    
    return <p className="text-sm text-text/80">{content}</p>;
  };
  
  return (
    <div className={cn(
      "bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg overflow-hidden",
      colors.border
    )}>
      {/* Card Header */}
      <div className={cn("p-4", colors.bg)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <span>{colors.icon}</span>
          </div>
          <h4 className="font-medium">{insight.title}</h4>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="p-4">
        <div className="prose prose-sm prose-invert max-w-none mb-3">
          {formatContent(insight.description)}
        </div>
        
        <Button 
          variant="secondary"
          size="sm"
          className={cn(
            "mt-2 text-xs px-4 py-2 rounded-full h-auto",
            colors.textButton
          )}
        >
          {insight.actionText || "Take Action"}
        </Button>
      </div>
    </div>
  );
}
