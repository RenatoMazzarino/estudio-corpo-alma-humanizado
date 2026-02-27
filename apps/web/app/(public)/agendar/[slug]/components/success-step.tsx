"use client";

import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

type SuccessStepProps = {
  date: Date;
  selectedTime: string;
  serviceName: string;
  protocol: string;
  onOpenVoucher: () => void;
  onReset: () => void;
};

export function SuccessStep({ date, selectedTime, serviceName, protocol, onOpenVoucher, onReset }: SuccessStepProps) {
  return (
    <section className="animate-in zoom-in duration-500 flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-3 text-center">
      <div className="mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-green-100 text-studio-green">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h2 className="mb-4 text-3xl font-serif text-studio-text">Agendado!</h2>
      <p className="mb-8 max-w-70 text-sm leading-relaxed text-gray-500">
        Tudo pronto. Te esperamos para o seu momento de cuidado.
      </p>

      <div className="mb-8 w-full rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-soft">
        <div className="flex justify-between border-b border-gray-50 py-2">
          <span className="text-xs font-bold uppercase text-gray-400">Data</span>
          <span className="text-sm font-bold text-studio-text">{format(date, "dd/MM")} - {selectedTime}</span>
        </div>
        <div className="flex justify-between border-b border-gray-50 py-2">
          <span className="text-xs font-bold uppercase text-gray-400">Serviço</span>
          <span className="w-32 truncate text-right text-sm font-bold text-studio-text">{serviceName}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-xs font-bold uppercase text-gray-400">Protocolo</span>
          <span className="font-mono text-sm text-gray-500">{protocol || "AGD"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenVoucher}
        className="mb-3 h-14 w-full rounded-2xl border border-stone-100 bg-white text-xs font-bold uppercase tracking-widest text-studio-text transition-colors hover:bg-stone-50"
      >
        Ver voucher
      </button>
      <button
        type="button"
        onClick={onReset}
        className="mb-4 h-14 w-full rounded-2xl border border-stone-100 bg-white text-xs font-bold uppercase tracking-widest text-studio-text transition-colors hover:bg-stone-50"
      >
        Novo Agendamento
      </button>
      <button
        type="button"
        onClick={onReset}
        className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-studio-green"
      >
        Voltar ao Início
      </button>
    </section>
  );
}
