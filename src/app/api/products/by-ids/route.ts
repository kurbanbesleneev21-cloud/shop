import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cardSelect } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").filter((x) => /^[a-z0-9]{10,40}$/i.test(x)).slice(0, 30);
  if (!ids.length) return NextResponse.json({ items: [] });
  const items = await prisma.product.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, select: cardSelect });
  return NextResponse.json({ items: ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) });
}
