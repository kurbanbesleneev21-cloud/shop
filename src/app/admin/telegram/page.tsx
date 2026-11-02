import { PageHeader } from "@/components/admin/sidebar";
import { TelegramView } from "@/components/admin/telegram-view";
import { getGroup, secretStatus } from "@/lib/settings";

export const metadata = { title: "Telegram интеграция" };

export default async function TelegramPage() {
  const [cfg, secrets] = await Promise.all([getGroup<{ chatId: string; enabled: boolean; events: Record<string, boolean> }>("telegram"), secretStatus()]);
  return (
    <div>
      <PageHeader title="Telegram интеграция" subtitle="Мгновенные уведомления о заказах, пользователях, отзывах и ошибках" />
      <TelegramView connected={Boolean(secrets.telegram?.botToken)} chatId={cfg.chatId} enabled={cfg.enabled} events={cfg.events ?? {}} />
    </div>
  );
}
