import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

// Pre-load related routes based on user role for faster navigation
export function useRoutePrefetch() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Pre-load common routes based on user role
    const prefetchRoutes = [];

    if (user.role === "STUDENT") {
      prefetchRoutes.push(
        import("@/pages/student-borrowed-books"),
        import("@/pages/student-books"),
        import("@/pages/student-profile")
      );
    } else if (user.role === "LIBRARIAN" || user.role === "ADMIN") {
      prefetchRoutes.push(
        import("@/pages/borrowed-books-page"),
        import("@/pages/overdue-books-page"),
        import("@/pages/librarian-profile")
      );
    }

    // Execute prefetch without blocking
    Promise.all(prefetchRoutes).catch(() => {
      // Silently handle prefetch failures
    });
  }, [user]);
}