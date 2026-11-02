import { TokenAction } from "@/components/shop/token-action";
export const metadata = { title: "Подтверждение email", robots: { index: false } };
export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <TokenAction kind="verify" token={token ?? ""} />;
}
