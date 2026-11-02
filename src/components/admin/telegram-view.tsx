"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plug, Send, Wifi, Search, Bot } from "lucide-react";
import { useApp } from "../providers";
import { F, Toggle, Card } from "./product-editor";
import { TELEGRAM_EVENTS } from "@/lib/settings-schema";
import { api } from "@/lib/client-api";

export function TelegramView({ connected, chatId: initialChat, enabled: initialEnabled, events: initialEvents }: { connected: boolean; chatId: string; enabled: boolean; events: Record<string, boolean> }) {
  const { toast } = useApp();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState(initialChat);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [events, setEvents] = useState(initialEvents);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState("");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const r = await api<{ bot?: string; name?: string; chats?: { id: string; name: string }[] }>("/api/admin/telegram", { body: { action, ...extra } });
      if (action === "connect") { toast(`Бот @${r.bot} подключён`); setToken(""); setStatus(`Подключён бот @${r.bot}`); }
      if (action === "check") setStatus(`Соединение установлено: @${r.bot} (${r.name})`);
      if (action === "test") toast("Тестовое сообщение отправлено");
      if (action === "save") toast("Настройки уведомлений сохранены");
      if (action === "detect-chat") { setChats(r.chats ?? []); if (!r.chats?.length) toast("Напишите боту любое сообщение (или добавьте его в группу) и повторите", "info"); }
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
      if (action === "check") setStatus(null);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Подключение бота" subtitle="Создайте бота у @BotFather, скопируйте токен и вставьте его ниже. Токен хранится зашифрованным на сервере и никогда не передаётся в браузер.">
        <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm">
          {connected ? <CheckCircle2 size={18} className="text-brand" /> : <Bot size={18} className="text-ink-400" />}
          {status ?? (connected ? "Токен бота сохранён" : "Бот не подключён")}
        </div>
        <F label="Telegram Bot Token"><input type="password" autoComplete="off" className="input font-mono" placeholder={connected ? "•••••••••• (введите новый, чтобы заменить)" : "123456789:AA..."} value={token} onChange={(e) => setToken(e.target.value)} /></F>
        <F label="Chat ID" hint="ID чата, группы или канала">
          <div className="flex gap-2">
            <input className="input font-mono" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" />
            <button className="btn-outline shrink-0" disabled={!!busy || (!connected && !token)} onClick={() => run("detect-chat", { token: token || undefined })} title="Найти чаты, которые писали боту"><Search size={16} /></button>
          </div>
        </F>
        {chats.length > 0 && <div className="flex flex-wrap gap-2">{chats.map((c) => <button key={c.id} onClick={() => setChatId(c.id)} className="chip h-8 text-xs">{c.name} · {c.id}</button>)}</div>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!token || !!busy} onClick={() => run("connect", { token, chatId })}>{busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}Подключить</button>
          <button className="btn-outline" disabled={!!busy || (!connected && !token)} onClick={() => run("check", { token: token || undefined })}>{busy === "check" ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}Проверить соединение</button>
        </div>
        <div className="border-t border-ink-100 pt-3">
          <F label="Тестовое сообщение"><textarea className="textarea min-h-[70px]" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="✅ TECHMARKET: тестовое сообщение" /></F>
          <button className="btn-dark mt-2" disabled={!!busy || !connected || !chatId} onClick={() => run("test", { chatId, message: msg })}>{busy === "test" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Отправить тестовое сообщение</button>
        </div>
      </Card>
      <Card title="Уведомления" subtitle="Выберите события, о которых бот будет сообщать">
        <div className="rounded-xl border-2 border-brand-100 px-3 py-1"><Toggle label="Уведомления включены" value={enabled} onChange={setEnabled} /></div>
        <div className="divide-y divide-ink-100">
          {TELEGRAM_EVENTS.map((e) => <Toggle key={e.key} label={e.label} value={events[e.key] !== false} onChange={(v) => setEvents({ ...events, [e.key]: v })} />)}
        </div>
        <button className="btn-primary" disabled={!!busy} onClick={() => run("save", { chatId, enabled, events })}>{busy === "save" && <Loader2 size={16} className="animate-spin" />}Сохранить настройки</button>
      </Card>
    </div>
  );
}
