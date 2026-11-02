import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/sidebar";
import { ListFilters, Pager } from "@/components/admin/list-filters";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Журнал изменений" };
const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = {};
  if (sp.entity) where.entity = sp.entity;
  if (sp.q) where.OR = [{ action: { contains: sp.q, mode: "insensitive" } }, { actorName: { contains: sp.q, mode: "insensitive" } }, { entityId: sp.q }];
  const [rows, total, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["entity"], _count: true }),
  ]);
  return (
    <div>
      <PageHeader title="Журнал изменений" subtitle="Кто и когда изменил настройки, товары, заказы и другие данные" />
      <ListFilters placeholder="Действие, пользователь или ID" selects={[{ name: "entity", label: "Все объекты", options: entities.map((e) => [e.entity, `${e.entity} (${e._count})`]) }]} />
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="table-tm">
            <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Детали</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-ink-500">{formatDate(r.createdAt, true)}</td>
                  <td className="text-sm">{r.actorName}</td>
                  <td className="font-mono text-xs font-semibold">{r.action}</td>
                  <td className="text-xs">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 10)}` : ""}</td>
                  <td className="max-w-[360px]"><code className="line-clamp-2 break-all text-[11px] text-ink-500">{r.details ? JSON.stringify(r.details) : ""}</code></td>
                  <td className="text-xs text-ink-400">{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-10 text-center text-ink-500">Записей нет</div>}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
