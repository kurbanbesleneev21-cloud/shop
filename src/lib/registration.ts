// Registration quality rules (shared by server; client mirrors the simple ones).

const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com",
  "dispostable.com", "getnada.com", "sharklasers.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com", "mintemail.com",
  "emailondeck.com", "moakt.com", "tempail.com", "mohmal.com", "dropmail.me", "1secmail.com", "tempmailo.com", "minuteinbox.com",
]);

const COMMON = new Set([
  "password1", "qwerty123", "12345678a", "password123", "1q2w3e4r", "qwerty12", "a1234567", "11111111a", "1234qwer", "qwertyui1",
  "123456789a", "abc12345", "iloveyou1", "admin123", "letmein1", "welcome1", "passw0rd", "zaq12wsx", "1qaz2wsx", "q1w2e3r4",
  "techmarket1", "parol123", "privet123", "123qweasd", "qweasdzxc1",
]);

export function isDisposableEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE.has(domain);
}

/** Returns an error message or null. */
export function passwordProblem(password: string, ctx: { email?: string; name?: string; minLength: number }) {
  if (password.length < ctx.minLength) return `Пароль должен быть не короче ${ctx.minLength} символов`;
  if (!/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) return "Пароль должен содержать буквы и цифры";
  if (COMMON.has(password.toLowerCase())) return "Этот пароль слишком распространён — придумайте другой";
  if (/^(.)\1+$/.test(password.replace(/\d/g, "")) && password.length < 12) return "Пароль слишком простой";
  const local = ctx.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return "Пароль не должен содержать ваш email";
  return null;
}

export const NAME_RE = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s'.-]{1,79}$/;
