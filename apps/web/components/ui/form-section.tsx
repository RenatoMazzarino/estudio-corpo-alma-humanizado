"use client";

import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  stepNumber?: number;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, stepNumber, children, className = "" }: FormSectionProps) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        {typeof stepNumber === "number" && (
          <span className="w-6 h-6 rounded-full bg-studio-green text-white text-[11px] font-extrabold flex items-center justify-center">
            {stepNumber}
          </span>
        )}
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
