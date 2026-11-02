import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProductEditor } from "@/components/admin/product-editor";
import { editorRefs, loadEditorProduct } from "@/lib/editor-data";
import { getSettings } from "@/lib/settings";

export default async function SellerEditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const [p, refs, s] = await Promise.all([loadEditorProduct(id), editorRefs(false), getSettings()]);
  if (!p || p.sellerOwner !== user.seller!.id) notFound();
  return <ProductEditor key={p.id} initial={p} categories={refs.categories} brands={refs.brands} sellers={null} mode="seller" maxPhotos={Number(s.product.maxPhotos)} maxMb={Number(s.security.maxUploadMb)} />;
}
