import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Send, Clock } from "lucide-react";
import { Link } from "wouter";
import { BookRequest, Book } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function StudentPendingRequests() {
  const { user } = useAuth();

  const { data: myRequests = [], isLoading: requestsLoading } = useQuery<(BookRequest & { book: Book })[]>({
    queryKey: ["/api/book-requests/my"],
  });

  // Filter for pending requests only
  const pendingRequests = myRequests.filter(r => r.status === "PENDING");

  return (
    <div className="min-h-screen bg-background library-pattern relative">
      {/* Header */}
      <header className="bg-card border-b border-border elegant-shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/student">
                <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>
            <div className="flex items-center">
              <Send className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl library-heading">My Pending Requests</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Your Book Requests</h2>
          <p className="text-muted-foreground">
            View all your book requests waiting for librarian approval
          </p>
        </div>

        <Card className="library-card">
          <CardHeader>
            <CardTitle className="flex items-center library-heading">
              <Send className="h-5 w-5 mr-2" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading your requests...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You have no pending book requests</p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border border-border rounded-lg p-4" data-testid={`card-pending-request-${request.id}`}>
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="h-16 w-10 book-spine-gradient rounded shadow-sm flex items-center justify-center gentle-float">
                          <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-sm" data-testid={`text-book-title-${request.id}`}>
                            {request.book.title}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-book-author-${request.id}`}>
                            by {request.book.author}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Request Date:</span>
                          <span className="text-sm font-medium" data-testid={`text-request-date-${request.id}`}>
                            {new Date(request.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          <Badge variant="outline" data-testid={`badge-status-${request.id}`} className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Approval
                          </Badge>
                        </div>
                        {request.notes && (
                          <div className="flex items-start justify-between">
                            <span className="text-xs text-muted-foreground">Notes:</span>
                            <span className="text-sm text-foreground text-right flex-1 ml-2" data-testid={`text-notes-${request.id}`}>
                              {request.notes}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground text-center">
                          Waiting for librarian approval
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {pendingRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-muted/50" data-testid={`row-request-${request.id}`}>
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
                          <td className="px-6 py-4">
                            <Badge variant="outline" data-testid={`badge-request-status-${request.id}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Approval
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-request-notes-${request.id}`}>
                            {request.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}