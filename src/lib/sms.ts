import "server-only";
import { getGroup, getSecret } from "./settings";

export async function smsConfigured() {
  const cfg = await getGroup<{ provider: string; smscLogin: string; smsaeroEmail: string }>("sms");
  if (cfg.provider === "smsaero") return Boolean(cfg.smsaeroEmail && (await getSecret("sms", "smsaeroApiKey")));
  if (cfg.provider === "smsru") return Boolean(await getSecret("sms", "smsruApiId"));
  if (cfg.provider === "smsc") return Boolean(cfg.smscLogin && (await getSecret("sms", "smscPassword")));
  return false;
}

export async function sendSms(phone: string, text: string) {
  const cfg = await getGroup<{ provider: string; sender: string; smscLogin: string; smsaeroEmail: string }>("sms");
  if (cfg.provider === "smsaero") {
    // SMS Aero API v2: https://gate.smsaero.ru/v2/sms/send (Basic auth: account email + API key)
    const key = await getSecret("sms", "smsaeroApiKey");
    if (!cfg.smsaeroEmail || !key) throw new Error("SMS-провайдер не настроен");
    const params = new URLSearchParams({ number: phone.replace(/\D/g, ""), text, sign: cfg.sender || "SMS Aero" });
    const res = await fetch("https://gate.smsaero.ru/v2/sms/send?" + params.toString(), {
      headers: { Authorization: "Basic " + Buffer.from(`${cfg.smsaeroEmail.trim()}:${key}`).toString("base64"), Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || !data.success) throw new Error(data.message || `SMS Aero: ошибка ${res.status}`);
    return true;
  }
  if (cfg.provider === "smsc") {
    const psw = await getSecret("sms", "smscPassword");
    if (!cfg.smscLogin || !psw) throw new Error("SMS-провайдер не настроен");
    const params = new URLSearchParams({ login: cfg.smscLogin, psw, phones: phone.replace(/\D/g, ""), mes: text, fmt: "3", charset: "utf-8" });
    if (cfg.sender) params.set("sender", cfg.sender);
    const res = await fetch("https://smsc.ru/sys/send.php", { method: "POST", body: params, signal: AbortSignal.timeout(10000) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: number };
    if (data.error || !data.id) throw new Error(data.error || "Ошибка отправки SMS");
    return true;
  }
  if (cfg.provider === "smsru") {
    const apiId = await getSecret("sms", "smsruApiId");
    if (!apiId) throw new Error("SMS-провайдер не настроен");
    const params = new URLSearchParams({ api_id: apiId, to: phone.replace(/\D/g, ""), msg: text, json: "1" });
    if (cfg.sender) params.set("from", cfg.sender);
    const res = await fetch("https://sms.ru/sms/send?" + params.toString(), { signal: AbortSignal.timeout(10000) });
    const data = (await res.json().catch(() => ({}))) as { status?: string; status_text?: string };
    if (data.status !== "OK") throw new Error(data.status_text || "Ошибка отправки SMS");
    return true;
  }
  throw new Error("SMS-провайдер не подключён");
}
