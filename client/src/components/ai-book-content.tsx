import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Quote, 
  Lightbulb, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Book, BookAIContent, Role } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AIBookContentProps {
  book: Book;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: Date;
}

export function AIBookContent({ book }: AIBookContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState<QuestionAnswer[]>([]);

  // Query for existing AI content
  const { data: aiContent, isLoading: contentLoading, error: contentError } = useQuery<BookAIContent>({
    queryKey: ["/api/ai/content", book.id],
    enabled: !!book.id,
  });

  // Mutation to generate AI content
  const generateContentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ai/content/generate/${book.id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/content", book.id] });
      toast({
        title: "AI Content Generated",
        description: "Book analysis completed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to ask questions about the book
  const askQuestionMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const res = await apiRequest("POST", `/api/ai/content/question/${book.id}`, {
        question: questionText,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setConversations(prev => [...prev, {
        question: data.question,
        answer: data.answer,
        timestamp: new Date()
      }]);
      setQuestion("");
      toast({
        title: "Question Answered",
        description: "Got AI response about the book!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Question Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAskQuestion = () => {
    if (!question.trim()) return;
    askQuestionMutation.mutate(question.trim());
  };

  const canGenerate = user?.role === Role.LIBRARIAN || user?.role === Role.ADMIN;

  // Note: BookAIContent doesn't have validUntil, consider content older than 7 days as potentially outdated
  const isContentExpired = aiContent?.lastUpdated && 
    (new Date().getTime() - new Date(aiContent.lastUpdated).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Book Analysis
          </CardTitle>
          {canGenerate && (
            <Button
              onClick={() => generateContentMutation.mutate()}
              disabled={generateContentMutation.isPending}
              size="sm"
              variant={aiContent ? "outline" : "default"}
              data-testid="button-generate-ai-content"
            >
              {generateContentMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {aiContent ? "Regenerate" : "Generate"} Content
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{book.title} by {book.author}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Content Status */}
        {aiContent && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              {isContentExpired ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Content may be outdated</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">AI analysis available</span>
                </>
              )}
              <Badge variant="outline" className="ml-auto">
                <Clock className="mr-1 h-3 w-3" />
                {aiContent.lastUpdated && !isNaN(new Date(aiContent.lastUpdated).getTime()) 
                  ? new Date(aiContent.lastUpdated).toLocaleDateString()
                  : "Unknown date"
                }
              </Badge>
            </div>
          </div>
        )}

        {contentError && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load AI content. Please try generating new content.
            </AlertDescription>
          </Alert>
        )}

        {!aiContent && !contentLoading && !contentError && (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No AI analysis available for this book yet.</p>
              {!canGenerate && (
                <p className="text-sm mt-2">Contact a librarian to generate AI content.</p>
              )}
            </div>
          </div>
        )}

        {contentLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {aiContent && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" data-testid="tab-summary">
                <BookOpen className="mr-1 h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="guide" data-testid="tab-study-guide">
                <Lightbulb className="mr-1 h-4 w-4" />
                Study Guide
              </TabsTrigger>
              <TabsTrigger value="quotes" data-testid="tab-quotes">
                <Quote className="mr-1 h-4 w-4" />
                Key Quotes
              </TabsTrigger>
              <TabsTrigger value="qa" data-testid="tab-qa">
                <MessageSquare className="mr-1 h-4 w-4" />
                Q&A
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="summary" className="space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3 className="text-lg font-semibold mb-3">Book Summary</h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {aiContent.summary}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3 className="text-lg font-semibold mb-3">Study Guide</h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {aiContent.studyGuide}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quotes" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-3">Key Quotes & Insights</h3>
                  {aiContent.quotes && aiContent.quotes.length > 0 ? (
                    aiContent.quotes.map((quote: string, index: number) => (
                      <Card key={index} className="p-4 border-l-4 border-l-primary">
                        <div className="text-sm italic mb-2">"{quote}"</div>
                        <div className="text-xs text-muted-foreground">
                          From {book.title}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No key quotes extracted yet.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="qa" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Ask About This Book</h3>
                  
                  {/* Question Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask any question about this book..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                      disabled={askQuestionMutation.isPending}
                      data-testid="input-question"
                    />
                    <Button
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || askQuestionMutation.isPending}
                      size="sm"
                      data-testid="button-ask-question"
                    >
                      {askQuestionMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Conversation History */}
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-4">
                      {conversations.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No questions asked yet. Start a conversation!</p>
                        </div>
                      ) : (
                        conversations.map((qa, index) => (
                          <div key={index} className="space-y-3">
                            {/* User Question */}
                            <div className="flex justify-end">
                              <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                                <div className="text-sm">{qa.question}</div>
                                <div className="text-xs opacity-70 mt-1">
                                  {qa.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            
                            {/* AI Answer */}
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                                <div className="text-sm whitespace-pre-wrap">{qa.answer}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  AI Assistant
                                </div>
                              </div>
                            </div>
                            
                            {index < conversations.length - 1 && (
                              <Separator className="my-4" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}