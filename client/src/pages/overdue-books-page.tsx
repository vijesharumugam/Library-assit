import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Calendar, User, Clock, Phone, Mail } from "lucide-react";
import { Link } from "wouter";
import { Transaction, User as UserType, Book } from "@shared/schema";

export default function OverdueBooksPage() {
  const { user } = useAuth();

  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { user: UserType; book: Book })[]>({
    queryKey: ["/api/transactions"],
  });

  // Filter for overdue books only
  const overdueTransactions = allTransactions.filter(t => {
    if (t.status !== "BORROWED") return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return dueDate < today;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/librarian">
                <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>
            <div className="flex items-center">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mr-2 sm:mr-3" />
              <h1 className="text-base sm:text-xl font-semibold text-foreground">Overdue Books</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Overdue Books</h2>
          <p className="text-muted-foreground">
            Students who haven't returned their books on time - follow up required
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <Clock className="h-5 w-5 mr-2" />
              Overdue Books ({overdueTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading overdue books...</p>
              </div>
            ) : overdueTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No overdue books!</p>
                <p className="text-sm text-muted-foreground">All students have returned their books on time</p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {overdueTransactions.map((transaction) => {
                    const dueDate = new Date(transaction.dueDate);
                    const today = new Date();
                    const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={transaction.id} className="border border-red-200 bg-red-50/50 rounded-lg p-4" data-testid={`card-overdue-book-${transaction.id}`}>
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="h-12 w-8 bg-gradient-to-b from-red-600 to-red-800 rounded shadow-sm flex items-center justify-center">
                            <BookOpen className="h-3 w-3 text-white" />
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
                            <span className="text-xs text-muted-foreground">Student:</span>
                            <span className="text-sm font-medium" data-testid={`text-student-name-${transaction.id}`}>
                              {transaction.user.fullName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Due Date:</span>
                            <div className="text-right">
                              <div className="text-sm font-medium text-red-700" data-testid={`text-due-date-${transaction.id}`}>
                                {dueDate.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-red-500" data-testid={`text-days-overdue-${transaction.id}`}>
                                {daysOverdue} days overdue
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Contact:</span>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground" data-testid={`text-student-email-${transaction.id}`}>
                                {transaction.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-student-phone-${transaction.id}`}>
                                {(transaction.user as any).phone || "No phone"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Days Overdue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {overdueTransactions.map((transaction) => {
                      const dueDate = new Date(transaction.dueDate);
                      const today = new Date();
                      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={transaction.id} className="hover:bg-red-50/50" data-testid={`row-overdue-book-${transaction.id}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                <User className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-student-name-${transaction.id}`}>
                                  {transaction.user.fullName}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-student-username-${transaction.id}`}>
                                  @{transaction.user.username}
                                </div>
                                <div className="text-xs text-muted-foreground" data-testid={`text-student-id-${transaction.id}`}>
                                  ID: {transaction.user.studentId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-12 w-8 bg-gradient-to-b from-red-600 to-red-800 rounded shadow-sm mr-4 flex items-center justify-center">
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
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-red-500" />
                              <div>
                                <div className="font-medium text-red-700" data-testid={`text-due-date-${transaction.id}`}>
                                  {dueDate.toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground" data-testid={`text-borrowed-date-${transaction.id}`}>
                                  Borrowed: {new Date(transaction.borrowedDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-red-500" />
                              <div>
                                <div className="text-sm font-bold text-red-700" data-testid={`text-days-overdue-${transaction.id}`}>
                                  {daysOverdue} days
                                </div>
                                <div className="text-xs text-red-500">
                                  overdue
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs" data-testid={`text-student-email-${transaction.id}`}>
                                  {transaction.user.email}
                                </span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs" data-testid={`text-student-phone-${transaction.id}`}>
                                  {(transaction.user as any).phone || "Not provided"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="destructive" data-testid={`badge-overdue-status-${transaction.id}`}>
                              {daysOverdue > 7 ? "Critical" : "Overdue"}
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

        {/* Overdue Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-overdue">
                    {overdueTransactions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Critical (7+ days)</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-critical-overdue">
                    {overdueTransactions.filter(t => {
                      const dueDate = new Date(t.dueDate);
                      const today = new Date();
                      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                      return daysOverdue > 7;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Students Affected</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-affected-students">
                    {new Set(overdueTransactions.map(t => t.userId)).size}
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