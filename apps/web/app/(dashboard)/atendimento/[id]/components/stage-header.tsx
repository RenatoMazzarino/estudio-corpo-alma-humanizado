"use client";

import { ReactNode } from "react";
import { ChevronLeft, Minimize2 } from "lucide-react";

interface StageHeaderProps {
  kicker: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMinimize?: () => void;
  rightAction?: ReactNode;
}

export function StageHeader({ kicker, title, subtitle, onBack, onMinimize, rightAction }: StageHeaderProps) {
  return (
    <header className="px-6 pt-10 pb-5 bg-white rounded-b-3xl shadow-sm z-30 sticky top-0">
      <div className="flex items-start justify-between gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-studio-bg text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <div className="flex-1">
          <p className="text-xs font-extrabold text-studio-green uppercase tracking-widest mb-1">{kicker}</p>
          <h1 className="text-2xl font-serif text-gray-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 font-bold mt-1">{subtitle}</p>}
        </div>

        {rightAction ??
          (onMinimize ? (
            <button
              onClick={onMinimize}
              className="w-10 h-10 rounded-full bg-studio-bg text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition shadow-sm"
              title="Minimizar"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          ))}
      </div>
    </header>
  );
}
