import "server-only";
import { getGroup, getSecret } from "./settings";

export type TgEvent = "newOrder" | "newUser" | "newSeller" | "newProduct" | "orderStatus" | "lowStock" | "newReview" | "newTicket" | "systemError";

export async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !data.ok) throw new Error(data.description || `Telegram HTTP ${res.status}`);
  return true;
}

export async function getBotInfo(token: string) {
  const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { username: string; first_name: string }; description?: string };
  if (!data.ok || !data.result) throw new Error(data.description || "Неверный токен");
  return data.result;
}

export function esc(s: unknown) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notify(event: TgEvent, text: string) {
  try {
    const cfg = await getGroup<{ enabled: boolean; chatId: string; events?: Record<string, boolean> }>("telegram");
    if (!cfg.enabled || !cfg.chatId) return;
    if (cfg.events && cfg.events[event] === false) return;
    const token = await getSecret("telegram", "botToken");
    if (!token) return;
    await sendTelegram(token, cfg.chatId, text);
  } catch (e) {
    console.error("telegram notify failed", (e as Error).message);
  }
}

export async function notifyError(message: string) {
  return notify("systemError", `⚠️ <b>Ошибка системы</b>\n${esc(message.slice(0, 3000))}`);
}
