import { ViewedList } from "@/components/shop/viewed-list";

export default function ViewedPage() {
  return (
    <div>
      <h1 className="mb-4 hidden text-2xl font-extrabold lg:block">Вы смотрели</h1>
      <ViewedList />
    </div>
  );
}
