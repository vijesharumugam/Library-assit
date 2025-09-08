import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, Calendar, BookOpen, AlertTriangle, CalendarPlus } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Transaction, Book, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";

function StudentDueSoon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { book: Book })[]>({
    queryKey: ["/api/transactions/my"],
  });

  const extensionRequestMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/extension-requests", {
        transactionId,
        reason
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Extension Request Submitted",
        description: "Your extension request has been submitted and is awaiting librarian approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/my"] });
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to submit extension request. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleExtensionRequest = (transactionId: string, bookTitle: string) => {
    // For now, use a default reason. In a full implementation, you'd show a dialog
    const reason = `Extension request for "${bookTitle}" - Need additional time to complete reading.`;
    extensionRequestMutation.mutate({ transactionId, reason });
  };

  const dueSoonBooks = useMemo(() => {
    const today = new Date();
    
    return myTransactions
      .filter(t => t.status === "BORROWED")
      .map(transaction => {
        const dueDate = new Date(transaction.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...transaction,
          daysUntilDue: diffDays,
          isOverdue: diffDays < 0,
          isDueSoon: diffDays <= 3 && diffDays >= 0
        };
      })
      .filter(t => t.isDueSoon || t.isOverdue)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [myTransactions]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 block md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-chart-4 mr-2" />
              <h1 className="text-lg font-semibold text-foreground" data-testid="due-soon-header-title">
                Due Soon
              </h1>
            </div>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-card border-b border-border hidden md:block">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="desktop-back-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-chart-4 mr-3" />
              <h1 className="text-2xl font-bold text-foreground">Books Due Soon</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-due-soon-count">
                    {dueSoonBooks.filter(b => b.isDueSoon).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-overdue-count">
                    {dueSoonBooks.filter(b => b.isOverdue).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Due Soon Books List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Books Requiring Attention</span>
              <Badge variant="outline" className="text-sm">
                {dueSoonBooks.length} books
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4 py-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-16 w-12 bg-muted rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : dueSoonBooks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-sm">
                  You have no books due soon or overdue. Great job managing your library books!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dueSoonBooks.map((transaction) => {
                  const dueDate = new Date(transaction.dueDate);
                  const isOverdue = transaction.isOverdue;
                  const daysUntilDue = transaction.daysUntilDue;
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        isOverdue 
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' 
                          : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'
                      }`}
                      data-testid={`due-soon-book-${transaction.id}`}
                    >
                      {/* Book Icon */}
                      <div className="w-12 h-16 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      
                      {/* Book Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate" data-testid={`book-title-${transaction.id}`}>
                          {transaction.book.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate" data-testid={`book-author-${transaction.id}`}>
                          by {transaction.book.author}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Due: {dueDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                          className={isOverdue ? "" : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"}
                          data-testid={`status-badge-${transaction.id}`}
                        >
                          {isOverdue 
                            ? `${Math.abs(daysUntilDue)} days overdue` 
                            : `${daysUntilDue} days left`
                          }
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExtensionRequest(transaction.id, transaction.book.title)}
                          disabled={extensionRequestMutation.isPending}
                          className="flex items-center gap-1 text-xs"
                          data-testid={`request-extension-${transaction.id}`}
                        >
                          <CalendarPlus className="h-3 w-3" />
                          {extensionRequestMutation.isPending ? "Requesting..." : "Request Extension"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        {dueSoonBooks.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                    Need More Time?
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    You can request an extension for any book by clicking the "Request Extension" button. Extension requests are reviewed by librarians and you'll receive a notification with the decision.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation userRole="student" />
    </div>
  );
}

export default memo(StudentDueSoon);