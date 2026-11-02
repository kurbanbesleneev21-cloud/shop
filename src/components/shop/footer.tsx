import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getNavCategories } from "@/lib/data";

export async function Footer() {
  const s = await getSettings();
  const cats = await getNavCategories().catch(() => []);
  const footer = s.footer as { aboutText: string; copyright: string; links: { label: string; href: string }[] };
  const c = s.contacts as Record<string, string>;
  const social = s.social as Record<string, string>;
  const socials = [["vk", "VK"], ["telegram", "Telegram"], ["youtube", "YouTube"], ["dzen", "Дзен"]].filter(([k]) => social[k]);
  return (
    <footer className="mt-16 bg-ink pb-24 text-white md:pb-0">
      <div className="container-tm grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-2xl font-black tracking-tight">{String(s.general.siteName).toUpperCase() === "TECHMARKET" ? <>TECH<span className="text-brand">MARKET</span></> : String(s.general.siteName)}</div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{footer.aboutText}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map(([k, label]) => (
                <a key={k} href={social[k]} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-brand hover:bg-brand hover:text-white">{label}</a>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-white/40">Покупателям</div>
          <ul className="space-y-2.5 text-sm">
            {footer.links.map((l) => (
              <li key={l.href + l.label}><Link href={l.href} className="text-white/75 transition hover:text-brand-300">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-white/40">Каталог</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-1">
            {cats.slice(0, 8).map((cat) => (
              <li key={cat.id}><Link href={`/catalog/${cat.slug}`} className="text-white/75 transition hover:text-brand-300">{cat.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-white/40">Контакты</div>
          <ul className="space-y-3 text-sm text-white/75">
            {c.phone && <li className="flex gap-3"><Phone size={18} className="shrink-0 text-brand-300" /><a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">{c.phone}</a></li>}
            {c.email && <li className="flex gap-3"><Mail size={18} className="shrink-0 text-brand-300" /><a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a></li>}
            {c.address && <li className="flex gap-3"><MapPin size={18} className="shrink-0 text-brand-300" />{c.address}</li>}
            {c.workHours && <li className="flex gap-3"><Clock size={18} className="shrink-0 text-brand-300" />{c.workHours}</li>}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/seller/register" className="btn h-10 border border-white/20 text-sm text-white hover:border-brand hover:bg-brand">Продавать на маркетплейсе</Link>
            <Link href="/admin" className="btn h-10 border border-white/20 text-sm text-white hover:border-brand hover:bg-brand">Вход для администратора</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-tm flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{footer.copyright.replace("©", `© ${new Date().getFullYear()}`)}</span>
          <span>Оплата: карты МИР, Visa, Mastercard · СБП</span>
        </div>
      </div>
    </footer>
  );
}
