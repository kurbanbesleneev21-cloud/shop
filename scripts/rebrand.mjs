// One-time, idempotent rebrand of stored data: TECHMARKET -> VITRINA in saved settings and info pages.
// Secrets and emails are not touched (only the upper-case brand word is replaced).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELIVERY_PAGE = "## Способы получения\n- **Пункт выдачи Ozon** — 2–5 дней, 199 ₽, бесплатно от 3 000 ₽. Выберите удобный пункт на карте Ozon и укажите его адрес при оформлении. Когда заказ придёт, Ozon пришлёт SMS с кодом получения.\n- **Почта России** — 5–14 дней, 399 ₽. Доставим в любое отделение по индексу, в любой населённый пункт.\n\nПосле отправки мы пришлём трек-номер — отслеживайте посылку в личном кабинете.";
const swap = (v) => {
  if (typeof v === "string") return v.replaceAll("TECHMARKET", "VITRINA").replaceAll("маркетплейс электроники и бытовой техники", "маркетплейс электроники, одежды и товаров для дома");
  if (Array.isArray(v)) return v.map(swap);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "secrets" ? x : swap(x)]));
  return v;
};

try {
  let n = 0;
  for (const s of await prisma.setting.findMany()) {
    if (s.key === "secrets") continue;
    const next = swap(s.value);
    if (JSON.stringify(next) !== JSON.stringify(s.value)) {
      await prisma.setting.update({ where: { key: s.key }, data: { value: next } });
      n++;
    }
  }
  for (const p of await prisma.page.findMany({ select: { id: true, title: true, content: true, seoTitle: true, seoDescription: true } })) {
    const data = { title: swap(p.title), content: swap(p.content), seoTitle: p.seoTitle ? swap(p.seoTitle) : null, seoDescription: p.seoDescription ? swap(p.seoDescription) : null };
    if (JSON.stringify(data) !== JSON.stringify({ title: p.title, content: p.content, seoTitle: p.seoTitle, seoDescription: p.seoDescription })) {
      await prisma.page.update({ where: { id: p.id }, data });
      n++;
    }
  }
  // Delivery switched to Ozon pickup points and Russian Post: replace the old seeded "Доставка" page and texts
  const deliveryPage = await prisma.page.findUnique({ where: { slug: "delivery" } });
  if (deliveryPage && deliveryPage.content.includes("**Курьером**")) {
    await prisma.page.update({ where: { slug: "delivery" }, data: { content: DELIVERY_PAGE, seoDescription: DELIVERY_PAGE.slice(0, 150).replace(/[#*\n]/g, " ") } });
    n++;
  }
  const product = await prisma.setting.findUnique({ where: { key: "product" } });
  if (product && typeof product.value === "object" && product.value && product.value.deliveryText === "Доставим завтра — бесплатно от 3 000 ₽") {
    await prisma.setting.update({ where: { key: "product" }, data: { value: { ...product.value, deliveryText: "В пункт выдачи Ozon или Почтой России по всей стране" } } });
    n++;
  }
  console.log(`Rebrand: ${n} record(s) updated`);
} catch (e) {
  console.warn("Rebrand skipped:", e.message);
} finally {
  await prisma.$disconnect();
}
