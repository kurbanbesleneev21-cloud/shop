import "server-only";
import { getGroup, getSecret } from "./settings";

type EmailCfg = {
  provider: "none" | "smtp" | "resend";
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  devShowLinks: boolean;
};

export async function emailConfigured() {
  const cfg = await getGroup<EmailCfg>("email");
  return cfg.provider !== "none";
}

/** HTML-escape any value interpolated into an email template (prevents HTML/phishing injection). */
export function h(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function layout(title: string, body: string, siteName: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#111111">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:800;font-size:22px;letter-spacing:1px;color:#111111">${h(siteName)}</div>
    <h1 style="font-size:20px;margin:24px 0 12px">${h(title)}</h1>
    <div style="font-size:15px;line-height:1.6">${body}</div>
    <p style="font-size:12px;color:#6b6b6b;margin-top:32px">Это автоматическое письмо, отвечать на него не нужно.</p>
  </div></body></html>`;
}

export function button(href: string, label: string) {
  if (!/^https?:\/\//i.test(href)) href = "#";
  return `<p><a href="${h(href)}" style="display:inline-block;background:#2563EB;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">${h(label)}</a></p>`;
}

/** Returns true when the email was actually sent. */
export async function sendEmail(to: string, subject: string, title: string, html: string): Promise<boolean> {
  subject = subject.replace(/[\r\n]+/g, " ").slice(0, 200);
  const cfg = await getGroup<EmailCfg>("email");
  const general = await getGroup<{ siteName: string }>("general");
  const content = layout(title, html, general.siteName || "VITRINA");
  const from = `${cfg.fromName || general.siteName} <${cfg.fromEmail}>`;
  try {
    if (cfg.provider === "resend") {
      const key = await getSecret("email", "resendApiKey");
      if (!key) return false;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html: content }),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    }
    if (cfg.provider === "smtp") {
      const nodemailer = await import("nodemailer");
      const pass = await getSecret("email", "smtpPassword");
      const transport = nodemailer.createTransport({
        host: cfg.smtpHost,
        port: Number(cfg.smtpPort) || 587,
        secure: Boolean(cfg.smtpSecure),
        auth: cfg.smtpUser ? { user: cfg.smtpUser, pass } : undefined,
      });
      await transport.sendMail({ from, to, subject, html: content });
      return true;
    }
  } catch (e) {
    console.error("email failed", (e as Error).message);
  }
  return false;
}
