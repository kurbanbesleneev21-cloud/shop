import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SellerSettingsForm } from "@/components/shop/seller-settings";

export default async function SellerSettings() {
  const s = await prisma.seller.findUnique({ where: { id: (await getCurrentUser())!.seller!.id } });
  return (
    <SellerSettingsForm
      initial={{ shopName: s!.shopName, description: s!.description ?? "", logo: s!.logo ?? "", legalName: s!.legalName ?? "", inn: s!.inn ?? "", phone: s!.phone ?? "", email: s!.email ?? "", address: s!.address ?? "", bankName: s!.bankName ?? "", bik: s!.bik ?? "", bankAccount: s!.bankAccount ?? "", returnPolicy: s!.returnPolicy ?? "" }}
      commission={s!.commissionRate}
    />
  );
}
