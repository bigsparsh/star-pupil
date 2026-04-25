import { Navbar } from "@/components/navbar";
import { RouteGuard } from "@/components/route-guard";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={["recruiter"]}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
