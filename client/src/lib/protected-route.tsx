import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, useLocation } from "wouter";
import { Role } from "@shared/schema";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import { useEffect } from "react";

// Helper to get redirect path based on user role
function getUserRolePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "LIBRARIAN":
      return "/librarian";
    case "STUDENT":
      return "/";
    default:
      return "/";
  }
}

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles = [],
}: {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles?: Role[];
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Immediate redirect for faster navigation
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
      return;
    }
    
    if (!isLoading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const redirectPath = getUserRolePath(user.role);
      setLocation(redirectPath);
      return;
    }
  }, [user, isLoading, allowedRoles, setLocation]);

  // Show loading state without wrapping in Route
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  // Don't render if user doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <Route path={path} component={Component} />;
}
