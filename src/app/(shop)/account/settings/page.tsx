import { getCurrentUser } from "@/lib/session";
import { smsConfigured } from "@/lib/sms";
import { getGroup } from "@/lib/settings";
import { ProfileForms } from "@/components/shop/profile-forms";

export default async function AccountSettingsPage() {
  const user = (await getCurrentUser())!;
  const [sms, reg] = await Promise.all([smsConfigured(), getGroup<{ phoneVerification: boolean }>("registration")]);
  return (
    <div>
      <h1 className="mb-4 hidden text-2xl font-extrabold lg:block">Настройки и безопасность</h1>
      <ProfileForms
        user={{ name: user.name, email: user.email, phone: user.phone ?? "", emailVerified: Boolean(user.emailVerified), phoneVerified: Boolean(user.phoneVerified) }}
        smsAvailable={sms && reg.phoneVerification}
      />
    </div>
  );
}
