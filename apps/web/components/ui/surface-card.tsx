"use client";

import { ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
}

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return (
    <div className={`bg-white rounded-3xl shadow-soft border border-line p-4 ${className}`}>
      {children}
    </div>
  );
}
