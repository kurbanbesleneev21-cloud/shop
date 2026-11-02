import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getGroup } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const maxDuration = 60;

export const GET = route({ auth: "admin" }, async (_req, { user, ip }) => {
  const cfg = await getGroup<{ includeUsers: boolean; includeOrders: boolean }>("backup");
  const [settings, categories, brands, products, images, sellers, banners, pages, promos, reviews] = await Promise.all([
    prisma.setting.findMany({ where: { NOT: { key: "secrets" } } }), prisma.category.findMany(), prisma.brand.findMany(), prisma.product.findMany(), prisma.productImage.findMany(),
    prisma.seller.findMany(), prisma.banner.findMany(), prisma.page.findMany(), prisma.promoCode.findMany(), prisma.review.findMany(),
  ]);
  const users = cfg.includeUsers ? await prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true, blocked: true, createdAt: true } }) : undefined;
  const orders = cfg.includeOrders ? await prisma.order.findMany({ include: { items: true, events: true } }) : undefined;
  await audit(user, "backup.export", "backup", null, { includeUsers: cfg.includeUsers, includeOrders: cfg.includeOrders }, ip);
  const data = { version: 1, createdAt: new Date().toISOString(), settings, categories, brands, products, images, sellers, banners, pages, promos, reviews, users, orders };
  return new Response(JSON.stringify(data, null, 1), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="techmarket-backup-${new Date().toISOString().slice(0, 10)}.json"` } });
});
