import { SupportForm } from "@/components/shop/support-form";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Поддержка" };

export default async function SupportPage() {
  const s = await getSettings();
  const c = s.contacts as Record<string, string>;
  return (
    <div className="container-tm max-w-3xl pt-6">
      <h1 className="text-3xl font-extrabold">Поддержка</h1>
      <p className="mt-2 text-ink-500">Телефон: {c.phone} · {c.email} · {c.workHours}</p>
      <div className="mt-6"><SupportForm /></div>
    </div>
  );
}
