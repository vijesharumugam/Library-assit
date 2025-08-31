import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle, Search, LogOut } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction } from "@shared/schema";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: availableBooks = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books/available"],
  });

  const { data: myTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { book: Book })[]>({
    queryKey: ["/api/transactions/my"],
  });

  const borrowMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const res = await apiRequest("POST", "/api/transactions/borrow", { bookId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/my"] });
      toast({
        title: "Book borrowed successfully",
        description: "The book has been added to your account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to borrow book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await apiRequest("POST", `/api/transactions/${transactionId}/return`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/my"] });
      toast({
        title: "Book returned successfully",
        description: "Thank you for returning the book on time",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to return book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredBooks = availableBooks.filter(book => {
    const matchesSearch = searchQuery === "" || 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "" || book.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeBorrowings = myTransactions.filter(t => t.status === "borrowed");
  const dueSoon = activeBorrowings.filter(t => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-foreground">Library Assist</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground" data-testid="text-user-name">{user?.fullName}</span>
              </span>
              <Badge variant="secondary" data-testid="badge-user-role">Student</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Currently Borrowed</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-borrowed-count">
                    {activeBorrowings.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Borrowed</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-borrowed">
                    {myTransactions.length}
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
                  <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-due-soon">
                    {dueSoon.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search books by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-books"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="self-help">Self-Help</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Available Books */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle data-testid="title-available-books">Available Books</CardTitle>
          </CardHeader>
          <CardContent>
            {booksLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading books...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No books found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Author</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Available</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-muted/50" data-testid={`row-book-${book.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm mr-4 flex items-center justify-center">
                              <BookOpen className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground" data-testid={`text-book-title-${book.id}`}>
                                {book.title}
                              </div>
                              {book.isbn && (
                                <div className="text-sm text-muted-foreground" data-testid={`text-book-isbn-${book.id}`}>
                                  ISBN: {book.isbn}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-book-author-${book.id}`}>
                          {book.author}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" data-testid={`badge-book-category-${book.id}`}>
                            {book.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <span className="font-medium" data-testid={`text-book-available-${book.id}`}>
                            {book.availableCopies}
                          </span> / {book.totalCopies}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            onClick={() => borrowMutation.mutate(book.id)}
                            disabled={borrowMutation.isPending || book.availableCopies === 0}
                            data-testid={`button-borrow-${book.id}`}
                          >
                            {book.availableCopies === 0 ? "Unavailable" : "Borrow"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Borrowed Books */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="title-my-borrowed-books">My Borrowed Books</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading your transactions...</p>
              </div>
            ) : activeBorrowings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You haven't borrowed any books yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Borrowed Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
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
                          <td className="px-6 py-4">
                            <Button
                              onClick={() => returnMutation.mutate(transaction.id)}
                              disabled={returnMutation.isPending}
                              data-testid={`button-return-${transaction.id}`}
                            >
                              Return
                            </Button>
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
      </div>
    </div>
  );
}
