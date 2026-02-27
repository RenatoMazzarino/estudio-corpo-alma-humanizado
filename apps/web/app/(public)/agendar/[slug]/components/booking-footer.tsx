"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

type BookingFooterProps = {
  visible: boolean;
  showNextButton: boolean;
  isNextDisabled: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
};

export function BookingFooter({
  visible,
  showNextButton,
  isNextDisabled,
  nextLabel,
  onBack,
  onNext,
}: BookingFooterProps) {
  if (!visible) return null;

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-20 border-t border-stone-100 bg-studio-bg">
      <div className={`flex gap-3 px-6 py-3 ${showNextButton ? "" : "justify-start"}`}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-soft transition-colors hover:text-studio-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {showNextButton && (
          <button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-studio-green-dark text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-colors hover:bg-studio-green disabled:opacity-40"
          >
            <span>{nextLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </footer>
  );
}
