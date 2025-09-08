import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, BookOpen, Search, ArrowLeft } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/use-favorites";
import { Book } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileBookCard } from "@/components/mobile-book-card";

function StudentFavorites() {
  const { toast } = useToast();
  const { favorites, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");

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


  const favoriteBooks = useMemo(() => {
    const filtered = availableBooks.filter(book => 
      favorites.includes(book.id) &&
      (searchQuery === "" || 
       book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       book.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return filtered;
  }, [availableBooks, favorites, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 block md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center">
              <Heart className="h-5 w-5 text-red-500 mr-2" />
              <h1 className="text-lg font-semibold text-foreground" data-testid="favorites-header-title">
                My Favorites
              </h1>
            </div>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-card border-b border-border hidden md:block">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              data-testid="desktop-back-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center">
              <Heart className="h-6 w-6 text-red-500 mr-3" />
              <h1 className="text-2xl font-bold text-foreground">My Favorites</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Search your favorite books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="favorites-search-input"
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Favorites List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Favorite Books</span>
              <div className="text-sm font-normal text-muted-foreground">
                {favorites.length} books
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booksLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Loading books...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No favorites yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Start adding books to your favorites by tapping the heart icon
                </p>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Browse Books
                </Button>
              </div>
            ) : favoriteBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No favorite books match your search
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteBooks.map((book) => (
                  <MobileBookCard
                    key={book.id}
                    book={book}
                    onRequest={(bookId) => requestMutation.mutate({ bookId })}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={true}
                    isRequesting={requestMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        {favorites.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                    Pro Tip
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    Your favorite books are saved locally. You can quickly request them from here!
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

export default memo(StudentFavorites);