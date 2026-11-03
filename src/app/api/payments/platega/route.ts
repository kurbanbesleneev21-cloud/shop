import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { plategaCallbackAuthentic, syncPayment } from "@/lib/payments";

// Platega callback (URL is set in the Platega dashboard: https://<site>/api/payments/platega).
// 1) credentials echoed in X-MerchantId / X-Secret must match ours;
// 2) the body is NOT trusted — we re-read the transaction status from the Platega API.
export async function POST(req: NextRequest) {
  if (!(await plategaCallbackAuthentic(req.headers))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; payload?: string } | null;
  const externalId = typeof body?.id === "string" ? body.id.slice(0, 100) : "";
  const p = externalId
    ? await prisma.payment.findFirst({ where: { externalId, provider: "platega" } })
    : typeof body?.payload === "string"
      ? await prisma.payment.findUnique({ where: { id: body.payload.slice(0, 40) } })
      : null;
  if (!p) return NextResponse.json({ ok: true });
  try {
    await syncPayment(p.id);
  } catch (e) {
    console.error("platega callback", e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Platega retries
  }
  return NextResponse.json({ ok: true });
}
