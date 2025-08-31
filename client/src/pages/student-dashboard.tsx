import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Clock, CheckCircle, Send, LogOut } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction, BookRequest } from "@shared/schema";
import { FloatingLibraryElements } from "@/components/FloatingLibraryElements";

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

  const { data: myRequests = [], isLoading: requestsLoading } = useQuery<(BookRequest & { book: Book })[]>({
    queryKey: ["/api/book-requests/my"],
  });

  const requestMutation = useMutation({
    mutationFn: async ({ bookId, notes }: { bookId: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/book-requests", { bookId, notes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-requests/my"] });
      toast({
        title: "Book request submitted",
        description: "Your request has been sent to the librarian for approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to request book",
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
    const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeBorrowings = myTransactions.filter(t => t.status === "BORROWED");
  const pendingRequests = myRequests.filter(r => r.status === "PENDING");
  const dueSoon = activeBorrowings.filter(t => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  return (
    <div className="min-h-screen bg-background library-pattern relative">
      <FloatingLibraryElements />
      {/* Header */}
      <header className="bg-card border-b border-border elegant-shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl library-heading">Library Sanctum</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Welcome, <span className="font-medium text-foreground" data-testid="text-user-name">{user?.fullName}</span>
              </span>
              <Badge variant="secondary" data-testid="badge-user-role" className="text-xs">Student</Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-logout-confirmation">
                  <AlertDialogHeader>
                    <AlertDialogTitle data-testid="title-logout-confirmation">
                      Are you sure you want to logout?
                    </AlertDialogTitle>
                    <AlertDialogDescription data-testid="description-logout-confirmation">
                      You will be logged out of your account and redirected to the login page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-logout">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => logoutMutation.mutate()}
                      data-testid="button-confirm-logout"
                    >
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 fade-in-float">
          <Card className="library-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-1.5 sm:p-2 gold-accent rounded-lg">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground library-subheading">Currently Borrowed</p>
                  <p className="text-lg sm:text-2xl font-semibold text-foreground" data-testid="stat-borrowed-count">
                    {activeBorrowings.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-1.5 sm:p-2 bg-chart-5/20 rounded-lg">
                  <Send className="h-4 w-4 sm:h-6 sm:w-6 text-chart-5" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground library-subheading">Pending Requests</p>
                  <p className="text-lg sm:text-2xl font-semibold text-foreground" data-testid="stat-pending-requests">
                    {pendingRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-1.5 sm:p-2 bg-accent/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground library-subheading">Total Borrowed</p>
                  <p className="text-lg sm:text-2xl font-semibold text-foreground" data-testid="stat-total-borrowed">
                    {myTransactions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-1.5 sm:p-2 bg-chart-4/20 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-chart-4" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground library-subheading">Due Soon</p>
                  <p className="text-lg sm:text-2xl font-semibold text-foreground" data-testid="stat-due-soon">
                    {dueSoon.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 sm:mb-8 library-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-books"
                  className="text-base"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
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
        <Card className="mb-8 library-card">
          <CardHeader>
            <CardTitle data-testid="title-available-books" className="library-heading">Available Books</CardTitle>
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
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {filteredBooks.map((book) => (
                    <div key={book.id} className="border border-border rounded-lg p-4" data-testid={`card-book-${book.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="h-16 w-10 book-spine-gradient rounded shadow-sm flex items-center justify-center gentle-float">
                            <BookOpen className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-sm" data-testid={`text-book-title-${book.id}`}>
                              {book.title}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-book-author-${book.id}`}>
                              by {book.author}
                            </p>
                            {book.isbn && (
                              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-book-isbn-${book.id}`}>
                                ISBN: {book.isbn}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" data-testid={`badge-book-category-${book.id}`} className="text-xs">
                                {book.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground" data-testid={`text-book-available-${book.id}`}>
                                {book.availableCopies}/{book.totalCopies} available
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => requestMutation.mutate({ bookId: book.id })}
                          disabled={requestMutation.isPending || book.availableCopies === 0}
                          data-testid={`button-request-${book.id}`}
                          className="w-full sm:w-auto"
                        >
                          {book.availableCopies === 0 ? "Unavailable" : "Request Book"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
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
                              onClick={() => requestMutation.mutate({ bookId: book.id })}
                              disabled={requestMutation.isPending || book.availableCopies === 0}
                              data-testid={`button-request-${book.id}`}
                            >
                              {book.availableCopies === 0 ? "Unavailable" : "Request Book"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Book Requests */}
        <Card className="mb-8 library-card">
          <CardHeader>
            <CardTitle data-testid="title-my-book-requests" className="library-heading">My Book Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading your requests...</p>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You haven't requested any books yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {myRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-muted/50" data-testid={`row-request-${request.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm mr-4 flex items-center justify-center">
                              <BookOpen className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground" data-testid={`text-request-book-title-${request.id}`}>
                                {request.book.title}
                              </div>
                              <div className="text-sm text-muted-foreground" data-testid={`text-request-book-author-${request.id}`}>
                                {request.book.author}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-request-date-${request.id}`}>
                          {new Date(request.requestDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={
                              request.status === "FULFILLED" ? "default" :
                              request.status === "REJECTED" ? "destructive" :
                              request.status === "APPROVED" ? "secondary" : "outline"
                            }
                            data-testid={`badge-request-status-${request.id}`}
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-request-notes-${request.id}`}>
                          {request.notes || "—"}
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
        <Card className="library-card">
          <CardHeader>
            <CardTitle data-testid="title-my-borrowed-books" className="library-heading">My Borrowed Books</CardTitle>
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
