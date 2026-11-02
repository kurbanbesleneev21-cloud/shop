import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: { default: "Админ-панель", template: "%s — Админ-панель" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/?auth=login&next=/admin");
  const [orders, reviews, sellers, tickets] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["NEW", "RETURN_REQUESTED"] } } }),
    prisma.review.count({ where: { OR: [{ status: "PENDING" }, { complaints: { gt: 0 }, status: "APPROVED" }] } }),
    prisma.seller.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
  ]);
  return (
    <div className="min-h-[100dvh] bg-ink-50">
      <AdminSidebar badges={{ orders, reviews, sellers, tickets }} />
      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
