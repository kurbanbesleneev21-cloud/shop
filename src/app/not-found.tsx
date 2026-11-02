import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center p-6 text-center">
      <div className="animate-fade-up">
        <div className="text-7xl font-black tracking-tight text-brand">404</div>
        <h1 className="mt-3 text-2xl font-extrabold">Страница не найдена</h1>
        <p className="mt-2 text-ink-500">Возможно, товар снят с продажи или ссылка устарела.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-primary">На главную</Link><Link href="/catalog" className="btn-outline">В каталог</Link></div>
      </div>
    </main>
  );
}
