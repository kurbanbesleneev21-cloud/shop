import { PageHeader } from "@/components/admin/sidebar";
import { AiView } from "@/components/admin/ai-view";
import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/ai";
import { getGroup } from "@/lib/settings";
import type { AiOutput } from "@/lib/ai";

export const metadata = { title: "AI Генератор товаров" };

export default async function AiPage() {
  const [configured, cfg, cats, brands, drafts] = await Promise.all([
    aiConfigured(),
    getGroup<{ provider: string; model: string }>("ai"),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, specTemplate: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.aiDraft.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <div>
      <PageHeader title="AI Генератор товаров" subtitle="Нейросеть пишет описание, преимущества, SEO и подбирает категорию. Цены и характеристики не выдумываются." />
      <AiView
        configured={configured}
        provider={`${cfg.provider} · ${cfg.model}`}
        categories={cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, template: (Array.isArray(c.specTemplate) ? c.specTemplate : []) as { key: string; label: string }[] }))}
        brands={brands}
        drafts={drafts.map((d) => ({ id: d.id, input: d.input as Record<string, string>, output: d.output as unknown as AiOutput, status: d.status, productId: d.productId, createdAt: d.createdAt.toISOString() }))}
      />
    </div>
  );
}
