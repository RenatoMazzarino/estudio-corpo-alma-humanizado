"use client";

import { ReactNode } from "react";

interface ModuleHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  className?: string;
}

export function ModuleHeader({
  kicker,
  title,
  subtitle,
  rightSlot,
  bottomSlot,
  className = "",
}: ModuleHeaderProps) {
  return (
    <header className={`sticky top-0 z-30 bg-white shadow-soft safe-top px-6 pt-4 pb-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {kicker && (
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">
              {kicker}
            </div>
          )}
          <div className="text-2xl font-serif leading-tight text-studio-text">{title}</div>
          {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
        </div>
        {rightSlot && <div className="flex items-start gap-2">{rightSlot}</div>}
      </div>
      {bottomSlot && <div className="mt-3">{bottomSlot}</div>}
    </header>
  );
}
