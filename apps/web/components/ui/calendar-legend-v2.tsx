import type { ReactNode } from "react";

type CalendarLegendItem = {
  key: string;
  label: ReactNode;
  dotClassName: string;
};

type CalendarLegendV2Props = {
  items: CalendarLegendItem[];
  className?: string;
};

export function CalendarLegendV2({ items, className = "" }: CalendarLegendV2Props) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-studio-bg px-3 py-2 ${className}`}>
      {items.map((item) => (
        <span key={item.key} className="wl-typo-chip inline-flex items-center gap-1 text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${item.dotClassName}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
