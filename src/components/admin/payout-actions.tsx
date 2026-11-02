"use client";

import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function PayoutActions({ id }: { id: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const go = async (status: "PAID" | "CANCELLED") => {
    try {
      await api(`/api/admin/payouts/${id}`, { method: "PATCH", body: { status } });
      toast(status === "PAID" ? "Выплата подтверждена" : "Выплата отменена");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <span className="flex gap-1">
      <button className="btn-primary btn-sm" onClick={() => go("PAID")}>Выплачено</button>
      <button className="btn-ghost btn-sm" onClick={() => go("CANCELLED")}>Отменить</button>
    </span>
  );
}
