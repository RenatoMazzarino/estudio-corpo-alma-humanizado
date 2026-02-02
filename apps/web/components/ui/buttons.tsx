"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type BaseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

export function PrimaryButton({ children, className = "", ...props }: BaseButtonProps) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl bg-studio-green text-white font-extrabold text-sm px-4 py-3 transition active:scale-[0.99] hover:bg-studio-green-dark disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: BaseButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-studio-light text-studio-green font-extrabold text-sm px-4 py-3 transition active:scale-[0.99] hover:bg-studio-green hover:text-white disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

export function IconButton({ icon, size = "md", className = "", ...props }: IconButtonProps) {
  const sizeClasses = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  return (
    <button
      {...props}
      className={`${sizeClasses} rounded-full bg-studio-light text-studio-green flex items-center justify-center transition active:scale-[0.96] hover:bg-studio-green hover:text-white disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
}
