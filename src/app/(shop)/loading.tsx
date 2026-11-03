import { ProductCardSkeleton } from "@/components/shop/product-card";

// Shown instantly on navigation while the server renders the page
export default function Loading() {
  return (
    <div className="container-tm pt-4 sm:pt-6" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton h-[190px] w-full rounded-card sm:h-[360px]" />
      <div className="mt-3 flex gap-2 overflow-hidden">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 w-28 shrink-0 rounded-full" />)}</div>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
    </div>
  );
}
