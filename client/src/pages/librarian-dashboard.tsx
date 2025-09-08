import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Users, Clock, TrendingUp, LogOut, Plus, Edit, Trash2, Upload, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo, memo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction, User, BookRequest, ExtensionRequest, TransactionStatus, BookRequestStatus, ExtensionRequestStatus, Role } from "@shared/schema";
import { AddBookModal } from "@/components/add-book-modal";
import { EditBookModal } from "@/components/edit-book-modal";
import { BorrowModal } from "@/components/borrow-modal";
import { ExcelUploadModal } from "@/components/excel-upload-modal";
import FloatingLibraryElements from "@/components/FloatingLibraryElements";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { BottomNavigation } from "@/components/bottom-navigation";

function LibrarianDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
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

  const { data: extensionRequests = [], isLoading: extensionRequestsLoading } = useQuery<(ExtensionRequest & { user: User; transaction: Transaction & { book: Book } })[]>({
    queryKey: ["/api/extension-requests"],
  });

  const { data: pendingExtensionRequests = [], isLoading: pendingExtensionRequestsLoading } = useQuery<(ExtensionRequest & { user: User; transaction: Transaction & { book: Book } })[]>({
    queryKey: ["/api/extension-requests/pending"],
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

  const approveExtensionMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/extension-requests/${requestId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extension-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/extension-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Extension approved successfully",
        description: "The extension request has been approved and the due date updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve extension",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectExtensionMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/extension-requests/${requestId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extension-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/extension-requests/pending"] });
      toast({
        title: "Extension rejected",
        description: "The extension request has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject extension",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setShowEditBookModal(true);
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = searchQuery === "" || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).slice(0, 10);
  }, [books, searchQuery, categoryFilter]);

  const { totalBooks, borrowedBooks, overdueBooks, activeUsers, totalPendingRequests } = useMemo(() => {
    const borrowedTransactions = allTransactions.filter(t => t.status === "BORROWED");
    const today = new Date();
    
    return {
      totalBooks: books.length,
      borrowedBooks: borrowedTransactions.length,
      overdueBooks: borrowedTransactions.filter(t => {
        const dueDate = new Date(t.dueDate);
        return dueDate < today;
      }).length,
      activeUsers: new Set(borrowedTransactions.map(t => t.userId)).size,
      totalPendingRequests: pendingRequests.length
    };
  }, [books, allTransactions, pendingRequests]);

  return (
    <div className="min-h-screen bg-background library-pattern relative pb-20 md:pb-0">
      <FloatingLibraryElements />
      {/* Mobile Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-40 block md:hidden shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-chart-2 to-primary rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground" data-testid="mobile-header-title">Library</h1>
                <p className="text-xs text-muted-foreground -mt-1">Librarian Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-card border-b border-border elegant-shadow relative z-10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-base sm:text-xl library-heading">Library Sanctum - Librarian</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-muted-foreground hidden lg:block">
                Welcome, <span className="font-medium text-foreground" data-testid="text-user-name">{user?.fullName}</span>
              </span>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Layout */}
      <div className="block md:hidden px-4 py-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/15 hover:to-accent/15 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-semibold">Books</p>
                  <p className="text-2xl font-bold text-primary" data-testid="mobile-stat-books">
                    {totalBooks}
                  </p>
                </div>
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-r from-chart-3/10 to-chart-4/10 border-chart-3/20 hover:from-chart-3/15 hover:to-chart-4/15 transition-all duration-300 cursor-pointer"
            onClick={() => setLocation("/librarian/borrowed-books")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-chart-3 font-semibold">Borrowed</p>
                  <p className="text-2xl font-bold text-chart-3" data-testid="mobile-stat-borrowed">
                    {borrowedBooks}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-chart-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="bg-gradient-to-r from-chart-4/10 to-destructive/10 border-chart-4/20 hover:from-chart-4/15 hover:to-destructive/15 transition-all duration-300 cursor-pointer"
            onClick={() => setLocation("/librarian/overdue-books")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-chart-4 font-semibold">Overdue</p>
                  <p className="text-2xl font-bold text-chart-4" data-testid="mobile-stat-overdue">
                    {overdueBooks}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between" data-testid="mobile-pending-title">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Requests
              </div>
              <Badge variant="outline" className="text-xs">
                {totalPendingRequests} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequestsLoading ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading requests...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              pendingRequests.slice(0, 3).map((request) => (
                <Card key={request.id} className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium" data-testid={`mobile-request-book-${request.id}`}>
                        {request.book.title}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`mobile-request-student-${request.id}`}>
                        by {request.user.fullName}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => approveRequestMutation.mutate(request.id)}
                        disabled={approveRequestMutation.isPending}
                        className="h-7 px-2 text-xs"
                        data-testid={`mobile-approve-${request.id}`}
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectRequestMutation.mutate(request.id)}
                        disabled={rejectRequestMutation.isPending}
                        className="h-7 px-2 text-xs"
                        data-testid={`mobile-reject-${request.id}`}
                      >
                        ✗
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
            {pendingRequests.length > 3 && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation("/librarian")}>
                View all {pendingRequests.length} requests
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" data-testid="mobile-actions-title">
              <Plus className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              onClick={() => setShowAddBookModal(true)}
              data-testid="mobile-add-book"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Book
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => setShowBorrowModal(true)}
              data-testid="mobile-borrow-book"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Borrow Book
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => setShowExcelUploadModal(true)}
              data-testid="mobile-upload-excel"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-11 bg-muted p-1 rounded-lg">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-xs sm:text-sm font-medium">Dashboard</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests" className="text-xs sm:text-sm font-medium">Requests</TabsTrigger>
            <TabsTrigger value="extensions" data-testid="tab-extensions" className="text-xs sm:text-sm font-medium">Extensions</TabsTrigger>
            <TabsTrigger value="books" data-testid="tab-books" className="text-xs sm:text-sm font-medium">Books</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions" className="text-xs sm:text-sm font-medium">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 fade-in-float">
              <Card className="library-card">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 gold-accent rounded-lg">
                      <BookOpen className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground library-subheading">Total Books</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-total-books">
                        {totalBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer library-card"
                onClick={() => setLocation("/librarian/borrowed-books")}
                data-testid="card-borrowed-books"
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-accent/20 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-accent" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground library-subheading">Books Borrowed</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-borrowed-books">
                        {borrowedBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer library-card"
                onClick={() => setLocation("/librarian/overdue-books")}
                data-testid="card-overdue-books"
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-chart-4/20 rounded-lg">
                      <Clock className="h-6 w-6 text-chart-4" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground library-subheading">Overdue</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-overdue-books">
                        {overdueBooks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="library-card">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-chart-5/20 rounded-lg">
                      <Users className="h-6 w-6 text-chart-5" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground library-subheading">Active Users</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-active-users">
                        {activeUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="library-card">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-chart-2/20 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-chart-2" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground library-subheading">Pending Requests</p>
                      <p className="text-2xl font-semibold text-foreground" data-testid="stat-pending-requests">
                        {totalPendingRequests}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="library-card">
              <CardHeader>
                <CardTitle data-testid="title-recent-activity" className="library-heading">Recent Activity</CardTitle>
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

          <TabsContent value="extensions" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Extension Requests</h2>
                <p className="text-muted-foreground">Manage student book extension requests</p>
              </div>
            </div>

            {/* Pending Extension Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between" data-testid="title-pending-extensions">
                  <span>Pending Extension Requests</span>
                  <Badge variant="outline" className="text-sm">
                    {pendingExtensionRequests.length} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingExtensionRequestsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading pending extension requests...</p>
                  </div>
                ) : pendingExtensionRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No pending extension requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingExtensionRequests.map((request) => {
                      const currentDueDate = new Date(request.transaction.dueDate);
                      const requestedDueDate = new Date(request.requestedDueDate);
                      const isOverdue = currentDueDate < new Date();
                      
                      return (
                        <div
                          key={request.id}
                          className={`border rounded-lg p-4 ${
                            isOverdue 
                              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' 
                              : 'border-border bg-card'
                          }`}
                          data-testid={`card-extension-request-${request.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              {/* Book Icon */}
                              <div className="w-12 h-16 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm flex items-center justify-center flex-shrink-0">
                                <BookOpen className="h-4 w-4 text-white" />
                              </div>
                              
                              {/* Request Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground truncate" data-testid={`text-extension-book-title-${request.id}`}>
                                    {request.transaction.book.title}
                                  </h4>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate" data-testid={`text-extension-book-author-${request.id}`}>
                                  by {request.transaction.book.author}
                                </p>
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Student:</span> {request.user.fullName} ({request.user.username})
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Current Due:</span> {currentDueDate.toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Requested Due:</span> {requestedDueDate.toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Reason:</span> {request.reason}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Requested:</span> {new Date(request.requestDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => approveExtensionMutation.mutate(request.id)}
                                disabled={approveExtensionMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-approve-extension-${request.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {approveExtensionMutation.isPending ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectExtensionMutation.mutate(request.id)}
                                disabled={rejectExtensionMutation.isPending}
                                data-testid={`button-reject-extension-${request.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {rejectExtensionMutation.isPending ? "Rejecting..." : "Reject"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Extension Requests */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-all-extensions">All Extension Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {extensionRequestsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading all extension requests...</p>
                  </div>
                ) : extensionRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No extension requests found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Due</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Requested Due</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {extensionRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-muted/50" data-testid={`row-extension-${request.id}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-foreground" data-testid={`text-extension-student-${request.id}`}>
                                  {request.user.fullName}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`text-extension-username-${request.id}`}>
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
                                  <div className="text-sm font-medium text-foreground" data-testid={`text-extension-book-title-${request.id}`}>
                                    {request.transaction.book.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground" data-testid={`text-extension-book-author-${request.id}`}>
                                    {request.transaction.book.author}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-extension-current-due-${request.id}`}>
                              {new Date(request.transaction.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-extension-requested-due-${request.id}`}>
                              {new Date(request.requestedDueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={
                                  request.status === "APPROVED" ? "default" :
                                  request.status === "REJECTED" ? "destructive" : "outline"
                                }
                                data-testid={`badge-extension-status-${request.id}`}
                              >
                                {request.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-extension-request-date-${request.id}`}>
                              {new Date(request.requestDate).toLocaleDateString()}
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
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowBorrowModal(true)}
                  variant="outline"
                  data-testid="button-borrow-book"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Borrow Book
                </Button>
                <Button
                  onClick={() => setShowExcelUploadModal(true)}
                  variant="outline"
                  data-testid="button-upload-excel"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel
                </Button>
                <Button
                  onClick={() => setShowAddBookModal(true)}
                  data-testid="button-add-new-book"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Book
                </Button>
              </div>
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
                  <div className="space-y-4 py-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="h-12 w-8 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="h-6 bg-muted rounded w-16"></div>
                        <div className="h-6 bg-muted rounded w-20"></div>
                        <div className="flex space-x-2">
                          <div className="h-8 w-8 bg-muted rounded"></div>
                          <div className="h-8 w-8 bg-muted rounded"></div>
                        </div>
                      </div>
                    ))}
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
                                  onClick={() => handleEditBook(book)}
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
        
        <EditBookModal 
          open={showEditBookModal} 
          onOpenChange={setShowEditBookModal}
          book={editingBook}
        />
        
        <BorrowModal 
          open={showBorrowModal} 
          onOpenChange={setShowBorrowModal}
        />
        
        <ExcelUploadModal 
          open={showExcelUploadModal} 
          onOpenChange={setShowExcelUploadModal}
        />
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation userRole="librarian" />
    </div>
  );
}

export default memo(LibrarianDashboard);
