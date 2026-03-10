"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import { Building2, Car, ChevronDown, X } from "lucide-react";

type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  accepts_home_visit?: boolean | null;
};

type AppointmentServiceLocationStepProps = {
  sectionCardClass: string;
  sectionNumberClass: string;
  sectionHeaderTextClass: string;
  labelClass: string;
  selectClass: string;
  selectedService: ServiceOption | null;
  selectedServiceId: string;
  services: ServiceOption[];
  selectedServiceTotalMinutes: number;
  displayedPrice: string;
  canHomeVisit: boolean;
  hasLocationChoice: boolean;
  isHomeVisit: boolean;
  onServiceChange: ChangeEventHandler<HTMLSelectElement>;
  onClearSelectedServiceAction: () => void;
  onSelectStudioLocationAction: () => void;
  onSelectHomeVisitLocationAction: () => void;
  children?: ReactNode;
};

export function AppointmentServiceLocationStep({
  sectionCardClass,
  sectionNumberClass,
  sectionHeaderTextClass,
  labelClass,
  selectClass,
  selectedService,
  selectedServiceId,
  services,
  selectedServiceTotalMinutes,
  displayedPrice,
  canHomeVisit,
  hasLocationChoice,
  isHomeVisit,
  onServiceChange,
  onClearSelectedServiceAction,
  onSelectStudioLocationAction,
  onSelectHomeVisitLocationAction,
  children,
}: AppointmentServiceLocationStepProps) {
  return (
    <section className={sectionCardClass}>
      <div className="flex items-center gap-2 mb-4">
        <div className={sectionNumberClass}>2</div>
        <h2 className={sectionHeaderTextClass}>O que e onde?</h2>
      </div>

      <div className="mb-6">
        <label className={labelClass}>Procedimento</label>
        {!selectedService ? (
          <div className="relative">
            <select
              name="serviceId"
              value={selectedServiceId}
              onChange={onServiceChange}
              className={selectClass}
              required
            >
              <option value="" disabled>
                Selecione...
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration_minutes} min)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <>
            <input type="hidden" name="serviceId" value={selectedServiceId} />
            <div className="mt-1 rounded-2xl border border-studio-green/15 bg-studio-green/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">
                    Procedimento selecionado
                  </p>
                  <p className="mt-1 text-sm font-bold text-studio-text leading-snug">{selectedService.name}</p>
                </div>
                <button
                  type="button"
                  onClick={onClearSelectedServiceAction}
                  className="shrink-0 w-9 h-9 rounded-xl border border-studio-green/20 bg-white text-studio-green hover:bg-studio-light transition flex items-center justify-center"
                  aria-label="Trocar procedimento"
                  title="Trocar procedimento"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-stone-100 bg-white px-3 py-2.5">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-muted">Procedimento</span>
                    <span className="min-w-0 text-right font-semibold text-studio-text leading-snug">
                      {selectedService.name}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-muted">Tempo do serviço</span>
                    <span className="font-semibold text-studio-text">{selectedService.duration_minutes} min</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-muted">Tempo total</span>
                    <span className="font-semibold text-studio-text">{selectedServiceTotalMinutes} min</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-muted">Aceita domiciliar?</span>
                    <span className="font-semibold text-studio-text">
                      {selectedService.accepts_home_visit ? "Sim" : "Não"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2">
                    <span className="font-semibold text-muted">Valor</span>
                    <span className="font-semibold text-studio-text">R$ {displayedPrice || "0,00"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      <div>
        <label className={labelClass}>Local</label>
        {!selectedService ? (
          <p className="text-[11px] text-muted ml-1 mt-2">Selecione primeiro o procedimento.</p>
        ) : canHomeVisit ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSelectStudioLocationAction}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                hasLocationChoice && !isHomeVisit
                  ? "border-studio-green bg-green-50 text-studio-green"
                  : "border-stone-100 bg-stone-50 text-gray-400"
              }`}
            >
              <Building2 className="w-5 h-5" />
              No Estúdio
            </button>

            <button
              type="button"
              onClick={onSelectHomeVisitLocationAction}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                hasLocationChoice && isHomeVisit
                  ? "border-dom bg-dom/20 text-dom-strong"
                  : "border-stone-100 bg-stone-50 text-gray-400"
              }`}
            >
              <Car className="w-5 h-5" />
              Em Domicílio
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onSelectStudioLocationAction}
                className="py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border border-studio-green bg-green-50 text-studio-green"
              >
                <Building2 className="w-5 h-5" />
                No Estúdio
              </button>
            </div>
            <p className="text-[11px] text-muted ml-1 mt-2">Serviço sem opção domiciliar.</p>
          </>
        )}
        <input type="hidden" name="is_home_visit" value={isHomeVisit && hasLocationChoice ? "on" : ""} />

        {children}
      </div>
    </section>
  );
}
