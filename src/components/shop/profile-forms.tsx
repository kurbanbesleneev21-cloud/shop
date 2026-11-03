"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function ProfileForms({ user, smsAvailable }: { user: { name: string; email: string; phone: string; emailVerified: boolean; phoneVerified: boolean }; smsAvailable: boolean }) {
  const { toast, refreshUser } = useApp();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [busy, setBusy] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [devLink, setDevLink] = useState<string>();
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string>();
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      {!user.emailVerified && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4">
          <MailWarning className="text-brand" />
          <div className="flex-1 text-sm"><b>Email не подтверждён.</b> Подтвердите адрес, чтобы защитить аккаунт.</div>
          <button
            className="btn-primary btn-sm"
            disabled={busy === "verify"}
            onClick={() => run("verify", async () => {
              const r = await api<{ verification?: { sent: boolean; devLink?: string; devCode?: string } }>("/api/auth/resend", { method: "POST" });
              setDevLink(r.verification?.devLink);
              setDevCode(r.verification?.devCode);
              setEmailCodeSent(true);
              toast(r.verification?.sent ? "Письмо отправлено" : "Ссылка подтверждения сформирована", "info");
            })}
          >
            Отправить письмо
          </button>
          {emailCodeSent && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input className="input h-10 w-40 text-center font-mono tracking-widest" inputMode="numeric" maxLength={6} value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Код" aria-label="Код из письма" />
              <button className="btn-primary btn-sm" disabled={emailCode.length !== 6 || busy === "code"} onClick={() => run("code", async () => { await api("/api/auth/verify-code", { body: { code: emailCode } }); await refreshUser(); toast("Email подтверждён"); router.refresh(); })}>Подтвердить</button>
              {devCode && <span className="text-sm text-ink-600">Демо-режим (почта не настроена): код <b className="font-mono">{devCode}</b></span>}
            </div>
          )}
          {devLink && <a href={devLink} className="link w-full text-sm">или подтвердите по ссылке →</a>}
        </div>
      )}
      <section className="rounded-card border border-ink-100 p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-bold">Личные данные</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Имя</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className="label">Email {user.emailVerified && <CheckCircle2 size={14} className="inline text-brand" />}</label>
            <input className="input" value={user.email} disabled />
          </div>
          <div>
            <label className="label">Телефон {user.phoneVerified && <CheckCircle2 size={14} className="inline text-brand" />}</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={busy === "profile"} onClick={() => run("profile", async () => { await api("/api/account/profile", { method: "PATCH", body: { name, phone } }); await refreshUser(); router.refresh(); toast("Профиль сохранён"); })}>
          {busy === "profile" && <Loader2 size={16} className="animate-spin" />}Сохранить
        </button>
        {smsAvailable && user.phone && !user.phoneVerified && (
          <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-ink-50 p-3">
            <div className="text-sm">Подтвердите номер телефона по SMS</div>
            {!codeSent ? (
              <button className="btn-outline btn-sm" onClick={() => run("sms", async () => { await api("/api/auth/phone", { body: { action: "send" } }); setCodeSent(true); toast("Код отправлен"); })}>Получить код</button>
            ) : (
              <>
                <input className="input h-9 w-28" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код" inputMode="numeric" />
                <button className="btn-primary btn-sm" onClick={() => run("sms", async () => { await api("/api/auth/phone", { body: { action: "verify", code } }); toast("Телефон подтверждён"); router.refresh(); })}>Подтвердить</button>
              </>
            )}
          </div>
        )}
      </section>
      <section className="rounded-card border border-ink-100 p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-bold">Смена пароля</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Текущий пароль</label><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></div>
          <div><label className="label">Новый пароль</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></div>
        </div>
        <button className="btn-dark mt-4" disabled={busy === "pw" || !pw.current || !pw.next} onClick={() => run("pw", async () => { await api("/api/account/password", { body: pw }); setPw({ current: "", next: "" }); toast("Пароль изменён. Другие устройства вышли из аккаунта."); })}>
          Изменить пароль
        </button>
      </section>
    </div>
  );
}
