import { PageHeader } from "@/components/admin/sidebar";
import { SettingsView } from "@/components/admin/settings-view";
import { getSettings, secretStatus } from "@/lib/settings";

export const metadata = { title: "Глобальные настройки" };

export default async function SettingsPage() {
  const [values, secrets] = await Promise.all([getSettings({ preview: false }), secretStatus()]);
  return (
    <div>
      <PageHeader title="Глобальные настройки" subtitle="Все параметры платформы от А до Я. Изменения применяются сразу и фиксируются в журнале." />
      <SettingsView values={values} secrets={secrets} />
    </div>
  );
}
