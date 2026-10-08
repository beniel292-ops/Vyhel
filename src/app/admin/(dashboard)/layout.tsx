import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isDatabaseConfigured } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) redirect("/admin/login");
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar user={user} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-10 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
