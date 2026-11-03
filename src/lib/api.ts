import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { ZodError, type ZodTypeAny, type infer as zInfer } from "zod";
import { getCurrentUser, type CurrentUser } from "./session";
import { memoryLimit } from "./rate-limit";
import { notifyError } from "./telegram";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function ok(data: unknown = { ok: true }, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function clientIp() {
  const h = await headers();
  // On Vercel x-real-ip / x-forwarded-for are set by the edge and cannot be spoofed by the client
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}

type Ctx = { user: CurrentUser | null; ip: string };
type Options = { auth?: "user" | "seller" | "admin"; limit?: number; allowCrossSite?: boolean };

export function route<P = Record<string, string>>(
  opts: Options,
  fn: (req: NextRequest, ctx: Ctx & { params: P }) => Promise<Response>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const ip = await clientIp();
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (origin && host) {
          let originHost = "";
          try {
            originHost = new URL(origin).host;
          } catch {}
          if (originHost !== host) throw new ApiError(403, "Недопустимый источник запроса");
        }
        // Browsers mark cross-site requests; reject them for state-changing calls (CSRF defence in depth)
        if (req.headers.get("sec-fetch-site") === "cross-site" && !opts.allowCrossSite) throw new ApiError(403, "Недопустимый источник запроса");
      }
      if (!memoryLimit("api:" + ip, opts.limit ?? 240, 60_000)) throw new ApiError(429, "Слишком много запросов. Попробуйте через минуту.");
      const user = await getCurrentUser();
      if (opts.auth) {
        if (!user) throw new ApiError(401, "Требуется вход в аккаунт");
        if (opts.auth === "admin" && user.role !== "ADMIN") throw new ApiError(403, "Недостаточно прав");
        if (opts.auth === "seller" && !(user.role === "ADMIN" || (user.seller && user.seller.status === "APPROVED")))
          throw new ApiError(403, "Кабинет продавца недоступен");
      }
      const params = (await context?.params) ?? ({} as P);
      return await fn(req, { user, ip, params });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, ...(e.details && typeof e.details === "object" ? (e.details as object) : {}) }, { status: e.status });
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json({ error: first?.message || "Проверьте введённые данные", fields: e.flatten().fieldErrors }, { status: 400 });
      }
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      notifyError(`${req.method} ${req.nextUrl.pathname}: ${(e as Error)?.message ?? e}`).catch(() => undefined);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
  };
}

export async function body<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<zInfer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Некорректный JSON");
  }
  return schema.parse(json);
}
