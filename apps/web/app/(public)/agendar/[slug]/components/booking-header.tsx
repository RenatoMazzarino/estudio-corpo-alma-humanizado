"use client";

import Image from "next/image";

type BookingHeaderProps = {
  clientName: string;
};

export function BookingHeader({ clientName }: BookingHeaderProps) {
  return (
    <header className="z-10 flex items-center justify-between bg-studio-bg/95 px-6 py-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-100 bg-white shadow-soft">
          <Image
            src="/brand/logo.png"
            alt="Ícone Estúdio Corpo & Alma Humanizado"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Agendamento online</p>
          <p className="truncate text-sm font-serif text-studio-text">Estúdio Corpo & Alma Humanizado</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</p>
        <p className="text-sm font-bold text-studio-text">{clientName}</p>
      </div>
    </header>
  );
}
