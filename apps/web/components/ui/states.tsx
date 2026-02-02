"use client";

import { ReactNode } from "react";

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className = "" }: StateProps) {
  return (
    <div className={`bg-white rounded-3xl shadow-soft p-6 text-center ${className}`}>
      <p className="text-sm font-extrabold text-studio-text">{title}</p>
      {description && <p className="text-xs text-muted mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ title, description, className = "" }: StateProps) {
  return (
    <div className={`bg-white rounded-3xl shadow-soft p-6 ${className}`}>
      <div className="h-4 w-28 bg-studio-light rounded-full mb-3 animate-pulse" />
      <div className="h-3 w-40 bg-studio-light rounded-full animate-pulse" />
      <p className="text-xs text-muted mt-4">{title}</p>
      {description && <p className="text-xs text-muted mt-1">{description}</p>}
    </div>
  );
}

export function ErrorState({ title, description, action, className = "" }: StateProps) {
  return (
    <div className={`bg-red-50 rounded-3xl border border-red-100 p-6 text-center ${className}`}>
      <p className="text-sm font-extrabold text-danger">{title}</p>
      {description && <p className="text-xs text-muted mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
