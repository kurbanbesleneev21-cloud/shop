import { ProductEditor, emptyProduct } from "@/components/admin/product-editor";
import { editorRefs } from "@/lib/editor-data";
import { getSettings } from "@/lib/settings";

export default async function SellerNewProduct() {
  const [refs, s] = await Promise.all([editorRefs(false), getSettings()]);
  return <ProductEditor initial={emptyProduct} categories={refs.categories} brands={refs.brands} sellers={null} mode="seller" maxPhotos={Number(s.product.maxPhotos)} maxMb={Number(s.security.maxUploadMb)} />;
}
