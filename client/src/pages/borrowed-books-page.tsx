import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { Link } from "wouter";
import { Transaction, User as UserType, Book } from "@shared/schema";

export default function BorrowedBooksPage() {
  const { user } = useAuth();

  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { user: UserType; book: Book })[]>({
    queryKey: ["/api/transactions"],
  });

  // Filter for currently borrowed books only
  const borrowedTransactions = allTransactions.filter(t => t.status === "BORROWED");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/librarian">
                <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-foreground">Books Currently Borrowed</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Books Currently Borrowed</h2>
          <p className="text-muted-foreground">
            View all books that are currently borrowed by students, including due dates and student details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Borrowed Books ({borrowedTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading borrowed books...</p>
              </div>
            ) : borrowedTransactions.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No books are currently borrowed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Borrowed Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {borrowedTransactions.map((transaction) => {
                      const dueDate = new Date(transaction.dueDate);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={transaction.id} className="hover:bg-muted/50" data-testid={`row-borrowed-book-${transaction.id}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-student-name-${transaction.id}`}>
                                  {transaction.user.fullName}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-student-email-${transaction.id}`}>
                                  {transaction.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-12 w-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm mr-4 flex items-center justify-center">
                                <BookOpen className="h-3 w-3 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-book-title-${transaction.id}`}>
                                  {transaction.book.title}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-book-author-${transaction.id}`}>
                                  by {transaction.book.author}
                                </div>
                                {transaction.book.isbn && (
                                  <div className="text-xs text-muted-foreground" data-testid={`text-book-isbn-${transaction.id}`}>
                                    ISBN: {transaction.book.isbn}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-foreground">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span data-testid={`text-borrowed-date-${transaction.id}`}>
                                {new Date(transaction.borrowedDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div>
                                <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-foreground'}`} data-testid={`text-due-date-${transaction.id}`}>
                                  {dueDate.toLocaleDateString()}
                                </div>
                                <div className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} data-testid={`text-days-until-due-${transaction.id}`}>
                                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={isOverdue ? "destructive" : "secondary"}
                              data-testid={`badge-status-${transaction.id}`}
                            >
                              {isOverdue ? "Overdue" : "Active"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-student-id-${transaction.id}`}>
                            {transaction.user.studentId || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Borrowed</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-borrowed">
                    {borrowedTransactions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-overdue-count">
                    {borrowedTransactions.filter(t => {
                      const dueDate = new Date(t.dueDate);
                      const today = new Date();
                      return dueDate < today;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Borrowers</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-active-borrowers">
                    {new Set(borrowedTransactions.map(t => t.userId)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}