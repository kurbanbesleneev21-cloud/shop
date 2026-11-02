import { TokenAction } from "@/components/shop/token-action";
export const metadata = { title: "Новый пароль", robots: { index: false } };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <TokenAction kind="reset" token={token ?? ""} />;
}
