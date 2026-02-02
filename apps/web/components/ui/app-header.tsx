"use client";

import { ReactNode } from "react";

interface AppHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  className?: string;
}

export function AppHeader({
  label,
  title,
  subtitle,
  leftSlot,
  rightSlot,
  bottomSlot,
  className = "",
}: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 bg-white rounded-b-3xl shadow-soft safe-top safe-top-8 px-6 pb-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        {leftSlot && <div className="pt-1">{leftSlot}</div>}
        <div className="flex-1">
          {label && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">
              {label}
            </p>
          )}
          <h1 className="text-2xl font-serif leading-tight text-studio-text">{title}</h1>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
        {rightSlot && <div className="pt-1">{rightSlot}</div>}
      </div>
      {bottomSlot && <div className="mt-3">{bottomSlot}</div>}
    </header>
  );
}
