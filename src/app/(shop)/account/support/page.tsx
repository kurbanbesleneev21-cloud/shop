import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SupportForm } from "@/components/shop/support-form";
import { formatDate } from "@/lib/utils";

export default async function AccountSupport({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = (await getCurrentUser())!;
  const sp = await searchParams;
  const tickets = await prisma.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Обращения в поддержку</h2>
      <SupportForm orderId={sp.order} />
      {tickets.map((t) => (
        <div key={t.id} className="rounded-card border border-ink-100 p-4">
          <div className="flex flex-wrap items-center gap-2"><b>{t.subject}</b><span className="text-xs text-ink-500">{formatDate(t.createdAt, true)}</span><span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold">{t.status === "OPEN" ? "Открыто" : t.status === "ANSWERED" ? "Есть ответ" : "Закрыто"}</span></div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{t.message}</p>
          {t.reply && <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm"><b className="text-brand">Ответ поддержки:</b> {t.reply}</div>}
        </div>
      ))}
    </div>
  );
}
