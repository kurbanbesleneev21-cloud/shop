export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton h-24 w-full rounded-card" />
      <div className="skeleton h-36 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-card" />)}</div>
      <div className="skeleton h-48 w-full rounded-card" />
    </div>
  );
}
