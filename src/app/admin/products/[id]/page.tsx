import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductEditor } from "@/components/admin/product-editor";
import { PageHeader } from "@/components/admin/sidebar";
import { editorRefs, loadEditorProduct } from "@/lib/editor-data";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Редактирование товара" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, refs, s] = await Promise.all([loadEditorProduct(id), editorRefs(true), getSettings()]);
  if (!p) notFound();
  return (
    <div>
      <Link href="/admin/products" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand"><ChevronLeft size={16} />Все товары</Link>
      <PageHeader title={p.title} subtitle={`Артикул ${p.sku}`} />
      <ProductEditor key={p.id} initial={p} {...refs} mode="admin" maxPhotos={Number(s.product.maxPhotos)} maxMb={Number(s.security.maxUploadMb)} />
    </div>
  );
}
