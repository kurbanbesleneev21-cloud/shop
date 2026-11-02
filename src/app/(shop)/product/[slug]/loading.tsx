export default function Loading() {
  return (
    <div className="container-tm pt-6">
      <div className="skeleton h-4 w-64" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr_340px]">
        <div className="skeleton aspect-square w-full" />
        <div className="space-y-3"><div className="skeleton h-5 w-24" /><div className="skeleton h-9 w-full" /><div className="skeleton h-9 w-2/3" /><div className="skeleton h-40 w-full" /></div>
        <div className="skeleton h-72 w-full" />
      </div>
    </div>
  );
}
