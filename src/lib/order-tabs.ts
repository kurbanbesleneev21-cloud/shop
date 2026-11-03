import type { Prisma } from "@prisma/client";

// Order filters shown in the buyer profile (Ozon/WB style status groups)
export const ORDER_TABS = [
  { key: "all", label: "Все" },
  { key: "unpaid", label: "Ожидают оплаты" },
  { key: "active", label: "В пути" },
  { key: "done", label: "Получены" },
  { key: "returns", label: "Возвраты" },
  { key: "cancelled", label: "Отменённые" },
] as const;

export type OrderTab = (typeof ORDER_TABS)[number]["key"];

export function orderTabWhere(tab: string): Prisma.OrderWhereInput {
  switch (tab) {
    case "unpaid":
      return { status: "NEW", paymentStatus: "pending" };
    case "active":
      return { status: { in: ["NEW", "CONFIRMED", "PAID", "SHIPPED"] }, NOT: { status: "NEW", paymentStatus: "pending" } };
    case "done":
      return { status: "DELIVERED" };
    case "returns":
      return { status: { in: ["RETURN_REQUESTED", "RETURNED"] } };
    case "cancelled":
      return { status: "CANCELLED" };
    default:
      return {};
  }
}
