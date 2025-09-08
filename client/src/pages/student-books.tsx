import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Filter, Sparkles, RefreshCw, ArrowLeft } from "lucide-react";
import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/use-favorites";
import { Book } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileBookCard } from "@/components/mobile-book-card";

function StudentBooks() {
  const { toast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isIntelligentSearch, setIsIntelligentSearch] = useState(false);
  const [intelligentResults, setIntelligentResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: availableBooks = [], isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books/available"],
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

  // Intelligent search function
  const performIntelligentSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIntelligentResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/books/search/intelligent?query=${encodeURIComponent(query.trim())}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const results = await response.json();
      setIntelligentResults(results);
    } catch (error) {
      toast({
        title: "Intelligent search failed",
        description: "Falling back to regular search",
        variant: "destructive",
      });
      setIsIntelligentSearch(false);
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // Handle search mode toggle
  const toggleSearchMode = useCallback(() => {
    setIsIntelligentSearch(!isIntelligentSearch);
    if (!isIntelligentSearch && searchQuery.trim()) {
      // Switching to intelligent search with existing query
      performIntelligentSearch(searchQuery);
    } else {
      // Switching to regular search
      setIntelligentResults([]);
    }
  }, [isIntelligentSearch, searchQuery, performIntelligentSearch]);

  // Debounced intelligent search effect
  useEffect(() => {
    if (!isIntelligentSearch || !searchQuery.trim()) return;
    
    const timeoutId = setTimeout(() => {
      performIntelligentSearch(searchQuery);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isIntelligentSearch, performIntelligentSearch]);

  const filteredBooks = useMemo(() => {
    // Use intelligent search results if intelligent search is active and has results
    const booksToFilter = isIntelligentSearch && intelligentResults.length > 0 
      ? intelligentResults 
      : availableBooks;

    // For intelligent search, apply only category filter (search is already done by AI)
    if (isIntelligentSearch && intelligentResults.length > 0) {
      return booksToFilter.filter(book => {
        const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
        return matchesCategory;
      });
    }

    // For regular search, apply both search and category filters
    return booksToFilter.filter(book => {
      const matchesSearch = searchQuery === "" || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [availableBooks, intelligentResults, searchQuery, categoryFilter, isIntelligentSearch]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 block md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold text-foreground" data-testid="books-header-title">
              All Books
            </h1>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="relative">
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div className="text-center text-white">
              <div className="flex items-center justify-center mb-4">
                <BookOpen className="h-12 w-12 mr-4" />
              </div>
              <h1 className="text-4xl font-bold mb-3">Library Collection</h1>
              <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Discover and explore our complete catalog of {availableBooks.length} books
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Search and Filter Section */}
        <Card className="shadow-lg border-0 bg-white dark:bg-card">
          <CardHeader className="pb-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-t-lg">
            <CardTitle className="text-xl md:text-2xl flex items-center justify-between" data-testid="books-search-title">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <span>Search & Discover</span>
              </div>
              <div className="flex items-center gap-3">
                {isSearching && (
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                <button
                  onClick={toggleSearchMode}
                  className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 ${
                    isIntelligentSearch 
                      ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:shadow-md'
                  }`}
                  data-testid="intelligent-search-toggle"
                  title={isIntelligentSearch ? "AI Search Active" : "Enable AI Search"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </CardTitle>
            {isIntelligentSearch && (
              <div className="bg-gradient-to-r from-primary/5 to-purple/5 rounded-xl p-4 mt-4 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary text-sm">AI-Powered Search</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask in natural language: "mystery novels", "books about science", "programming guides"
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="relative md:col-span-8">
                <Input
                  type="text"
                  placeholder={
                    isIntelligentSearch 
                      ? "Ask in natural language: 'books about space exploration'..." 
                      : "Search by title, author, or ISBN..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && isIntelligentSearch && searchQuery.trim()) {
                      performIntelligentSearch(searchQuery);
                    }
                  }}
                  data-testid="books-search-input"
                  className="text-base pr-12 h-12 bg-background border-2 focus:border-primary transition-colors"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {isIntelligentSearch ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <Search className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="md:col-span-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="books-category-filter" className="h-12 bg-background border-2 focus:border-primary transition-colors">
                    <Filter className="h-4 w-4 mr-2" />
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
            </div>
            
            {(searchQuery || categoryFilter) && (
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium">Showing {filteredBooks.length} of {availableBooks.length} books</span>
                </div>
                {(searchQuery || categoryFilter) && (
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("");
                      setIntelligentResults([]);
                    }}
                    variant="ghost"
                    size="sm"
                    data-testid="clear-filters-button"
                    className="text-primary hover:bg-primary/10"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Books List */}
        <Card className="shadow-lg border-0 bg-white dark:bg-card">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-800 dark:to-purple-900 rounded-t-lg">
            <CardTitle className="text-xl md:text-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <span>Available Books</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {filteredBooks.length} books
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {booksLoading ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <BookOpen className="h-12 w-12 text-primary animate-pulse" />
                    <div className="absolute inset-0 animate-spin">
                      <div className="h-12 w-12 border-3 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-lg font-medium text-foreground">Loading Library Collection</p>
                    <p className="text-muted-foreground">Discovering amazing books for you...</p>
                  </div>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    {searchQuery || categoryFilter ? "No books found" : "No books available"}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {searchQuery || categoryFilter 
                      ? "We couldn't find any books matching your criteria. Try adjusting your search terms or browse different categories." 
                      : "Our library collection is being updated. Check back soon for new additions!"
                    }
                  </p>
                  {(searchQuery || categoryFilter) && (
                    <Button
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("");
                      }}
                      variant="outline"
                      className="mt-4"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBooks.map((book) => (
                  <div key={book.id} className="md:hidden">
                    <MobileBookCard
                      book={book}
                      onRequest={(bookId) => requestMutation.mutate({ bookId })}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={isFavorite(book.id)}
                      isRequesting={requestMutation.isPending}
                    />
                  </div>
                ))}
                {/* Desktop Book Cards */}
                {filteredBooks.map((book) => (
                  <div key={`desktop-${book.id}`} className="hidden md:block">
                    <Card className="group border-0 shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-card dark:to-slate-900">
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          {/* Book Cover & Title */}
                          <div className="flex gap-4 mb-4">
                            <div className="flex-shrink-0">
                              <div className="w-16 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-lg shadow-lg flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-foreground line-clamp-2 mb-2" data-testid={`text-book-title-${book.id}`}>
                                {book.title}
                              </h3>
                              <p className="text-muted-foreground text-sm mb-1" data-testid={`text-book-author-${book.id}`}>
                                by {book.author}
                              </p>
                              {book.isbn && (
                                <p className="text-xs text-muted-foreground" data-testid={`text-book-isbn-${book.id}`}>
                                  ISBN: {book.isbn}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Category & Availability */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium" data-testid={`badge-book-category-${book.id}`}>
                              {book.category}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-foreground" data-testid={`text-book-available-${book.id}`}>
                                {book.availableCopies} / {book.totalCopies}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                available
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between mt-auto">
                            <button
                              onClick={() => toggleFavorite(book.id)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors group/fav"
                              data-testid={`button-favorite-${book.id}`}
                            >
                              <div className={`w-5 h-5 transition-colors ${
                                isFavorite(book.id) 
                                  ? 'text-red-500' 
                                  : 'text-muted-foreground group-hover/fav:text-red-500'
                              }`}>
                                <svg fill={isFavorite(book.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </div>
                            </button>
                            
                            <Button
                              onClick={() => requestMutation.mutate({ bookId: book.id })}
                              disabled={requestMutation.isPending || book.availableCopies === 0}
                              data-testid={`button-request-${book.id}`}
                              className="flex-1 ml-3 disabled:opacity-50"
                              size="sm"
                            >
                              {requestMutation.isPending ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span className="text-xs">Requesting...</span>
                                </div>
                              ) : book.availableCopies === 0 ? (
                                "Unavailable"
                              ) : (
                                "Request Book"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Library Stats & Info */}
        {filteredBooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                  {availableBooks.length}
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  Total Books
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                  {filteredBooks.length}
                </div>
                <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">
                  Search Results
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  ❤️
                </div>
                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                  Save Favorites
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation userRole="student" />
    </div>
  );
}

export default memo(StudentBooks);