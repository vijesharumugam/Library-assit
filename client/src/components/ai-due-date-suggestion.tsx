import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  Calendar, 
  Lightbulb, 
  RefreshCw,
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Role } from "@shared/schema";

interface AIDueDateSuggestionProps {
  userId: string;
  bookId: string;
  userName: string;
  bookTitle: string;
  currentDueDate?: Date;
  onSuggestionAccepted?: (suggestedDate: Date) => void;
  compact?: boolean;
}

interface DueDatePrediction {
  optimalDueDate: string;
  confidence: number;
  reasoning: string;
  riskFactors: string[];
  recommendations: string[];
}

export function AIDueDateSuggestion({ 
  userId, 
  bookId, 
  userName, 
  bookTitle,
  currentDueDate,
  onSuggestionAccepted,
  compact = false
}: AIDueDateSuggestionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<DueDatePrediction | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const generateSuggestionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/predictions/optimal-due-date", {
        userId,
        bookId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setSuggestion(data);
      toast({
        title: "AI Suggestion Generated",
        description: "Optimal due date calculated based on user behavior",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Suggestion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptSuggestion = () => {
    if (suggestion && onSuggestionAccepted) {
      const suggestedDate = new Date(suggestion.optimalDueDate);
      onSuggestionAccepted(suggestedDate);
      toast({
        title: "AI Suggestion Accepted",
        description: `Due date set to ${suggestedDate.toLocaleDateString()}`,
      });
    }
  };

  if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.ADMIN)) {
    return null; // Don't show suggestions to students
  }

  const isOptimal = suggestion && suggestion.confidence > 0.7;
  const needsAdjustment = suggestion && suggestion.confidence < 0.5;

  if (compact && !suggestion) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => generateSuggestionMutation.mutate()}
        disabled={generateSuggestionMutation.isPending}
        data-testid={`button-ai-due-date-${userId}-${bookId}`}
        className="text-xs"
      >
        {generateSuggestionMutation.isPending ? (
          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Brain className="mr-1 h-3 w-3" />
        )}
        AI Suggest
      </Button>
    );
  }

  return (
    <div className="space-y-3" data-testid={`ai-due-date-suggestion-${userId}-${bookId}`}>
      {!suggestion ? (
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Get AI-powered optimal due date recommendation</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSuggestionMutation.mutate()}
              disabled={generateSuggestionMutation.isPending}
              data-testid={`button-generate-suggestion-${userId}-${bookId}`}
            >
              {generateSuggestionMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Suggestion
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className={cn(
          "border rounded-lg p-4 space-y-3",
          isOptimal ? "bg-green-50 border-green-200" :
          needsAdjustment ? "bg-amber-50 border-amber-200" :
          "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Due Date Recommendation</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isOptimal ? "text-green-600 bg-green-50" :
                needsAdjustment ? "text-amber-600 bg-amber-50" :
                "text-blue-600 bg-blue-50"
              )}
            >
              {(suggestion.confidence * 100).toFixed(0)}% confidence
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Recommended Due Date:</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-lg">
                  {new Date(suggestion.optimalDueDate).toLocaleDateString()}
                </span>
              </div>
              {currentDueDate && (
                <div className="text-xs text-muted-foreground mt-1">
                  Current: {currentDueDate.toLocaleDateString()}
                  {Math.abs(new Date(suggestion.optimalDueDate).getTime() - currentDueDate.getTime()) > 24 * 60 * 60 * 1000 && (
                    <span className="ml-1 text-amber-600">
                      ({Math.ceil((new Date(suggestion.optimalDueDate).getTime() - currentDueDate.getTime()) / (1000 * 60 * 60 * 24))} days difference)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {onSuggestionAccepted && (
                <Button
                  onClick={handleAcceptSuggestion}
                  size="sm"
                  className="w-full"
                  data-testid={`button-accept-suggestion-${userId}-${bookId}`}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Use This Date
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSuggestionMutation.mutate()}
                disabled={generateSuggestionMutation.isPending}
                className="w-full"
                data-testid={`button-regenerate-suggestion-${userId}-${bookId}`}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", generateSuggestionMutation.isPending && "animate-spin")} />
                Regenerate
              </Button>
            </div>
          </div>

          {suggestion.reasoning && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">AI Analysis:</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {showDetails ? suggestion.reasoning : 
                 `${suggestion.reasoning.slice(0, 150)}${suggestion.reasoning.length > 150 ? '...' : ''}`}
              </p>
              {suggestion.reasoning.length > 150 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-auto p-0 text-xs text-primary"
                >
                  {showDetails ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
          )}

          {suggestion.riskFactors && suggestion.riskFactors.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Risk Factors:</div>
              <div className="flex flex-wrap gap-1">
                {suggestion.riskFactors.map((factor, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {factor.length > 20 ? `${factor.slice(0, 20)}...` : factor}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <p>{factor}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Suggestion for: <strong>{userName}</strong> borrowing "<strong>{bookTitle}</strong>"
          </div>
        </div>
      )}
    </div>
  );
}