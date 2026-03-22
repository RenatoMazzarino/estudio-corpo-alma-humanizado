import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  size?: "sm" | "md";
};

const sizeClassMap = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

export function IconActionButton({
  icon,
  label,
  size = "md",
  className = "",
  type = "button",
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex ${sizeClassMap[size]} items-center justify-center rounded-full border border-line wl-surface-card-body text-studio-text shadow-sm transition hover:bg-paper ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
