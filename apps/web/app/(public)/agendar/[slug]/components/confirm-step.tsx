"use client";

import { format } from "date-fns";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";
import { StepTabs } from "./step-tabs";
import type { PaymentMethod } from "../booking-flow.types";

type ConfirmStepProps = {
  label: string;
  clientName: string;
  serviceName: string;
  selectedDate: Date;
  selectedTime: string;
  isHomeVisit: boolean;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  isMercadoPagoMinimumInvalid: boolean;
  protocol: string;
  onSelectPayment: (method: "pix" | "card") => void;
};

export function ConfirmStep({
  label,
  clientName,
  serviceName,
  selectedDate,
  selectedTime,
  isHomeVisit,
  totalPrice,
  paymentMethod,
  isMercadoPagoMinimumInvalid,
  protocol,
  onSelectPayment,
}: ConfirmStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-32 pt-3">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <StepTabs step="CONFIRM" />
        <h2 className="mt-3 text-2xl font-serif text-studio-text">Tudo certo?</h2>
      </div>

      <div className="space-y-5 rounded-3xl border border-stone-100 bg-white p-6 shadow-soft">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</p>
          <p className="text-base font-bold text-studio-text">{clientName || "Cliente"}</p>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Serviço</p>
          <p className="text-lg font-serif text-studio-text">{serviceName}</p>
        </div>

        <div className="border-t-2 border-dashed border-gray-100" />

        <div className="space-y-2 text-sm font-semibold text-gray-500">
          <div className="flex justify-between">
            <span>Data</span>
            <span>
              {format(selectedDate, "dd/MM")} às {selectedTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Local</span>
            <span>{isHomeVisit ? "Em Domicílio" : "No Estúdio"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</span>
          <span className="text-lg font-bold text-studio-green">R$ {totalPrice.toFixed(2)}</span>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSelectPayment("pix")}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all ${
                paymentMethod === "pix"
                  ? "border-studio-green bg-green-50 text-studio-green"
                  : "border-stone-200 bg-white text-gray-500"
              }`}
            >
              <PaymentMethodIcon method="pix" className="h-4 w-4" /> PIX
            </button>
            <button
              type="button"
              onClick={() => onSelectPayment("card")}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all ${
                paymentMethod === "card"
                  ? "border-studio-green bg-green-50 text-studio-green"
                  : "border-stone-200 bg-white text-gray-500"
              }`}
            >
              <PaymentMethodIcon method="card" className="h-4 w-4" /> Cartão
            </button>
          </div>
          {!paymentMethod && <p className="mt-2 text-xs text-gray-400">Selecione Pix ou Cartão para continuar.</p>}
          {isMercadoPagoMinimumInvalid && (
            <p className="mt-2 text-xs text-amber-700">
              O sinal calculado pela porcentagem ficou abaixo do mínimo do Mercado Pago (R$ 1,00).
              Ajuste o percentual do sinal em Configurações para usar pagamento online neste serviço.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400">Protocolo: {protocol || "AGD-000"}</p>
      </div>
    </section>
  );
}
