import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, BookOpen, ExternalLink, Download, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  bookLinks?: BookLink[];
}

interface BookLink {
  title: string;
  url: string;
  type: 'free' | 'purchase';
  platform?: string;
  price?: string;
}

export function AIChatAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [animatedText, setAnimatedText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello ${user?.fullName || 'there'}! I'm your AI Library Assistant. I can help you with:

• Checking when your books are due
• Finding book recommendations
• Library policies and hours
• Finding free or paid e-book downloads
• Book availability and reservations

How can I assist you today?`,
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isBookSearch = (message: string): boolean => {
    const bookSearchKeywords = [
      'download', 'find book', 'get book', 'book copy', 'e-book', 'ebook', 'pdf',
      'read online', 'free book', 'buy book', 'purchase book', 'book link',
      'where can i find', 'looking for book', 'need book', 'want to read',
      'book about', 'search for', 'looking for', 'find', 'get', 'want', 'need'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasKeyword = bookSearchKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasBookTerm = /\b(book|novel|story|text|title)\b/i.test(message);
    const looksLikeSearch = hasBookTerm && /\b(about|on|by|called|titled|named)\b/i.test(message);
    
    return hasKeyword || looksLikeSearch;
  };

  // Animated text effect for loading message
  useEffect(() => {
    if (!loadingMessage || !isLoading) {
      setAnimatedText("");
      return;
    }

    let currentIndex = 0;
    const fullText = loadingMessage;
    setAnimatedText("");
    
    const typeWriter = setInterval(() => {
      setAnimatedText(fullText.substring(0, currentIndex + 1));
      currentIndex++;
      
      if (currentIndex >= fullText.length) {
        clearInterval(typeWriter);
        // Start dot animation after text is complete
        let dotCount = 0;
        const dotAnimation = setInterval(() => {
          if (!isLoading) {
            clearInterval(dotAnimation);
            return;
          }
          dotCount = (dotCount + 1) % 4;
          setAnimatedText(fullText + ".".repeat(dotCount));
        }, 500);
        
        return () => clearInterval(dotAnimation);
      }
    }, 50);

    return () => clearInterval(typeWriter);
  }, [loadingMessage, isLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    // Check if this looks like a book search to show appropriate loading message
    const isBookSearchQuery = isBookSearch(inputMessage);
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setLoadingMessage(isBookSearchQuery ? "Finding your book..." : "Thinking...");

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        bookLinks: data.bookLinks,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
      setAnimatedText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseChat = async () => {
    try {
      // Clear chat history on server when closing
      await fetch('/api/ai-chat/history', {
        method: 'DELETE',
      });
    } catch (error) {
      console.log('Failed to clear chat history:', error);
    } finally {
      setIsOpen(false);
    }
  };

  const renderBookLinks = (bookLinks?: BookLink[]) => {
    if (!bookLinks || bookLinks.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-foreground mb-3">Book Resources:</p>
        {bookLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors overflow-hidden">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium truncate break-words leading-tight">{link.title}</p>
              {link.platform && (
                <p className="text-xs text-muted-foreground">{link.platform}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {link.type === 'free' ? (
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  <Download className="h-3 w-3 mr-1" />
                  Free
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {link.price || 'Buy'}
                </Badge>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={() => window.open(link.url, '_blank')}
                data-testid={`book-link-${index}`}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Don't render if user is not a student
  if (!user || user.role !== 'STUDENT') {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div 
        className={cn(
          "fixed bottom-4 left-4 z-50 transition-all duration-300",
          "sm:bottom-6 sm:left-6",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
          data-testid="chat-open-button"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleCloseChat}
          />
          
          {/* Chat Modal - Centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300" data-testid="chat-window">
            <div className="w-full max-w-md h-[32rem] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <Card className="h-full flex flex-col shadow-2xl border-2 bg-background/95 backdrop-blur-md">
            <CardHeader className="pb-3 bg-primary text-primary-foreground rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle className="text-sm font-semibold">AI Library Assistant</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseChat}
                  className="h-6 w-6 p-0 hover:bg-primary-foreground/20 text-primary-foreground"
                  data-testid="chat-close-button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.type === 'assistant' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            AI
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg p-4 text-sm leading-relaxed overflow-hidden shadow-sm",
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-background border border-border'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere mb-0">{message.content}</p>
                        {renderBookLinks(message.bookLinks)}
                      </div>
                      {message.type === 'user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted">
                            {user?.fullName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          {animatedText && <span className="text-muted-foreground">{animatedText}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
              
              <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about library services..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="text-sm flex-1"
                    data-testid="chat-input"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="shrink-0"
                    data-testid="chat-send-button"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}