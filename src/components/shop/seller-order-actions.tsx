"use client";

import { useRouter } from "next/navigation";
import { useApp } from "../providers";
import { api } from "@/lib/client-api";

export function SellerOrderActions({ id, status }: { id: string; status: string }) {
  const { toast } = useApp();
  const router = useRouter();
  const go = async (s: string) => {
    try {
      await api(`/api/seller/orders/${id}`, { method: "PATCH", body: { status: s } });
      toast("Статус обновлён");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <div className="mt-3 flex gap-2">
      {status === "NEW" && <button className="btn-outline btn-sm" onClick={() => go("CONFIRMED")}>Подтвердить</button>}
      {["NEW", "CONFIRMED", "PAID"].includes(status) && <button className="btn-primary btn-sm" onClick={() => go("SHIPPED")}>Передать в доставку</button>}
    </div>
  );
}
