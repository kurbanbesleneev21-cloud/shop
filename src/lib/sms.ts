import "server-only";
import { getGroup, getSecret } from "./settings";

export async function smsConfigured() {
  const cfg = await getGroup<{ provider: string }>("sms");
  if (cfg.provider !== "smsru") return false;
  return Boolean(await getSecret("sms", "smsruApiId"));
}

export async function sendSms(phone: string, text: string) {
  const cfg = await getGroup<{ provider: string; sender: string }>("sms");
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
