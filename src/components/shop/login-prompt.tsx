"use client";

import { User } from "lucide-react";
import { useApp } from "../providers";

export function LoginPrompt({ title, text }: { title: string; text: string }) {
  const { openAuth } = useApp();
  return (
    <div className="container-tm py-16">
      <div className="mx-auto max-w-md animate-fade-up text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand"><User size={34} /></div>
        <h1 className="mt-5 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-ink-500">{text}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => openAuth("login")} className="btn-primary btn-lg">Войти</button>
          <button onClick={() => openAuth("register")} className="btn-outline btn-lg">Регистрация</button>
        </div>
      </div>
    </div>
  );
}
