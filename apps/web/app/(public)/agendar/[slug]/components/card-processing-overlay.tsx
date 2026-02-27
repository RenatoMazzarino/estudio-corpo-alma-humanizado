"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

type ProcessingStage = {
  title: string;
  description: string;
};

type CardProcessingOverlayProps = {
  open: boolean;
  stages: readonly ProcessingStage[];
  stageIndex: number;
  awaitingConfirmation: boolean;
  currentStage: ProcessingStage;
};

export function CardProcessingOverlay({
  open,
  stages,
  stageIndex,
  awaitingConfirmation,
  currentStage,
}: CardProcessingOverlayProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-studio-green/10">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-studio-green/30 border-t-studio-green" />
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-studio-green">Processando pagamento</p>
        <h3 className="mt-2 text-center text-xl font-serif text-studio-text">{currentStage.title}</h3>
        <p className="mt-1 text-center text-xs text-gray-500">{currentStage.description}</p>

        <div className="mt-5 space-y-2">
          {stages.map((stage, index) => {
            const isDone = index < stageIndex;
            const isActive = index === stageIndex;
            return (
              <div key={stage.title} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-studio-green bg-studio-green"
                      : isActive
                        ? "border-studio-green bg-studio-green/20"
                        : "border-stone-300 bg-stone-100"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : isActive ? (
                    <Sparkles className="h-2.5 w-2.5 animate-pulse text-studio-green" />
                  ) : null}
                </span>
                <span className={`text-xs ${isDone || isActive ? "font-semibold text-studio-text" : "text-gray-400"}`}>
                  {stage.title}
                </span>
              </div>
            );
          })}
        </div>

        {awaitingConfirmation && (
          <p className="mt-4 text-center text-[11px] text-gray-500">Aguardando confirmação da operadora. Não feche esta tela.</p>
        )}
      </div>
    </div>
  );
}
