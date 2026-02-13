"use client";

import { ReactNode } from "react";

interface ModulePageProps {
  header: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function ModulePage({
  header,
  children,
  className = "",
  headerClassName = "",
  contentClassName = "",
}: ModulePageProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col bg-studio-bg ${className}`}>
      <div className={`relative z-30 ${headerClassName}`}>{header}</div>
      <div className={`flex min-h-0 flex-1 flex-col ${contentClassName}`}>{children}</div>
    </div>
  );
}
