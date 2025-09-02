import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Filter } from "lucide-react";
import { useState, useMemo, memo } from "react";
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


  const filteredBooks = useMemo(() => {
    return availableBooks.filter(book => {
      const matchesSearch = searchQuery === "" || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "" || categoryFilter === "all" || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [availableBooks, searchQuery, categoryFilter]);

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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search and Filter Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" data-testid="books-search-title">
              <Search className="h-4 w-4" />
              Search & Filter Books
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="books-search-input"
                className="text-base flex-1"
              />
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="books-category-filter" className="w-40">
                  <SelectValue placeholder="Category" />
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
            
            {(searchQuery || categoryFilter) && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {filteredBooks.length} of {availableBooks.length} books</span>
                {(searchQuery || categoryFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("");
                    }}
                    className="text-primary hover:underline"
                    data-testid="clear-filters-button"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Books List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Books</span>
              <div className="text-sm font-normal text-muted-foreground">
                {filteredBooks.length} books
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booksLoading ? (
              <div className="text-center py-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <BookOpen className="h-8 w-8 text-primary animate-pulse" />
                    <div className="absolute inset-0 animate-spin">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">Loading books...</p>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery || categoryFilter ? "No books found" : "No books available"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || categoryFilter 
                    ? "Try adjusting your search or filter criteria" 
                    : "Check back later for new additions to the library"
                  }
                </p>
                {(searchQuery || categoryFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("");
                    }}
                    className="text-primary hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBooks.map((book) => (
                  <MobileBookCard
                    key={book.id}
                    book={book}
                    onRequest={(bookId) => requestMutation.mutate({ bookId })}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isFavorite(book.id)}
                    isRequesting={requestMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Library Info */}
        {filteredBooks.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                    Library Collection
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    Browse our complete collection of {availableBooks.length} books. Use the heart icon to save favorites for quick access later.
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

export default memo(StudentBooks);