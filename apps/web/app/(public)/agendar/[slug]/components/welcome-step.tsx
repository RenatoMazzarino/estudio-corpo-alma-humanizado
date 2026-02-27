"use client";

import Image from "next/image";

type WelcomeStepProps = {
  onStart: () => void;
  onTalkToAssistant: () => void;
};

export function WelcomeStep({ onStart, onTalkToAssistant }: WelcomeStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-1 flex-col justify-between overflow-y-auto px-6 pb-10 pt-3">
      <div className="pt-8 text-center">
        <div className="mx-auto mb-8 flex items-center justify-center">
          <Image
            src="/brand/logo.png"
            alt="Estúdio Corpo & Alma Humanizado"
            width={132}
            height={132}
            className="h-33 w-33 object-contain"
            priority
          />
        </div>
        <h1 className="mb-4 text-4xl font-serif font-medium leading-tight text-studio-text">
          Seu momento de
          <br />
          pausa começa aqui.
        </h1>
        <p className="mx-auto max-w-62.5 text-sm font-medium leading-relaxed text-gray-400">
          Agendamento simples, rápido e pensado no seu bem-estar.
        </p>
      </div>

      <div className="space-y-4 pb-6">
        <button
          type="button"
          onClick={onStart}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-studio-green-dark text-sm font-bold uppercase tracking-widest text-white shadow-xl transition-colors hover:bg-studio-green"
        >
          Agendar Agora
        </button>
        <button
          type="button"
          onClick={onTalkToAssistant}
          className="w-full py-4 text-sm font-bold text-studio-text hover:underline"
        >
          Falar com a Flora (Assistente)
        </button>
      </div>
    </section>
  );
}
