import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Clock } from "lucide-react";
import { Link } from "wouter";
import { Transaction, Book } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function StudentBorrowedBooks() {
  const { user } = useAuth();

  const { data: myTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { book: Book })[]>({
    queryKey: ["/api/transactions/my"],
  });

  // Filter for currently borrowed books only
  const activeBorrowings = myTransactions.filter(t => t.status === "BORROWED");

  return (
    <div className="min-h-screen bg-background library-pattern relative">
      {/* Header */}
      <header className="bg-card border-b border-border elegant-shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/student">
                <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl library-heading">My Borrowed Books</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Books You've Borrowed</h2>
          <p className="text-muted-foreground">
            View details of all the books you currently have borrowed from the library
          </p>
        </div>

        <Card className="library-card">
          <CardHeader>
            <CardTitle className="flex items-center library-heading">
              <BookOpen className="h-5 w-5 mr-2" />
              Currently Borrowed ({activeBorrowings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading your borrowed books...</p>
              </div>
            ) : activeBorrowings.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't borrowed any books yet</p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {activeBorrowings.map((transaction) => {
                    const dueDate = new Date(transaction.dueDate);
                    const today = new Date();
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isDueSoon = diffDays <= 3;
                    const isOverdue = diffDays < 0;

                    return (
                      <div key={transaction.id} className="border border-border rounded-lg p-4" data-testid={`card-borrowed-book-${transaction.id}`}>
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="h-16 w-10 book-spine-gradient rounded shadow-sm flex items-center justify-center gentle-float">
                            <BookOpen className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-sm" data-testid={`text-book-title-${transaction.id}`}>
                              {transaction.book.title}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-book-author-${transaction.id}`}>
                              by {transaction.book.author}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Borrowed Date:</span>
                            <span className="text-sm font-medium" data-testid={`text-borrowed-date-${transaction.id}`}>
                              {transaction.borrowedDate ? new Date(transaction.borrowedDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Due Date:</span>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-foreground'}`} data-testid={`text-due-date-${transaction.id}`}>
                                {dueDate.toLocaleDateString()}
                              </div>
                              <div className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {isOverdue ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <Badge 
                              variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "default"}
                              data-testid={`badge-status-${transaction.id}`}
                              className="text-xs"
                            >
                              {isOverdue ? "Overdue" : isDueSoon ? "Due Soon" : "Active"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            Please return this book to the library when you're done reading
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Borrowed Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {activeBorrowings.map((transaction) => {
                        const dueDate = new Date(transaction.dueDate);
                        const today = new Date();
                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const isDueSoon = diffDays <= 3;
                        const isOverdue = diffDays < 0;

                        return (
                          <tr key={transaction.id} className="hover:bg-muted/50" data-testid={`row-transaction-${transaction.id}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-12 w-8 bg-gradient-to-b from-red-600 to-red-800 rounded shadow-sm mr-4 flex items-center justify-center">
                                  <BookOpen className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground" data-testid={`text-transaction-book-title-${transaction.id}`}>
                                    {transaction.book.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground" data-testid={`text-transaction-book-author-${transaction.id}`}>
                                    {transaction.book.author}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-transaction-borrowed-date-${transaction.id}`}>
                              {transaction.borrowedDate ? new Date(transaction.borrowedDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-transaction-due-date-${transaction.id}`}>
                              {dueDate.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "default"}
                                data-testid={`badge-transaction-status-${transaction.id}`}
                              >
                                {isOverdue ? "Overdue" : isDueSoon ? "Due Soon" : "Active"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}