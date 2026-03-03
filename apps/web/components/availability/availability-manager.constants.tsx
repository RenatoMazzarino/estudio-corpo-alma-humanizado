import type { ReactNode } from "react";
import { Coffee, Shield, Stethoscope, Umbrella } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { AvailabilityBlock, BlockType } from "./availability-manager.types";

export const blockTypeMeta: Record<
  BlockType,
  { label: string; color: string; icon: ReactNode; iconClass: string; accentClass: string }
> = {
  shift: {
    label: "Plantão",
    color: "bg-red-50 text-red-600 border-red-100",
    icon: <Stethoscope className="w-4 h-4" />,
    iconClass: "bg-red-100 text-red-600",
    accentClass: "text-red-600",
  },
  personal: {
    label: "Pessoal",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    icon: <Coffee className="w-4 h-4" />,
    iconClass: "bg-amber-100 text-amber-700",
    accentClass: "text-amber-600",
  },
  vacation: {
    label: "Férias",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: <Umbrella className="w-4 h-4" />,
    iconClass: "bg-teal-100 text-teal-700",
    accentClass: "text-teal-600",
  },
  administrative: {
    label: "Admin",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <Shield className="w-4 h-4" />,
    iconClass: "bg-gray-100 text-gray-600",
    accentClass: "text-gray-500",
  },
};

export const blockTypeOptions: Array<{
  type: BlockType;
  label: string;
  active: string;
  idle: string;
  icon: ReactNode;
}> = [
  {
    type: "shift",
    label: "Home Care",
    active: "ring-dom/50 text-dom-strong bg-dom/20 border-dom/35",
    idle: "border-stone-100 text-gray-400",
    icon: <Stethoscope className="w-6 h-6" />,
  },
  {
    type: "personal",
    label: "Pessoal",
    active: "ring-amber-400/50 text-amber-600 bg-amber-50 border-amber-100",
    idle: "border-stone-100 text-gray-400",
    icon: <Coffee className="w-6 h-6" />,
  },
  {
    type: "vacation",
    label: "Férias",
    active: "ring-teal-400/50 text-teal-600 bg-teal-50 border-teal-100",
    idle: "border-stone-100 text-gray-400",
    icon: <Umbrella className="w-6 h-6" />,
  },
  {
    type: "administrative",
    label: "Outro",
    active: "ring-gray-300 text-gray-600 bg-stone-100 border-stone-200",
    idle: "border-stone-100 text-gray-400",
    icon: <Shield className="w-6 h-6" />,
  },
];

export function formatBlockTime(block: AvailabilityBlock) {
  if (block.is_full_day) return "Dia todo";
  const start = format(parseISO(block.start_time), "HH:mm");
  const end = format(parseISO(block.end_time), "HH:mm");
  return `${start} - ${end}`;
}
