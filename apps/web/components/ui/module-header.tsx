"use client";

import { ReactNode } from "react";

interface ModuleHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ModuleHeader({
  kicker,
  title,
  subtitle,
  rightSlot,
  bottomSlot,
  compact = false,
  className = "",
}: ModuleHeaderProps) {
  const paddingClasses = compact ? "pb-3" : "pb-4";
  return (
    <header
      className={`sticky top-0 z-30 bg-white rounded-b-3xl shadow-soft safe-top safe-top-6 px-6 transition-all ${paddingClasses} ${className}`}
    >
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
      {bottomSlot && <div className={`${compact ? "mt-1.5" : "mt-2.5"}`}>{bottomSlot}</div>}
    </header>
  );
}
