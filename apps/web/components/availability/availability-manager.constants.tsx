import type { ReactNode } from "react";
import { BriefcaseBusiness, Coffee, HeartPulse, Umbrella } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { AvailabilityBlock, BlockType } from "./availability-manager.types";

export const blockTypeMeta: Record<
  BlockType,
  { label: string; color: string; icon: ReactNode; iconClass: string; accentClass: string }
> = {
  shift: {
    label: "Plantao",
    color: "border-studio-green/25 bg-studio-light text-studio-green",
    icon: <HeartPulse className="h-4 w-4" />,
    iconClass: "bg-studio-light text-studio-green",
    accentClass: "text-studio-green",
  },
  personal: {
    label: "Pessoal",
    color: "border-studio-accent/30 bg-paper text-studio-text",
    icon: <Coffee className="h-4 w-4" />,
    iconClass: "bg-paper text-studio-accent",
    accentClass: "text-studio-accent",
  },
  vacation: {
    label: "Ferias",
    color: "border-dom/35 bg-dom/10 text-dom-strong",
    icon: <Umbrella className="h-4 w-4" />,
    iconClass: "bg-dom/15 text-dom-strong",
    accentClass: "text-dom-strong",
  },
  administrative: {
    label: "Admin",
    color: "border-line bg-paper text-muted",
    icon: <BriefcaseBusiness className="h-4 w-4" />,
    iconClass: "bg-paper text-muted",
    accentClass: "text-muted",
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
    label: "Plantao",
    active: "ring-studio-green/25 text-studio-green bg-studio-light border-studio-green/25",
    idle: "border-line text-muted",
    icon: <HeartPulse className="h-6 w-6" />,
  },
  {
    type: "personal",
    label: "Pessoal",
    active: "ring-studio-accent/25 text-studio-text bg-paper border-studio-accent/35",
    idle: "border-line text-muted",
    icon: <Coffee className="h-6 w-6" />,
  },
  {
    type: "vacation",
    label: "Ferias",
    active: "ring-dom/25 text-dom-strong bg-dom/10 border-dom/30",
    idle: "border-line text-muted",
    icon: <Umbrella className="h-6 w-6" />,
  },
  {
    type: "administrative",
    label: "Admin",
    active: "ring-studio-text/15 text-studio-text bg-paper border-line",
    idle: "border-line text-muted",
    icon: <BriefcaseBusiness className="h-6 w-6" />,
  },
];

export function formatBlockTime(block: AvailabilityBlock) {
  if (block.is_full_day) return "Dia inteiro";
  const start = format(parseISO(block.start_time), "HH:mm");
  const end = format(parseISO(block.end_time), "HH:mm");
  return `${start} - ${end}`;
}
