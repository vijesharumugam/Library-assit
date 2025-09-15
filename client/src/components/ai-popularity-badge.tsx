import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AIPrediction, Role } from "@shared/schema";

interface AIPopularityBadgeProps {
  bookId: string;
  bookTitle: string;
  compact?: boolean;
}

interface PopularityLevel {
  level: 'trending' | 'stable' | 'declining';
  color: string;
  bgColor: string;
  icon: typeof TrendingUp;
  label: string;
}

const getPopularityLevel = (confidence: number, prediction: any): PopularityLevel => {
  // Assume higher confidence means more popular
  if (confidence >= 0.7) {
    return {
      level: 'trending',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      icon: TrendingUp,
      label: 'Trending'
    };
  } else if (confidence >= 0.4) {
    return {
      level: 'stable',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      icon: Minus,
      label: 'Stable'
    };
  } else {
    return {
      level: 'declining',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      icon: TrendingDown,
      label: 'Low Interest'
    };
  }
};

export function AIPopularityBadge({ bookId, bookTitle, compact = true }: AIPopularityBadgeProps) {
  const { user } = useAuth();

  // Query for popularity forecasts for this book
  const { data: predictions, isLoading } = useQuery<AIPrediction[]>({
    queryKey: ["/api/ai/predictions", { type: "POPULAR_BOOK_FORECAST", targetId: bookId }],
    enabled: (user?.role === Role.LIBRARIAN || user?.role === Role.ADMIN) && !!bookId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Find the most recent popularity prediction for this book
  const latestPrediction = predictions?.find(p => p.targetId === bookId && p.type === 'POPULAR_BOOK_FORECAST');

  if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.ADMIN)) {
    return null; // Don't show predictions to students
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs">
        <Brain className="mr-1 h-3 w-3 animate-pulse" />
        Analyzing...
      </Badge>
    );
  }

  if (!latestPrediction) {
    return null; // Don't show anything if no prediction available
  }

  const popularity = getPopularityLevel(latestPrediction.confidence, latestPrediction.prediction);
  const IconComponent = popularity.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer transition-colors text-xs",
                popularity.color,
                popularity.bgColor
              )}
              data-testid={`ai-popularity-badge-${bookId}`}
            >
              <IconComponent className="mr-1 h-3 w-3" />
              {popularity.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="font-medium">AI Popularity Forecast</span>
              </div>
              <div className="text-sm">
                <div className="mb-1">
                  <strong>{bookTitle}</strong>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-3 w-3" />
                  <span>Interest Level: {(latestPrediction.confidence * 100).toFixed(0)}%</span>
                </div>
                {latestPrediction.reasoning && (
                  <div className="text-muted-foreground text-xs">
                    {latestPrediction.reasoning}
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2" data-testid={`ai-popularity-indicator-${bookId}`}>
      <div className={cn(
        "border rounded-lg p-3 transition-colors",
        popularity.bgColor
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Popularity Forecast</span>
          </div>
          <Badge variant="outline" className={cn("text-xs", popularity.color)}>
            <IconComponent className="mr-1 h-3 w-3" />
            {popularity.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Interest Level:</span>
            <span className={cn("font-medium", popularity.color)}>
              {(latestPrediction.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {latestPrediction.reasoning && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {latestPrediction.reasoning}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Forecast generated: {new Date(latestPrediction.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}