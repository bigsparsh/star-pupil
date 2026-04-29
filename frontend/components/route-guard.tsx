"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, useAuthHydrated, UserRole } from "@/lib/store";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const hydrated = useAuthHydrated();

  useEffect(() => {
    // Wait for hydration before making auth decisions
    if (!hydrated) return;
    
    // If not authenticated and trying to access protected route
    if (!isAuthenticated && (pathname.startsWith("/programmer") || pathname.startsWith("/recruiter"))) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // If authenticated but wrong role
    if (isAuthenticated && allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard
      if (user.role === "programmer") {
        router.replace("/programmer/dashboard");
      } else if (user.role === "recruiter") {
        router.replace("/recruiter/dashboard");
      }
    }
  }, [hydrated, isAuthenticated, user, pathname, allowedRoles, router]);

  // Show loading while hydrating or checking auth
  if (!hydrated || (!isAuthenticated && (pathname.startsWith("/programmer") || pathname.startsWith("/recruiter")))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
