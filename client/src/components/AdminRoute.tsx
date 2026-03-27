import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute — wraps any route that should only be accessible to admin users.
 * - While auth is loading: shows a skeleton loader.
 * - If user is not authenticated: redirects to /login.
 * - If user is authenticated but not admin: redirects to /dashboard.
 * - If user is admin: renders children.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
