import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Users, Clock, TrendingUp, LogOut, Plus, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction, User, BookRequest, TransactionStatus, BookRequestStatus, Role } from "@shared/schema";
import { AddBookModal } from "@/components/add-book-modal";

export default function LibrarianDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: books = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery<(Transaction & { user: User; book: Book })[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: bookRequests = [], isLoading: requestsLoading } = useQuery<(BookRequest & { user: User; book: Book })[]>({
    queryKey: ["/api/book-requests"],
  });

  const { data: pendingRequests = [], isLoading: pendingRequestsLoading } = useQuery<(BookRequest & { user: User; book: Book })[]>({
    queryKey: ["/api/book-requests/pending"],
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      await apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Book deleted successfully",
        description: "The book has been removed from the library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/book-requests/${requestId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/book-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Request approved successfully",
        description: "The book has been borrowed by the student",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/book-requests/${requestId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/book-requests/pending"] });
      toast({
        title: "Request rejected",
        description: "The book request has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredBooks = books.filter(book => {
    const matchesSearch = searchQuery === "" || 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalBooks = books.length;
  const borrowedBooks = allTransactions.filter(t => t.status === "BORROWED").length;
  const overdueBooks = allTransactions.filter(t => {
    if (t.status !== "BORROWED") return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return dueDate < today;
  }).length;
  const activeUsers = new Set(allTransactions.filter(t => t.status === "BORROWED").map(t => t.userId)).size;
  const totalPendingRequests = pendingRequests.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-foreground">Library Assist - Librarian Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground" data-testid="text-user-name">{user?.fullName}</span>
              </span>
              <Badge variant="default" data-testid="badge-user-role">Librarian</Badge>
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Book Requests</TabsTrigger>
            <TabsTrigger value="books" data-testid="tab-books">Manage Books</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-books">
                        {totalBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/librarian/borrowed-books")}
                data-testid="card-borrowed-books"
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-accent" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Books Borrowed</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-borrowed-books">
                        {borrowedBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/librarian/overdue-books")}
                data-testid="card-overdue-books"
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-overdue-books">
                        {overdueBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-active-users">
                        {activeUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-pending-requests">
                        {totalPendingRequests}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-recent-activity">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading recent activity...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center space-x-4" data-testid={`activity-${transaction.id}`}>
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">
                            <span className="font-medium" data-testid={`text-activity-user-${transaction.id}`}>
                              {transaction.user.fullName}
                            </span>{" "}
                            {transaction.status === "BORROWED" ? "borrowed" : "returned"}{" "}
                            <span className="font-medium" data-testid={`text-activity-book-${transaction.id}`}>
                              "{transaction.book.title}"
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-activity-time-${transaction.id}`}>
                            {transaction.borrowedDate ? new Date(transaction.borrowedDate).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Book Requests</h2>
                <p className="text-muted-foreground">Manage student book requests</p>
              </div>
            </div>

            {/* Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-pending-requests">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequestsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading pending requests...</p>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {pendingRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-muted/50" data-testid={`row-request-${request.id}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-request-student-${request.id}`}>
                                  {request.user.fullName}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-request-username-${request.id}`}>
                                  {request.user.username}
                                </div>
                              </div>
                            </td>
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
                            <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-request-notes-${request.id}`}>
                              {request.notes || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveRequestMutation.mutate(request.id)}
                                  disabled={approveRequestMutation.isPending}
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectRequestMutation.mutate(request.id)}
                                  disabled={rejectRequestMutation.isPending}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Requests */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-all-requests">All Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading all requests...</p>
                  </div>
                ) : bookRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No requests found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {bookRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-muted/50" data-testid={`row-all-request-${request.id}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-all-request-student-${request.id}`}>
                                  {request.user.fullName}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-all-request-username-${request.id}`}>
                                  {request.user.username}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-12 w-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm mr-4 flex items-center justify-center">
                                  <BookOpen className="h-3 w-3 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground" data-testid={`text-all-request-book-title-${request.id}`}>
                                    {request.book.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground" data-testid={`text-all-request-book-author-${request.id}`}>
                                    {request.book.author}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-all-request-date-${request.id}`}>
                              {new Date(request.requestDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={
                                  request.status === "FULFILLED" ? "default" :
                                  request.status === "REJECTED" ? "destructive" :
                                  request.status === "APPROVED" ? "secondary" : "outline"
                                }
                                data-testid={`badge-all-request-status-${request.id}`}
                              >
                                {request.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-all-request-notes-${request.id}`}>
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
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Book Management</h2>
                <p className="text-muted-foreground">Add, edit, and organize the library collection</p>
              </div>
              <Button
                onClick={() => setShowAddBookModal(true)}
                data-testid="button-add-new-book"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Book
              </Button>
            </div>

            {/* Search and Filter */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-books"
                    className="flex-1"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48" data-testid="select-category-filter">
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

            {/* Books Table */}
            <Card>
              <CardContent className="p-0">
                {booksLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading books...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book Details</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
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
                                  <div className="text-sm text-muted-foreground" data-testid={`text-book-author-${book.id}`}>
                                    {book.author}
                                  </div>
                                  {book.isbn && (
                                    <div className="text-xs text-muted-foreground" data-testid={`text-book-isbn-${book.id}`}>
                                      ISBN: {book.isbn}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" data-testid={`badge-book-category-${book.id}`}>
                                {book.category}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-accent" data-testid={`text-book-available-${book.id}`}>
                                  {book.availableCopies}
                                </span>
                                <span className="text-muted-foreground">/</span>
                                <span data-testid={`text-book-total-${book.id}`}>{book.totalCopies}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={book.availableCopies > 0 ? "default" : "destructive"}
                                data-testid={`badge-book-status-${book.id}`}
                              >
                                {book.availableCopies > 0 ? "Available" : "Out of Stock"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-edit-book-${book.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBookMutation.mutate(book.id)}
                                  disabled={deleteBookMutation.isPending}
                                  data-testid={`button-delete-book-${book.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">All Transactions</h2>
              <p className="text-muted-foreground">Monitor all borrowing and return activities</p>
            </div>

            <Card>
              <CardContent className="p-0">
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Borrowed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {allTransactions.map((transaction) => {
                          const dueDate = new Date(transaction.dueDate);
                          const today = new Date();
                          const isOverdue = transaction.status === "BORROWED" && dueDate < today;

                          return (
                            <tr key={transaction.id} className="hover:bg-muted/50" data-testid={`row-transaction-${transaction.id}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-xs font-medium text-primary" data-testid={`text-user-initials-${transaction.id}`}>
                                      {transaction.user.fullName.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground" data-testid={`text-user-name-${transaction.id}`}>
                                      {transaction.user.fullName}
                                    </div>
                                    <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${transaction.id}`}>
                                      {transaction.user.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground" data-testid={`text-book-title-${transaction.id}`}>
                                  {transaction.book.title}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-book-author-${transaction.id}`}>
                                  {transaction.book.author}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-borrowed-date-${transaction.id}`}>
                                {new Date(transaction.borrowedDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-due-date-${transaction.id}`}>
                                {dueDate.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant={
                                    transaction.status === "RETURNED" ? "default" :
                                    isOverdue ? "destructive" : "secondary"
                                  }
                                  data-testid={`badge-status-${transaction.id}`}
                                >
                                  {transaction.status === "RETURNED" ? "Returned" :
                                   isOverdue ? "Overdue" : "Borrowed"}
                                </Badge>
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
          </TabsContent>
        </Tabs>

        <AddBookModal 
          open={showAddBookModal} 
          onOpenChange={setShowAddBookModal}
        />
      </div>
    </div>
  );
}
