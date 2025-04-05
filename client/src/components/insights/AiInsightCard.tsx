
import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AiInsightCardProps {
  insight: AiInsight;
}

const insightTypeToColor: Record<string, { border: string, bg: string, textButton: string, icon: string }> = {
  "spending_pattern": {
    border: "border-primary/40",
    bg: "bg-primary/10",
    textButton: "text-primary hover:bg-primary/20",
    icon: "💰"
  },
  "saving_opportunity": {
    border: "border-secondary/40",
    bg: "bg-secondary/10",
    textButton: "text-secondary hover:bg-secondary/20",
    icon: "💹"
  },
  "goal_achievement": {
    border: "border-accent/40",
    bg: "bg-accent/10",
    textButton: "text-accent hover:bg-accent/20",
    icon: "🎯"
  }
};

export default function AiInsightCard({ insight }: AiInsightCardProps) {
  const colors = insightTypeToColor[insight.type] || insightTypeToColor.spending_pattern;
  
  // Format the insight content for better readability
  const formatContent = (content: string) => {
    // Check for bullet points
    if (content.includes("•") || content.includes("*")) {
      const lines = content.split(/\n/);
      return (
        <div>
          {lines.map((line, i) => {
            if (line.trim().startsWith("•") || line.trim().startsWith("*")) {
              return (
                <div key={i} className="flex items-start mb-2">
                  <span className="mr-2 text-primary">{line.trim().startsWith("•") ? "•" : "•"}</span>
                  <span className="text-text/80">{line.replace(/^[•*]\s*/, "")}</span>
                </div>
              );
            }
            
            if (line.trim() === "") {
              return <div key={i} className="h-2"></div>;
            }
            
            return <p key={i} className="text-text/80 mb-2">{line}</p>;
          })}
        </div>
      );
    }
    
    // Split by paragraphs
    if (content.includes("\n\n")) {
      return content.split("\n\n").map((section, i) => (
        <p key={i} className="text-sm text-text/80 mb-3">
          {section}
        </p>
      ));
    }
    
    return <p className="text-sm text-text/80">{content}</p>;
  };
  
  return (
    <div className={cn(
      "bg-background-dark/60 backdrop-blur-xl border shadow-lg rounded-lg overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-xl hover:translate-y-[-2px]",
      colors.border
    )}>
      {/* Card Header */}
      <div className={cn("p-4", colors.bg)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-lg">{colors.icon}</span>
          </div>
          <h4 className="font-medium">{insight.title}</h4>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="prose prose-sm prose-invert max-w-none mb-4 flex-1">
          {formatContent(insight.description)}
        </div>
        
        <Button 
          variant="outline"
          size="sm"
          className={cn(
            "mt-auto text-sm px-4 py-2 rounded-md h-auto border-0 transition-colors",
            colors.textButton
          )}
        >
          {insight.actionText || "Take Action"}
        </Button>
      </div>
    </div>
  );
}
