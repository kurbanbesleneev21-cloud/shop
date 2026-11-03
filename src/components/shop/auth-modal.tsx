"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, ShieldCheck, Truck, X, BadgePercent } from "lucide-react";
import { useApp, type AuthMode } from "../providers";
import { api } from "@/lib/client-api";
import { Logo } from "./logo";

type Field = "name" | "email" | "phone" | "password" | "passwordConfirm" | "agree";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-zА-Яа-я0-9]/.test(p)) s++;
  return Math.min(4, s);
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  if (!d) return "";
  const p = d.startsWith("7") ? d : "7" + d;
  let out = "+7";
  if (p.length > 1) out += " (" + p.slice(1, 4);
  if (p.length >= 4) out += ")";
  if (p.length > 4) out += " " + p.slice(4, 7);
  if (p.length > 7) out += "-" + p.slice(7, 9);
  if (p.length > 9) out += "-" + p.slice(9, 11);
  return out;
}

export function AuthModal({ mode, setMode, next, onClose }: { mode: AuthMode; setMode: (m: AuthMode) => void; next?: string; onClose: () => void }) {
  const { config, setUser, toast } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", passwordConfirm: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr, setCodeErr] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sms, setSms] = useState({ code: "", sentTo: "", devCode: "", busy: false, cooldown: 0, error: "" });
  const smsRequired = config.registration.phoneVerification;
  useEffect(() => {
    if (sms.cooldown <= 0) return;
    const t = setTimeout(() => setSms((x) => ({ ...x, cooldown: x.cooldown - 1 })), 1000);
    return () => clearTimeout(t);
  }, [sms.cooldown]);
  async function requestSms() {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 11) return setErrors((e) => ({ ...e, phone: "Введите номер полностью" }));
    setSms((x) => ({ ...x, busy: true, error: "" }));
    try {
      const r = await api<{ sent: boolean; devCode?: string }>("/api/auth/phone-code", { body: { phone: form.phone.replace(/[^\d+]/g, "") } });
      setSms((x) => ({ ...x, busy: false, sentTo: form.phone, devCode: r.devCode ?? "", cooldown: 60 }));
    } catch (e) {
      setSms((x) => ({ ...x, busy: false, error: (e as Error).message }));
    }
  }
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState<null | { kind: "registered" | "forgot" | "verified"; devLink?: string; devCode?: string; sent?: boolean; next?: string }>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    setErrors({});
    setDone(null);
  }, [mode]);

  const set = (k: Field, v: string) => {
    setForm((f) => ({ ...f, [k]: k === "phone" ? formatPhone(v) : v }));
    setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
  };

  function validate(): boolean {
    const e: typeof errors = {};
    if (mode === "register") {
      if (form.name.trim().length < 2) e.name = "Введите имя";
      else if (!/^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s'.-]{1,79}$/.test(form.name.trim())) e.name = "Только буквы, пробел и дефис";
      if (form.password && form.passwordConfirm !== form.password) e.passwordConfirm = "Пароли не совпадают";
      if (!agree) e.agree = "Нужно согласие на обработку персональных данных";
      if (smsRequired && (!sms.sentTo || sms.sentTo !== form.phone)) e.phone = "Подтвердите номер: нажмите «Получить код»";
      else if (smsRequired && !/^\d{6}$/.test(sms.code)) e.phone = "Введите 6-значный код из SMS";
      if (config.registration.requirePhone && form.phone.replace(/\D/g, "").length < 11) e.phone = "Введите номер полностью";
      if (form.password.length < config.passwordMinLength) e.password = `Минимум ${config.passwordMinLength} символов`;
      else if (!/\d/.test(form.password) || !/[A-Za-zА-Яа-я]/.test(form.password)) e.password = "Пароль должен содержать буквы и цифры";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Введите корректный email";
    if (mode === "login" && !form.password) e.password = "Введите пароль";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "register") {
        const r = await api<{ user: never; phoneVerified?: boolean; verification: { sent: boolean; devLink?: string; devCode?: string }; next?: string }>("/api/auth/register", {
          body: { ...form, phone: form.phone.replace(/[^\d+]/g, ""), agree, marketing, accountType, smsCode: sms.code },
        });
        const me = await api<{ user: never }>("/api/auth/me");
        setUser(me.user);
        setCooldown(60);
        if (r.phoneVerified) {
          // Phone confirmed by SMS — registration is complete; email can be confirmed later in the profile
          toast("Регистрация завершена. Номер телефона подтверждён!");
          router.refresh();
          if (r.next) { onClose(); router.push(r.next); } else setDone({ kind: "verified" });
          return;
        }
        setDone({ kind: "registered", devLink: r.verification.devLink, devCode: r.verification.devCode, sent: r.verification.sent, next: r.next });
        router.refresh();
      } else if (mode === "login") {
        await api("/api/auth/login", { body: { email: form.email, password: form.password } });
        const me = await api<{ user: never }>("/api/auth/me");
        setUser(me.user);
        toast("С возвращением!", "success");
        onClose();
        // Full navigation so protected areas (e.g. /admin) are re-checked with the new session cookie
        if (next && next.startsWith("/") && !next.startsWith("//")) window.location.assign(next);
        else router.refresh();
      } else {
        const r = await api<{ devLink?: string }>("/api/auth/forgot", { body: { email: form.email } });
        setDone({ kind: "forgot", devLink: r.devLink });
      }
    } catch (e) {
      const err = e as Error & { data?: { fields?: Record<string, string[]> } };
      const fields = err.data?.fields;
      if (fields) {
        const fe: typeof errors = {};
        for (const [k, v] of Object.entries(fields)) fe[k as Field] = v?.[0];
        setErrors({ ...fe, form: err.message });
      } else setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  const s = strength(form.password);

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Вход и регистрация"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative grid max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:max-w-[860px] sm:rounded-3xl md:grid-cols-[1fr_1.1fr]"
      >
        <div className="relative hidden overflow-hidden bg-ink p-8 text-white md:flex md:flex-col">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/40 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
          <Logo dark />
          <h2 className="relative mt-10 text-3xl font-extrabold leading-tight">Техника, которой доверяют</h2>
          <p className="relative mt-3 text-white/70">Создайте аккаунт, чтобы отслеживать заказы, сохранять избранное и получать персональные скидки.</p>
          <ul className="relative mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Truck size={18} /></span>Доставка от 1 дня по всей России</li>
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><ShieldCheck size={18} /></span>Только оригинальная техника с гарантией</li>
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><BadgePercent size={18} /></span>Промокод WELCOME10 на первый заказ</li>
          </ul>
        </div>

        <div className="p-5 pb-8 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="md:hidden"><Logo /></div>
            <button onClick={onClose} className="ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-ink-100" aria-label="Закрыть">
              <X size={20} />
            </button>
          </div>

          {done?.kind === "registered" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-2 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand"><Mail size={28} /></div>
              <h3 className="mt-4 text-xl font-bold">Подтвердите email</h3>
              <p className="mt-2 text-ink-500">{done.sent ? <>Мы отправили 6-значный код на <b className="text-ink">{form.email}</b></> : "Введите код подтверждения, чтобы завершить регистрацию."}</p>
              {done.devCode && (
                <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-sm">
                  <div className="font-semibold text-brand">Почтовый сервис ещё не подключён</div>
                  <div className="mt-1 text-ink-600">Демо-режим: ваш код <b className="font-mono text-base tracking-widest text-ink">{done.devCode}</b>. Подключите SMTP в админке, и код будет приходить на почту.</div>
                </div>
              )}
              <form
                className="mt-5 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCodeErr("");
                  setCodeBusy(true);
                  try {
                    await api("/api/auth/verify-code", { body: { code } });
                    const me = await api<{ user: never }>("/api/auth/me");
                    setUser(me.user);
                    toast("Email подтверждён. Добро пожаловать!");
                    router.refresh();
                    if (done.next) { onClose(); router.push(done.next); }
                    else setDone({ kind: "verified" });
                  } catch (er) {
                    setCodeErr((er as Error).message);
                  } finally {
                    setCodeBusy(false);
                  }
                }}
              >
                <input className="input h-14 text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" aria-label="Код из письма" autoFocus />
                {codeErr && <p className="text-sm font-medium">{codeErr}</p>}
                <button className="btn-primary btn-lg w-full" disabled={code.length !== 6 || codeBusy}>{codeBusy && <Loader2 size={18} className="animate-spin" />}Подтвердить</button>
              </form>
              <button
                className="mt-3 text-sm font-semibold text-brand disabled:text-ink-400"
                disabled={cooldown > 0}
                onClick={async () => {
                  try {
                    const r = await api<{ verification?: { devCode?: string; sent: boolean } }>("/api/auth/resend", { method: "POST" });
                    setDone((d) => (d ? { ...d, devCode: r.verification?.devCode ?? d.devCode } : d));
                    setCooldown(60);
                    toast("Новый код отправлен", "info");
                  } catch (er) {
                    setCodeErr((er as Error).message);
                  }
                }}
              >
                {cooldown > 0 ? `Отправить код повторно через ${cooldown} с` : "Отправить код повторно"}
              </button>
              <button className="mt-2 block w-full text-sm text-ink-500 hover:text-ink" onClick={() => { onClose(); if (done.next) router.push(done.next); }}>Подтвердить позже</button>
            </motion.div>
          ) : done?.kind === "verified" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><ShieldCheck size={28} /></div>
              <h3 className="mt-4 text-xl font-bold">Регистрация завершена</h3>
              <p className="mt-2 text-ink-500">Email подтверждён. Промокод WELCOME10 даёт 10% на первый заказ.</p>
              <button className="btn-primary mt-6 w-full" onClick={onClose}>Перейти к покупкам</button>
            </motion.div>
          ) : done ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand"><Mail size={28} /></div>
              <h3 className="mt-4 text-xl font-bold">{(done.kind as string) === "registered" ? "Аккаунт создан!" : "Проверьте почту"}</h3>
              <p className="mt-2 text-ink-500">
                {(done.kind as string) === "registered"
                  ? done.sent
                    ? `Мы отправили письмо для подтверждения на ${form.email}.`
                    : "Подтвердите адрес электронной почты, чтобы защитить аккаунт."
                  : "Если аккаунт с таким email существует, мы отправили ссылку для восстановления пароля."}
              </p>
              {done.devLink && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-sm">
                  <div className="font-semibold text-brand">Почтовый сервис ещё не подключён</div>
                  <div className="mt-1 text-ink-600">Демо-режим: перейдите по ссылке, чтобы {(done.kind as string) === "registered" ? "подтвердить email" : "задать новый пароль"}.</div>
                  <a href={done.devLink} className="link mt-2 block break-all font-medium">{(done.kind as string) === "registered" ? "Подтвердить email →" : "Сбросить пароль →"}</a>
                </div>
              )}
              <button className="btn-primary mt-6 w-full" onClick={onClose}>Продолжить покупки</button>
            </motion.div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="relative mb-6 grid grid-cols-2 rounded-xl bg-ink-100 p-1">
                  <motion.div layout transition={{ type: "spring", damping: 30, stiffness: 400 }} className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-card" style={{ left: mode === "register" ? 4 : "calc(50%)" }} />
                  <button onClick={() => setMode("register")} className={`relative z-10 h-10 text-sm font-semibold transition ${mode === "register" ? "text-ink" : "text-ink-500"}`}>Регистрация</button>
                  <button onClick={() => setMode("login")} className={`relative z-10 h-10 text-sm font-semibold transition ${mode === "login" ? "text-ink" : "text-ink-500"}`}>Вход</button>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.form key={mode} onSubmit={submit} noValidate initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3.5">
                  <h3 className="text-2xl font-extrabold">{mode === "register" ? "Добро пожаловать в " + config.siteName : mode === "login" ? "Вход в аккаунт" : "Восстановление пароля"}</h3>
                  {mode === "login" && next?.startsWith("/admin") && <p className="rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand">Войдите с аккаунтом администратора, чтобы открыть админ-панель.</p>}
                  {mode === "forgot" && <p className="text-sm text-ink-500">Укажите email, и мы пришлём ссылку для смены пароля.</p>}
                  {mode === "register" && !config.registration.enabled && <p className="rounded-xl bg-ink-100 p-3 text-sm">Регистрация временно закрыта.</p>}
                  {mode === "register" && (
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тип аккаунта">
                      {([["buyer", "Покупатель"], ["seller", "Продавец"]] as const).map(([k, l]) => (
                        <button key={k} type="button" role="radio" aria-checked={accountType === k} onClick={() => setAccountType(k)} className={`h-10 rounded-xl border-2 text-sm font-semibold transition ${accountType === k ? "border-brand bg-brand-50 text-brand" : "border-ink-100 text-ink-600"}`}>{l}</button>
                      ))}
                    </div>
                  )}
                  {mode === "register" && accountType === "seller" && <p className="-mt-1 text-xs text-ink-500">После подтверждения email откроется заявка на подключение магазина.</p>}
                  {mode === "register" && (
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                  )}
                  {mode === "register" && (
                    <Input label="Имя" value={form.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" placeholder="Иван" />
                  )}
                  <Input label="Электронная почта" type="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" placeholder="you@mail.ru" inputMode="email" />
                  {mode === "register" && (
                    <div>
                      <label className="label">{"Номер телефона" + (config.registration.requirePhone || smsRequired ? "" : " (необязательно)")}</label>
                      <div className="flex gap-2">
                        <input className={`input ${errors.phone ? "border-ink ring-4 ring-ink/10" : ""}`} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+7 (900) 000-00-00" inputMode="tel" />
                        {smsRequired && (
                          <button type="button" onClick={requestSms} disabled={sms.busy || sms.cooldown > 0} className="btn-soft shrink-0 px-3 text-sm">
                            {sms.busy ? <Loader2 size={16} className="animate-spin" /> : sms.cooldown > 0 ? `${sms.cooldown} с` : sms.sentTo ? "Ещё раз" : "Получить код"}
                          </button>
                        )}
                      </div>
                      {errors.phone && <p className="mt-1 text-xs font-medium text-ink">{errors.phone}</p>}
                      {sms.error && <p className="mt-1 text-xs font-medium text-ink">{sms.error}</p>}
                      {smsRequired && sms.sentTo && sms.sentTo === form.phone && (
                        <div className="mt-2 space-y-1.5">
                          <input className="input text-center font-mono text-lg tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={sms.code} onChange={(e) => { setSms((x) => ({ ...x, code: e.target.value.replace(/\D/g, "").slice(0, 6) })); setErrors((er) => ({ ...er, phone: undefined })); }} placeholder="Код из SMS" aria-label="Код из SMS" />
                          <p className="text-xs text-ink-500">{sms.devCode ? <>SMS-провайдер ещё не подключён. Демо-режим: код <b className="font-mono text-ink">{sms.devCode}</b></> : `Мы отправили SMS с кодом на ${sms.sentTo}`}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {mode !== "forgot" && (
                    <div>
                      <label className="label">Пароль</label>
                      <div className="relative">
                        <input
                          className={`input pr-11 ${errors.password ? "border-ink ring-4 ring-ink/10" : ""}`}
                          type={showPass ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          autoComplete={mode === "register" ? "new-password" : "current-password"}
                          placeholder={mode === "register" ? "Минимум 8 символов" : "Ваш пароль"}
                        />
                        <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}>
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {mode === "register" && form.password && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: i < s ? "100%" : "0%" }} />
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-ink-500">{["Слабый", "Слабый", "Средний", "Хороший", "Надёжный"][s]}</span>
                        </div>
                      )}
                      {errors.password && <p className="mt-1 text-xs font-medium text-ink">{errors.password}</p>}
                    </div>
                  )}
                  {mode === "register" && (
                    <Input label="Повторите пароль" type={showPass ? "text" : "password"} value={form.passwordConfirm} onChange={(v) => set("passwordConfirm", v)} error={errors.passwordConfirm} autoComplete="new-password" placeholder="Ещё раз пароль" />
                  )}
                  {mode === "register" && (
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[rgb(var(--brand))]" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((x) => ({ ...x, agree: undefined })); }} />
                        <span>Я принимаю <a href="/info/privacy" target="_blank" className="link">политику конфиденциальности</a> и даю согласие на обработку персональных данных</span>
                      </label>
                      {errors.agree && <p className="text-xs font-medium">{errors.agree}</p>}
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-600">
                        <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[rgb(var(--brand))]" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                        <span>Хочу получать скидки и новости (необязательно)</span>
                      </label>
                    </div>
                  )}
                  {mode === "login" && (
                    <button type="button" onClick={() => setMode("forgot")} className="link text-sm">Забыли пароль?</button>
                  )}
                  {errors.form && <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm font-medium">{errors.form}</div>}
                  <button className="btn-primary btn-lg w-full" disabled={loading || (mode === "register" && !config.registration.enabled)}>
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {mode === "register" ? "Зарегистрироваться" : mode === "login" ? "Войти" : "Отправить ссылку"}
                  </button>
                  {mode === "forgot" && (
                    <button type="button" onClick={() => setMode("login")} className="btn-ghost w-full">Вернуться ко входу</button>
                  )}
                  <button type="button" onClick={onClose} className="w-full py-1 text-center text-sm font-medium text-ink-500 hover:text-brand">
                    Продолжить без регистрации
                  </button>
                </motion.form>
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; error?: string; type?: string; autoComplete?: string; placeholder?: string; inputMode?: "email" | "tel" | "text" }) {
  return (
    <div>
      <label className="label">{props.label}</label>
      <input
        className={`input ${props.error ? "border-ink ring-4 ring-ink/10" : ""}`}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
      />
      {props.error && <p className="mt-1 text-xs font-medium text-ink">{props.error}</p>}
    </div>
  );
}
