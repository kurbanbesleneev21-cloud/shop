import { timingSafeEqual } from "crypto";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSecret } from "@/lib/settings";
import { markPaymentCanceled, markPaymentSucceeded, tbankToken } from "@/lib/payments";

// Т-Банк notifications: verified with the Token signature (SHA-256 with the terminal password). Must answer "OK".
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const password = await getSecret("payments", "tbankPassword");
  if (!body || !password || typeof body.Token !== "string") return new Response("BAD", { status: 400 });
  const expected = Buffer.from(tbankToken(body, password));
  const got = Buffer.from(String(body.Token));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return new Response("BAD SIGNATURE", { status: 403 });
  const p = await prisma.payment.findUnique({ where: { id: String(body.OrderId ?? "") } });
  if (!p || p.provider !== "tbank") return new Response("OK");
  if (Number(body.Amount) !== p.amount * 100) return new Response("AMOUNT MISMATCH", { status: 400 });
  const status = String(body.Status);
  if (["CONFIRMED", "AUTHORIZED"].includes(status)) await markPaymentSucceeded(p.id, { tbankStatus: status });
  else if (["REJECTED", "CANCELED", "DEADLINE_EXPIRED", "AUTH_FAIL"].includes(status)) await markPaymentCanceled(p.id, status);
  return new Response("OK");
}
