"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle, KeyRound } from "lucide-react";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function TokenAction({ kind, token }: { kind: "verify" | "reset"; token: string }) {
  const { openAuth, refreshUser } = useApp();
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">(kind === "verify" ? "loading" : "idle");
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (kind !== "verify" || ran.current) return;
    ran.current = true;
    api("/api/auth/verify-email", { body: { token } })
      .then(() => { setState("ok"); refreshUser().catch(() => undefined); })
      .catch((e) => { setState("error"); setMsg((e as Error).message); });
  }, [kind, token, refreshUser]);

  return (
    <div className="container-tm py-16">
      <div className="mx-auto max-w-md animate-fade-up rounded-card border border-ink-100 p-6 text-center shadow-card sm:p-8">
        {state === "loading" && <Loader2 size={48} className="mx-auto animate-spin text-brand" />}
        {state === "ok" && <CheckCircle2 size={56} className="mx-auto text-brand" />}
        {state === "error" && <XCircle size={56} className="mx-auto text-ink-400" />}
        {state === "idle" && <KeyRound size={48} className="mx-auto text-brand" />}
        <h1 className="mt-4 text-2xl font-extrabold">
          {kind === "verify" ? (state === "ok" ? "Email подтверждён" : state === "error" ? "Не удалось подтвердить" : "Подтверждаем…") : state === "ok" ? "Пароль изменён" : "Новый пароль"}
        </h1>
        {msg && <p className="mt-2 text-ink-500">{msg}</p>}
        {kind === "reset" && state !== "ok" && (
          <form
            className="mt-5 space-y-3 text-left"
            onSubmit={async (e) => {
              e.preventDefault();
              setState("loading");
              try {
                await api("/api/auth/reset", { body: { token, password: pw } });
                setState("ok");
                setMsg("Теперь войдите с новым паролем.");
              } catch (er) {
                setState("idle");
                setMsg((er as Error).message);
              }
            }}
          >
            <label className="label">Новый пароль (буквы и цифры, от 8 символов)</label>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required minLength={8} />
            <button className="btn-primary w-full">Сохранить пароль</button>
          </form>
        )}
        {state === "ok" && (kind === "reset" ? <button onClick={() => openAuth("login")} className="btn-primary mt-6">Войти</button> : <Link href="/" className="btn-primary mt-6">На главную</Link>)}
      </div>
    </div>
  );
}
