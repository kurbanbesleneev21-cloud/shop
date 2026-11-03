import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { getBotInfo, sendTelegram } from "@/lib/telegram";
import { getGroup, getSecret, saveGroup, saveSecrets } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { TELEGRAM_EVENTS } from "@/lib/settings-schema";

export const POST = route({ auth: "admin" }, async (req, { user, ip }) => {
  const data = await body(req, z.object({
    action: z.enum(["connect", "check", "test", "save", "detect-chat"]),
    token: z.string().trim().max(200).optional(),
    chatId: z.string().trim().max(60).optional(),
    enabled: z.boolean().optional(),
    events: z.record(z.string(), z.boolean()).optional(),
    message: z.string().max(1000).optional(),
  }));
  const cfg = await getGroup<{ chatId: string; enabled: boolean }>("telegram");
  const token = data.token || (await getSecret("telegram", "botToken"));

  if (data.action === "connect") {
    if (!data.token) throw new ApiError(400, "Введите Bot Token");
    let bot;
    try { bot = await getBotInfo(data.token); } catch (e) { throw new ApiError(400, "Токен не принят Telegram: " + (e as Error).message); }
    await saveSecrets("telegram", { botToken: data.token });
    await saveGroup("telegram", { chatId: data.chatId ?? cfg.chatId, enabled: true });
    await audit(user, "telegram.connect", "settings", "telegram", { bot: bot.username }, ip);
    return ok({ ok: true, bot: bot.username });
  }
  if (!token) throw new ApiError(400, "Бот не подключён — введите Bot Token");
  if (data.action === "check") {
    try {
      const bot = await getBotInfo(token);
      return ok({ ok: true, bot: bot.username, name: bot.first_name });
    } catch (e) { throw new ApiError(400, "Нет соединения: " + (e as Error).message); }
  }
  if (data.action === "detect-chat") {
    const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getUpdates?limit=20`, { signal: AbortSignal.timeout(8000) });
    const j = (await r.json().catch(() => ({}))) as { result?: { message?: { chat: { id: number; title?: string; first_name?: string } }; my_chat_member?: { chat: { id: number; title?: string } } }[] };
    const chats = new Map<string, string>();
    for (const u of j.result ?? []) {
      const c = u.message?.chat ?? u.my_chat_member?.chat;
      if (c) chats.set(String(c.id), ("title" in c && c.title) || ("first_name" in c && (c as { first_name?: string }).first_name) || String(c.id));
    }
    return ok({ chats: [...chats].map(([id, name]) => ({ id, name })) });
  }
  if (data.action === "test") {
    const chat = data.chatId || cfg.chatId;
    if (!chat) throw new ApiError(400, "Укажите Chat ID");
    try {
      await sendTelegram(token, chat, data.message?.trim() || "✅ <b>VITRINA</b>\nТестовое сообщение: уведомления настроены правильно.");
    } catch (e) { throw new ApiError(400, "Telegram: " + (e as Error).message); }
    return ok({ ok: true });
  }
  // save
  const events = data.events ? Object.fromEntries(TELEGRAM_EVENTS.map((e) => [e.key, Boolean(data.events![e.key])])) : undefined;
  await saveGroup("telegram", { ...(data.chatId !== undefined ? { chatId: data.chatId } : {}), ...(data.enabled !== undefined ? { enabled: data.enabled } : {}), ...(events ? { events } : {}) });
  await audit(user, "telegram.save", "settings", "telegram", { chatId: data.chatId, enabled: data.enabled, events }, ip);
  return ok({ ok: true });
});
