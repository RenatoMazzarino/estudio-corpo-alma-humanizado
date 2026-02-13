"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  className?: string;
};

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & BaseProps;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps;

export function TextField({ className = "", ...props }: TextFieldProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-studio-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-studio-green/20 ${className}`}
    />
  );
}

export function TextArea({ className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-studio-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-studio-green/20 ${className}`}
    />
  );
}
