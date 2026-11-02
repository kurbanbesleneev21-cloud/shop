import { ProductEditor, emptyProduct } from "@/components/admin/product-editor";
import { PageHeader } from "@/components/admin/sidebar";
import { editorRefs } from "@/lib/editor-data";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Новый товар" };

export default async function NewProduct() {
  const [refs, s] = await Promise.all([editorRefs(true), getSettings()]);
  return (
    <div>
      <PageHeader title="Новый товар" subtitle="Заполните карточку, загрузите фото и опубликуйте" />
      <ProductEditor initial={emptyProduct} {...refs} mode="admin" maxPhotos={Number(s.product.maxPhotos)} maxMb={Number(s.security.maxUploadMb)} />
    </div>
  );
}
