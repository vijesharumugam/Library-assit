import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { Role } from "@shared/schema";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";

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

  if (isLoading) {
    return (
      <Route path={path}>
        <DashboardSkeleton />
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    const redirectPath = user.role === "ADMIN" ? "/admin" : 
                        user.role === "LIBRARIAN" ? "/librarian" : "/";
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
