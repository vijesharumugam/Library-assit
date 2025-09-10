import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { ProtectedRoute } from "@/lib/protected-route";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIChatAssistant } from "@/components/ai-chat-assistant";
import { Role } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

// Pre-load critical dashboard components for faster navigation
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StudentDashboard from "@/pages/student-dashboard";
import LibrarianDashboard from "@/pages/librarian-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";

// Lazy load secondary pages
const BorrowedBooksPage = lazy(() => import("@/pages/borrowed-books-page"));
const OverdueBooksPage = lazy(() => import("@/pages/overdue-books-page"));
const StudentBorrowedBooks = lazy(() => import("@/pages/student-borrowed-books"));
const StudentPendingRequests = lazy(() => import("@/pages/student-pending-requests"));
const StudentProfile = lazy(() => import("@/pages/student-profile"));
const StudentFavorites = lazy(() => import("@/pages/student-favorites"));
const StudentBooks = lazy(() => import("@/pages/student-books"));
const StudentDueSoon = lazy(() => import("@/pages/student-due-soon"));
const LibrarianProfile = lazy(() => import("@/pages/librarian-profile"));

// Loading component with library theme
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background library-pattern flex items-center justify-center">
      <Card className="p-8">
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="relative">
            <BookOpen className="h-8 w-8 text-primary animate-pulse" />
            <div className="absolute inset-0 animate-spin">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading Library Sanctum...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <ProtectedRoute 
          path="/" 
          component={() => <StudentDashboard />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student" 
          component={() => <StudentDashboard />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/borrowed-books" 
          component={() => <StudentBorrowedBooks />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/pending-requests" 
          component={() => <StudentPendingRequests />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/profile" 
          component={() => <StudentProfile />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/favorites" 
          component={() => <StudentFavorites />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/books" 
          component={() => <StudentBooks />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/student/due-soon" 
          component={() => <StudentDueSoon />} 
          allowedRoles={[Role.STUDENT]} 
        />
        <ProtectedRoute 
          path="/librarian" 
          component={() => <LibrarianDashboard />} 
          allowedRoles={[Role.LIBRARIAN, Role.ADMIN]} 
        />
        <ProtectedRoute 
          path="/librarian/borrowed-books" 
          component={() => <BorrowedBooksPage />} 
          allowedRoles={[Role.LIBRARIAN, Role.ADMIN]} 
        />
        <ProtectedRoute 
          path="/librarian/overdue-books" 
          component={() => <OverdueBooksPage />} 
          allowedRoles={[Role.LIBRARIAN, Role.ADMIN]} 
        />
        <ProtectedRoute 
          path="/librarian/profile" 
          component={() => <LibrarianProfile />} 
          allowedRoles={[Role.LIBRARIAN, Role.ADMIN]} 
        />
        <ProtectedRoute 
          path="/admin" 
          component={() => <AdminDashboard />} 
          allowedRoles={[Role.ADMIN]} 
        />
        <Route path="/auth" component={() => <AuthPage />} />
        <Route component={() => <NotFound />} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <Toaster />
              <InstallPrompt />
              <Router />
              <AIChatAssistant />
            </TooltipProvider>
          </FavoritesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
