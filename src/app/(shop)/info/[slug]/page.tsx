import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RichText } from "@/components/shop/rich-text";
import { getFooterPages } from "@/lib/data";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.page.findUnique({ where: { slug } });
  return p ? { title: p.seoTitle || p.title, description: p.seoDescription || undefined } : { title: "Страница не найдена" };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, pages] = await Promise.all([prisma.page.findUnique({ where: { slug } }), getFooterPages()]);
  if (!p || !p.published) notFound();
  return (
    <div className="container-tm grid gap-8 pt-6 lg:grid-cols-[240px_1fr]">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:px-0">
        {pages.map((x) => <Link key={x.slug} href={`/info/${x.slug}`} className={cn("shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium", x.slug === slug ? "bg-brand text-white" : "bg-ink-50 hover:text-brand lg:bg-transparent")}>{x.title}</Link>)}
        <Link href="/support" className="shrink-0 rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm font-medium hover:text-brand lg:bg-transparent">Поддержка</Link>
      </nav>
      <article className="max-w-3xl animate-fade-up">
        <h1 className="text-3xl font-extrabold">{p.title}</h1>
        <div className="mt-4"><RichText content={p.content} /></div>
      </article>
    </div>
  );
}
