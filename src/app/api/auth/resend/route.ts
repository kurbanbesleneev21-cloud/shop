import { route, ok, ApiError } from "@/lib/api";
import { dbLimit } from "@/lib/rate-limit";
import { sendVerification } from "@/lib/auth-tokens";

export const POST = route({ auth: "user" }, async (req, { user }) => {
  if (user!.emailVerified) return ok({ ok: true, already: true });
  if (!(await dbLimit("resend:" + user!.id, 5, 60 * 60_000))) throw new ApiError(429, "Слишком много запросов, попробуйте через час");
  const verification = await sendVerification(user!, req.nextUrl.origin);
  return ok({ ok: true, verification });
});
