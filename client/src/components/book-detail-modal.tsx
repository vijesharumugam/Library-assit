import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  User, 
  Building, 
  Calendar, 
  Hash, 
  Tag, 
  Info, 
  Brain,
  Eye,
  Heart,
  ShoppingCart
} from "lucide-react";
import { Book } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { AIBookContent } from "./ai-book-content";

interface BookDetailModalProps {
  book: Book;
  children: React.ReactNode;
  onRequestBook?: (bookId: string) => void;
  isRequesting?: boolean;
}

export function BookDetailModal({ book, children, onRequestBook, isRequesting = false }: BookDetailModalProps) {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const isFavorite = favorites.includes(book.id);
  const isAvailable = book.availableCopies > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-8 w-6 bg-gradient-to-b from-blue-600 to-blue-800 rounded shadow-sm flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="truncate" data-testid="modal-book-title">{book.title}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="tab-book-details">
              <Info className="mr-1 h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="ai-content" data-testid="tab-ai-content">
              <Brain className="mr-1 h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              <ShoppingCart className="mr-1 h-4 w-4" />
              Actions
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Book Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Book Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Author:</span>
                        <span className="text-sm" data-testid="text-book-author">{book.author}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Category:</span>
                        <Badge variant="outline" data-testid="badge-book-category">
                          {book.category}
                        </Badge>
                      </div>

                      {book.isbn && (
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">ISBN:</span>
                          <span className="text-sm font-mono" data-testid="text-book-isbn">{book.isbn}</span>
                        </div>
                      )}

                      {book.publisher && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Publisher:</span>
                          <span className="text-sm" data-testid="text-book-publisher">{book.publisher}</span>
                        </div>
                      )}

                    </div>
                  </CardContent>
                </Card>

                {/* Availability */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Availability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Available Copies:</span>
                        <div className="flex items-center gap-2">
                          <span 
                            className={cn(
                              "text-lg font-semibold",
                              isAvailable ? "text-green-600" : "text-red-600"
                            )}
                            data-testid="text-available-copies"
                          >
                            {book.availableCopies}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            / {book.totalCopies}
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(book.availableCopies / book.totalCopies) * 100}%` 
                          }}
                        />
                      </div>
                      
                      <div className="text-center">
                        <Badge 
                          variant={isAvailable ? "default" : "destructive"}
                          data-testid="badge-availability-status"
                        >
                          {isAvailable ? "Available" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {book.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-book-description">
                      {book.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai-content" className="space-y-4">
              <AIBookContent book={book} />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Book Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Request Book */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => onRequestBook?.(book.id)}
                      disabled={isRequesting || !isAvailable}
                      className="w-full"
                      data-testid="button-request-book"
                    >
                      {isRequesting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Requesting...
                        </div>
                      ) : !isAvailable ? (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Unavailable
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Request Book
                        </>
                      )}
                    </Button>
                    {!isAvailable && (
                      <p className="text-xs text-muted-foreground text-center">
                        This book is currently out of stock. Check back later.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Add to Favorites */}
                  <Button
                    variant="outline"
                    onClick={() => toggleFavorite(book.id)}
                    className="w-full"
                    data-testid="button-toggle-favorite"
                  >
                    <Heart className={cn(
                      "mr-2 h-4 w-4",
                      isFavorite && "fill-current text-red-500"
                    )} />
                    {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  </Button>

                  <Separator />

                  {/* Preview Mode */}
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("ai-content")}
                    className="w-full"
                    data-testid="button-view-ai-content"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View AI Analysis
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}