import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

type SectionCardHeaderProps = {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type SectionCardBodyProps = {
  children: ReactNode;
  className?: string;
};

type SectionCardEmptyStateProps = {
  message: ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return <div className={`wl-surface-card ${className}`}>{children}</div>;
}

export function SectionCardHeader({ title, icon, action, className = "" }: SectionCardHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 wl-surface-card-header ${className}`}>
      <div className="min-w-0 flex items-center gap-2">
        {icon ? <span className="shrink-0 text-studio-text/80">{icon}</span> : null}
        <p className="wl-typo-label truncate text-studio-text">{title}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionCardBody({ children, className = "" }: SectionCardBodyProps) {
  return <div className={`wl-surface-card-body ${className}`}>{children}</div>;
}

export function SectionCardEmptyState({ message, className = "" }: SectionCardEmptyStateProps) {
  return (
    <div className={`wl-radius-card border border-dashed border-line wl-surface-card-body px-3 py-3 ${className}`}>
      <p className="wl-typo-body-sm text-muted">{message}</p>
    </div>
  );
}
