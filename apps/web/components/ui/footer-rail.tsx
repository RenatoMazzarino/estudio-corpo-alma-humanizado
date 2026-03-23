"use client";

import type { ReactNode } from "react";

type FooterRailProps = {
  children: ReactNode;
  summary?: ReactNode;
  className?: string;
  surfaceClassName?: string;
  paddingXClassName?: string;
  rowClassName?: string;
  summaryClassName?: string;
};

export function FooterRail({
  children,
  summary,
  className = "",
  surfaceClassName = "wl-surface-modal-body",
  paddingXClassName = "px-5",
  rowClassName = "",
  summaryClassName = "",
}: FooterRailProps) {
  return (
    <footer className={`wl-footer-rail shrink-0 ${surfaceClassName} ${paddingXClassName} ${className}`}>
      {summary ? <div className={`mb-3 ${summaryClassName}`}>{summary}</div> : null}
      <div className={`wl-footer-rail-row ${rowClassName}`}>{children}</div>
    </footer>
  );
}

