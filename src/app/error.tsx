"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">Что-то пошло не так</h1>
        <p className="mt-2 text-ink-500">Мы уже знаем об ошибке. Попробуйте обновить страницу.</p>
        <button onClick={reset} className="btn-primary mt-6">Повторить</button>
      </div>
    </main>
  );
}
