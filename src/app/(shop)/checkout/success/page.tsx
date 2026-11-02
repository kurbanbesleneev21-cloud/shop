import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Заказ оформлен", robots: { index: false } };

export default async function Success({ searchParams }: { searchParams: Promise<{ n?: string; id?: string; paid?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-tm py-16">
      <div className="mx-auto max-w-lg animate-fade-up text-center">
        <CheckCircle2 size={72} className="mx-auto text-brand" strokeWidth={1.5} />
        <h1 className="mt-5 text-3xl font-extrabold">Спасибо за заказ!</h1>
        <p className="mt-3 text-lg">Номер заказа: <b>№{sp.n}</b></p>
        <p className="mt-2 text-ink-500">{sp.paid === "1" ? "Оплата прошла успешно. " : ""}Мы отправили подтверждение на вашу почту и сообщим о каждом изменении статуса.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {sp.id ? <Link href={`/account/orders/${sp.id}`} className="btn-primary btn-lg">Отслеживать заказ</Link> : null}
          <Link href="/catalog" className="btn-outline btn-lg">Продолжить покупки</Link>
        </div>
      </div>
    </div>
  );
}
