import { requireAuth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/actions/notifications";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const unreadCount = await getUnreadCount();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session} unreadCount={unreadCount} />
      <main className="lg:pl-64">
        <div className="container mx-auto max-w-7xl p-4 pt-16 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
