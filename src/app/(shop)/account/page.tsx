import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { smsConfigured } from "@/lib/sms";
import { getGroup } from "@/lib/settings";
import { ProfileForms } from "@/components/shop/profile-forms";
import { formatPrice } from "@/lib/utils";

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const [stats, sms, reg] = await Promise.all([
    prisma.order.aggregate({ where: { userId: user.id, status: { notIn: ["CANCELLED", "RETURNED"] } }, _count: true, _sum: { total: true } }),
    smsConfigured(),
    getGroup<{ phoneVerification: boolean }>("registration"),
  ]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-card bg-ink-50 p-4"><div className="text-sm text-ink-500">Заказов</div><div className="mt-1 text-2xl font-extrabold">{stats._count}</div></div>
        <div className="rounded-card bg-ink-50 p-4"><div className="text-sm text-ink-500">Покупок на сумму</div><div className="mt-1 text-2xl font-extrabold">{formatPrice(stats._sum.total ?? 0)}</div></div>
        <div className="col-span-2 rounded-card bg-brand p-4 text-white sm:col-span-1"><div className="text-sm text-white/75">Ваш промокод</div><div className="mt-1 text-2xl font-extrabold">WELCOME10</div></div>
      </div>
      <ProfileForms
        user={{ name: user.name, email: user.email, phone: user.phone ?? "", emailVerified: Boolean(user.emailVerified), phoneVerified: Boolean(user.phoneVerified) }}
        smsAvailable={sms && reg.phoneVerification}
      />
    </div>
  );
}
