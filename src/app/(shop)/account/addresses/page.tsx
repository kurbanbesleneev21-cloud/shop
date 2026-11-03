import { AddressBook } from "@/components/shop/address-book";

export default function AddressesPage() {
  return (
    <div>
      <h1 className="mb-4 hidden text-2xl font-extrabold lg:block">Адреса доставки</h1>
      <AddressBook />
    </div>
  );
}
