import { ProductCardSkeleton } from "@/components/shop/product-card";

export default function Loading() {
  return (
    <div className="container-tm pt-6">
      <div className="skeleton h-4 w-48" />
      <div className="skeleton mt-4 h-9 w-72" />
      <div className="mt-6 flex gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-9 w-32 rounded-full" />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-4 lg:block">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 w-full" />)}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}
