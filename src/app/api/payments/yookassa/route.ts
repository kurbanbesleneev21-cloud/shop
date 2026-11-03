import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPayment } from "@/lib/payments";

// ЮKassa HTTP notifications. The body is NOT trusted: we only take the payment id from it and
// re-read the real status from the ЮKassa API with our credentials (official verification method).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { object?: { id?: string } } | null;
  const externalId = body?.object?.id;
  if (!externalId || typeof externalId !== "string" || externalId.length > 100) return NextResponse.json({ ok: false }, { status: 400 });
  const p = await prisma.payment.findFirst({ where: { externalId, provider: "yookassa" } });
  if (!p) return NextResponse.json({ ok: true }); // unknown payment — acknowledge to stop retries
  try {
    await syncPayment(p.id);
  } catch (e) {
    console.error("yookassa webhook", e);
    return NextResponse.json({ ok: false }, { status: 500 }); // ЮKassa will retry
  }
  return NextResponse.json({ ok: true });
}
