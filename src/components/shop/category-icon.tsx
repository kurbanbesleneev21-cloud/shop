import {
  Cable, Camera, CircuitBoard, Cpu, Gamepad2, Headphones, HardDrive, Laptop, MemoryStick, Monitor, PcCase, Smartphone, Tablet, Tv, Watch,
  WashingMachine, Package, type LucideProps,
} from "lucide-react";

const ICONS = { Cable, Camera, CircuitBoard, Cpu, Gamepad2, Headphones, HardDrive, Laptop, MemoryStick, Monitor, PcCase, Smartphone, Tablet, Tv, Watch, WashingMachine, Package };
export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, ...props }: { name?: string | null } & Omit<LucideProps, "name">) {
  const Icon = (name && ICONS[name as keyof typeof ICONS]) || Package;
  return <Icon {...props} />;
}
