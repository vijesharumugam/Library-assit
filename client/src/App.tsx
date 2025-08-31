import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Role } from "@shared/schema";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StudentDashboard from "@/pages/student-dashboard";
import LibrarianDashboard from "@/pages/librarian-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import BorrowedBooksPage from "@/pages/borrowed-books-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={StudentDashboard} allowedRoles={["STUDENT"]} />
      <ProtectedRoute path="/librarian" component={LibrarianDashboard} allowedRoles={["LIBRARIAN", "ADMIN"]} />
      <ProtectedRoute path="/librarian/borrowed-books" component={BorrowedBooksPage} allowedRoles={["LIBRARIAN", "ADMIN"]} />
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={["ADMIN"]} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <InstallPrompt />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
