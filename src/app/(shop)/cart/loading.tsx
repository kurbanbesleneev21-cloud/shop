export default function Loading() {
  return (
    <div className="container-tm pt-4 sm:pt-6" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton h-9 w-56" />
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 w-full rounded-card" />)}</div>
        <div className="skeleton h-64 w-full rounded-card" />
      </div>
    </div>
  );
}
