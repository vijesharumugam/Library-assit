import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Clock, CheckCircle, Send, LogOut, Search, TrendingUp, Heart } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Book, Transaction, BookRequest } from "@shared/schema";
import FloatingLibraryElements from "@/components/FloatingLibraryElements";
import { NotificationBell } from "@/components/notification-bell";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileBookCard } from "@/components/mobile-book-card";

function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');

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


  const filteredBooks = useMemo(() => {
    return availableBooks.filter(book => {
      const matchesSearch = searchQuery === "" || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).slice(0, 10);
  }, [availableBooks, searchQuery, categoryFilter]);

  const { activeBorrowings, pendingRequests, dueSoon } = useMemo(() => {
    const active = myTransactions.filter(t => t.status === "BORROWED");
    const pending = myRequests.filter(r => r.status === "PENDING");
    const today = new Date();
    
    const dueSoonBooks = active.filter(t => {
      const dueDate = new Date(t.dueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });
    
    return {
      activeBorrowings: active,
      pendingRequests: pending,
      dueSoon: dueSoonBooks
    };
  }, [myTransactions, myRequests]);

  const handleToggleFavorite = (bookId: string) => {
    setFavorites(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const recentBooks = useMemo(() => {
    return availableBooks.slice(0, 5);
  }, [availableBooks]);

  const favoriteBooks = useMemo(() => {
    return availableBooks.filter(book => favorites.includes(book.id));
  }, [availableBooks, favorites]);

  const displayBooks = useMemo(() => {
    switch (activeTab) {
      case 'recent':
        return recentBooks;
      case 'favorites':
        return favoriteBooks;
      default:
        return filteredBooks;
    }
  }, [activeTab, recentBooks, favoriteBooks, filteredBooks]);

  return (
    <div className="min-h-screen bg-background relative pb-20 md:pb-0">
      <FloatingLibraryElements />
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 block md:hidden">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-foreground" data-testid="mobile-header-title">Student</h1>
              <Badge variant="secondary" className="text-xs">Library</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-mobile-logout">
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

      {/* Desktop Header */}
      <header className="bg-card border-b border-border elegant-shadow relative z-10 hidden md:block">
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
              <NotificationBell />
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

      {/* Mobile Layout */}
      <div className="block md:hidden px-4 py-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/student/borrowed-books">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Borrowed</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300" data-testid="mobile-stat-borrowed">
                      {activeBorrowings.length}
                    </p>
                  </div>
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/student/pending-requests">
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Pending</p>
                    <p className="text-xl font-bold text-orange-700 dark:text-orange-300" data-testid="mobile-stat-pending">
                      {pendingRequests.length}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" data-testid="mobile-search-title">
              <Search className="h-4 w-4" />
              Search Books
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="mobile-search-input"
              className="text-base"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="mobile-category-filter">
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
          </CardContent>
        </Card>

        {/* Book Tabs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base" data-testid="mobile-books-title">
                Available Books (10 samples)
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {displayBooks.length} books
              </Badge>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('all')}
                data-testid="tab-all-books"
                className="text-xs"
              >
                All
              </Button>
              <Button
                variant={activeTab === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('recent')}
                data-testid="tab-recent-books"
                className="text-xs flex items-center gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                Recent
              </Button>
              <Button
                variant={activeTab === 'favorites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('favorites')}
                data-testid="tab-favorite-books"
                className="text-xs flex items-center gap-1"
              >
                <Heart className="h-3 w-3" />
                Favorites ({favorites.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {booksLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Loading books...</p>
              </div>
            ) : displayBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  {activeTab === 'favorites' ? 'No favorite books yet' : 'No books found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayBooks.map((book) => (
                  <MobileBookCard
                    key={book.id}
                    book={book}
                    onRequest={(bookId) => requestMutation.mutate({ bookId })}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(book.id)}
                    isRequesting={requestMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 fade-in-float">
          <Link href="/student/borrowed-books">
            <Card className="library-card cursor-pointer hover:bg-muted/50 transition-colors">
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
          </Link>

          <Link href="/student/pending-requests">
            <Card className="library-card cursor-pointer hover:bg-muted/50 transition-colors">
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
          </Link>

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
            <CardTitle data-testid="title-available-books" className="library-heading">Available Books (Sample 10)</CardTitle>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation userRole="student" />

    </div>
  );
}

export default memo(StudentDashboard);
