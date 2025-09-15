import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  Brain, 
  TrendingUp, 
  Clock,
  User,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AIPrediction, Role } from "@shared/schema";

interface AIRiskIndicatorProps {
  userId: string;
  userName: string;
  bookId?: string;
  bookTitle?: string;
  compact?: boolean;
  showDetails?: boolean;
}

interface RiskLevel {
  level: 'low' | 'medium' | 'high';
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
  label: string;
}

const getRiskLevel = (confidence: number): RiskLevel => {
  if (confidence >= 0.7) {
    return {
      level: 'high',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      icon: AlertTriangle,
      label: 'High Risk'
    };
  } else if (confidence >= 0.4) {
    return {
      level: 'medium',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      icon: Clock,
      label: 'Medium Risk'
    };
  } else {
    return {
      level: 'low',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      icon: CheckCircle,
      label: 'Low Risk'
    };
  }
};

export function AIRiskIndicator({ 
  userId, 
  userName, 
  bookId, 
  bookTitle,
  compact = false,
  showDetails = true 
}: AIRiskIndicatorProps) {
  const { user } = useAuth();
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Query for overdue risk predictions for this user
  const { data: predictions, isLoading } = useQuery<AIPrediction[]>({
    queryKey: ["/api/ai/predictions", { type: "OVERDUE_RISK", targetId: userId }],
    enabled: (user?.role === Role.LIBRARIAN || user?.role === Role.ADMIN) && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Find the most recent prediction for this user
  const latestPrediction = predictions?.find(p => p.targetId === userId && p.type === 'OVERDUE_RISK');
  
  if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.ADMIN)) {
    return null; // Don't show predictions to students
  }

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        compact ? "text-xs" : "text-sm"
      )}>
        <Brain className={cn("animate-pulse text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
        <span className="text-muted-foreground">Analyzing...</span>
      </div>
    );
  }

  if (!latestPrediction) {
    return compact ? (
      <Badge variant="outline" className="text-xs">
        <User className="mr-1 h-3 w-3" />
        No Risk Data
      </Badge>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Brain className="h-4 w-4" />
        <span>No risk analysis available</span>
      </div>
    );
  }

  const risk = getRiskLevel(latestPrediction.confidence);
  const IconComponent = risk.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer transition-colors text-xs",
                risk.color,
                risk.bgColor
              )}
              data-testid={`ai-risk-badge-${userId}`}
            >
              <IconComponent className="mr-1 h-3 w-3" />
              {risk.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="font-medium">AI Risk Assessment</span>
              </div>
              <div className="text-sm">
                <div className="mb-1">
                  <strong>{userName}</strong> - {(latestPrediction.confidence * 100).toFixed(0)}% risk
                </div>
                {latestPrediction.reasoning && (
                  <div className="text-muted-foreground">{latestPrediction.reasoning}</div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2" data-testid={`ai-risk-indicator-${userId}`}>
      <div className={cn(
        "border rounded-lg p-3 transition-colors",
        risk.bgColor
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Risk Assessment</span>
          </div>
          <Badge variant="outline" className={cn("text-xs", risk.color)}>
            <IconComponent className="mr-1 h-3 w-3" />
            {risk.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overdue Probability:</span>
            <span className={cn("font-medium", risk.color)}>
              {(latestPrediction.confidence * 100).toFixed(0)}%
            </span>
          </div>
          
          <Progress 
            value={latestPrediction.confidence * 100} 
            className={cn(
              "h-2",
              risk.level === 'high' ? 'bg-red-100' : 
              risk.level === 'medium' ? 'bg-amber-100' : 'bg-green-100'
            )}
          />

          {showDetails && latestPrediction.reasoning && (
            <div className="mt-2">
              <div className="flex items-center gap-1 mb-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">AI Analysis:</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {showFullDetails ? latestPrediction.reasoning : 
                 `${latestPrediction.reasoning.slice(0, 100)}${latestPrediction.reasoning.length > 100 ? '...' : ''}`}
              </p>
              {latestPrediction.reasoning.length > 100 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="h-auto p-0 text-xs text-primary hover:no-underline"
                >
                  {showFullDetails ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(latestPrediction.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}