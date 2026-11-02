"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, ShieldCheck, Truck, X, BadgePercent } from "lucide-react";
import { useApp, type AuthMode } from "../providers";
import { api } from "@/lib/client-api";
import { Logo } from "./logo";

type Field = "name" | "email" | "phone" | "password";

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
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState<null | { kind: "registered" | "forgot"; devLink?: string; sent?: boolean }>(null);

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
        const r = await api<{ user: never; verification: { sent: boolean; devLink?: string } }>("/api/auth/register", {
          body: { ...form, phone: form.phone.replace(/[^\d+]/g, "") },
        });
        const me = await api<{ user: never }>("/api/auth/me");
        setUser(me.user);
        setDone({ kind: "registered", devLink: r.verification.devLink, sent: r.verification.sent });
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

          {done ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand"><Mail size={28} /></div>
              <h3 className="mt-4 text-xl font-bold">{done.kind === "registered" ? "Аккаунт создан!" : "Проверьте почту"}</h3>
              <p className="mt-2 text-ink-500">
                {done.kind === "registered"
                  ? done.sent
                    ? `Мы отправили письмо для подтверждения на ${form.email}.`
                    : "Подтвердите адрес электронной почты, чтобы защитить аккаунт."
                  : "Если аккаунт с таким email существует, мы отправили ссылку для восстановления пароля."}
              </p>
              {done.devLink && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-sm">
                  <div className="font-semibold text-brand">Почтовый сервис ещё не подключён</div>
                  <div className="mt-1 text-ink-600">Демо-режим: перейдите по ссылке, чтобы {done.kind === "registered" ? "подтвердить email" : "задать новый пароль"}.</div>
                  <a href={done.devLink} className="link mt-2 block break-all font-medium">{done.kind === "registered" ? "Подтвердить email →" : "Сбросить пароль →"}</a>
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
                    <Input label="Имя" value={form.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" placeholder="Иван" />
                  )}
                  <Input label="Электронная почта" type="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" placeholder="you@mail.ru" inputMode="email" />
                  {mode === "register" && (
                    <Input label={"Номер телефона" + (config.registration.requirePhone ? "" : " (необязательно)")} type="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" placeholder="+7 (900) 000-00-00" inputMode="tel" />
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
                  {mode === "register" && (
                    <p className="text-center text-xs text-ink-500">
                      Нажимая кнопку, вы соглашаетесь с <a href="/info/privacy" className="link">политикой конфиденциальности</a>
                    </p>
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
