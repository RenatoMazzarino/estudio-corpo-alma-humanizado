import type { ReactNode } from "react";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const spinnerSizeClass: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className = "", label = "Carregando" }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" aria-label={label} className={`inline-flex items-center ${className}`}>
      <span
        className={`${spinnerSizeClass[size]} animate-spin rounded-full border-2 border-studio-green/30 border-t-studio-green motion-reduce:animate-none`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

type InlineLoadingProps = {
  label?: string;
  className?: string;
};

export function InlineLoading({ label = "Carregando dados...", className = "" }: InlineLoadingProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-xs text-muted ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

type SectionSkeletonProps = {
  lines?: number;
  className?: string;
};

export function SectionSkeleton({ lines = 3, className = "" }: SectionSkeletonProps) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-4 ${className}`} aria-busy="true" role="status">
      <div className="h-4 w-40 rounded-full bg-studio-light/80 animate-pulse" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-3 rounded-full bg-studio-light/70 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

type CardSkeletonProps = {
  className?: string;
};

export function CardSkeleton({ className = "" }: CardSkeletonProps) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-4 ${className}`} aria-busy="true" role="status">
      <div className="h-3 w-24 rounded-full bg-studio-light/80 animate-pulse" />
      <div className="mt-2 h-5 w-2/3 rounded-full bg-studio-light/70 animate-pulse" />
      <div className="mt-3 h-3 w-full rounded-full bg-studio-light/60 animate-pulse" />
      <div className="mt-2 h-3 w-4/5 rounded-full bg-studio-light/60 animate-pulse" />
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({ rows = 5, columns = 4, className = "" }: TableSkeletonProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-white ${className}`} aria-busy="true" role="status">
      <div className="border-b border-line bg-studio-bg/50 p-3">
        <div className="h-3 w-32 rounded-full bg-studio-light animate-pulse" />
      </div>
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid gap-3 p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, col) => (
              <div key={`${row}-${col}`} className="h-3 rounded-full bg-studio-light/70 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type PageSkeletonProps = {
  title?: string;
  sections?: number;
  className?: string;
};

export function PageSkeleton({
  title = "Carregando tela...",
  sections = 3,
  className = "",
}: PageSkeletonProps) {
  return (
    <div className={`space-y-4 p-4 ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <Spinner size="sm" />
        <span className="text-xs font-semibold text-muted">{title}</span>
      </div>
      {Array.from({ length: sections }).map((_, index) => (
        <SectionSkeleton key={index} />
      ))}
    </div>
  );
}

type BlockingOverlayProps = {
  visible: boolean;
  label?: string;
  children?: ReactNode;
};

export function BlockingOverlay({
  visible,
  label = "Processando, aguarde...",
  children,
}: BlockingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/75 backdrop-blur-sm" role="status" aria-live="polite" aria-busy="true">
      <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs text-muted">{label}</span>
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}
