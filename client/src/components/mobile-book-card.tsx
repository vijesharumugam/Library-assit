import { Book } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MobileBookCardProps {
  book: Book;
  onRequest: (bookId: string) => void;
  onToggleFavorite?: (bookId: string) => void;
  isFavorite?: boolean;
  isRequesting?: boolean;
}

export function MobileBookCard({ 
  book, 
  onRequest, 
  onToggleFavorite, 
  isFavorite = false,
  isRequesting = false 
}: MobileBookCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="modern-card p-4 group" data-testid={`mobile-book-card-${book.id}`}>
      <div className="flex gap-3">
        {/* Book Cover */}
        <div className="flex-shrink-0">
          {!imageError ? (
            <div 
              className="w-16 h-20 bg-gradient-to-b from-primary to-accent rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              onError={() => setImageError(true)}
            >
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          ) : (
            <div className="w-16 h-20 bg-gradient-to-b from-primary to-accent rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2" data-testid={`text-book-title-${book.id}`}>
              {book.title}
            </h3>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(book.id)}
                className="flex-shrink-0 ml-2 transition-transform duration-200 hover:scale-110 active:scale-95"
                data-testid={`button-favorite-${book.id}`}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isFavorite 
                      ? "fill-red-500 text-red-500" 
                      : "text-muted-foreground hover:text-red-500"
                  )} 
                />
              </button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2" data-testid={`text-book-author-${book.id}`}>
            by {book.author}
          </p>
          
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs" data-testid={`badge-book-category-${book.id}`}>
              {book.category}
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-book-availability-${book.id}`}>
              {book.availableCopies}/{book.totalCopies} available
            </span>
          </div>

          {book.isbn && (
            <p className="text-xs text-muted-foreground mb-3" data-testid={`text-book-isbn-${book.id}`}>
              ISBN: {book.isbn}
            </p>
          )}
          
          <Button
            size="sm"
            onClick={() => onRequest(book.id)}
            disabled={isRequesting || book.availableCopies === 0}
            className="w-full text-xs transition-all duration-200 hover:scale-105 active:scale-95"
            data-testid={`button-request-book-${book.id}`}
          >
            {isRequesting ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Requesting...
              </div>
            ) : book.availableCopies === 0 ? (
              "Unavailable"
            ) : (
              "Request Book"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}