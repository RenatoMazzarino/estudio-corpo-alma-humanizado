"use client";

import { useEffect, useState, type ChangeEventHandler, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

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
  onServiceChangeAction: ChangeEventHandler<HTMLSelectElement>;
  onClearSelectedServiceAction: () => void;
  onSelectStudioLocationAction: () => void;
  onSelectHomeVisitLocationAction: () => void;
  children?: ReactNode;
};

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-semibold text-studio-text text-right">{value || "--"}</span>
    </div>
  );
}

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
  onServiceChangeAction,
  onClearSelectedServiceAction,
  onSelectStudioLocationAction,
  onSelectHomeVisitLocationAction,
  children,
}: AppointmentServiceLocationStepProps) {
  const [isServiceAccordionOpen, setIsServiceAccordionOpen] = useState(true);

  useEffect(() => {
    if (!selectedService) {
      setIsServiceAccordionOpen(true);
      return;
    }
    setIsServiceAccordionOpen(true);
  }, [selectedServiceId, selectedService]);

  useEffect(() => {
    // Default local to Estudio whenever a home-visit capable service is selected and no explicit choice exists.
    if (!selectedService || !canHomeVisit || hasLocationChoice) return;
    onSelectStudioLocationAction();
  }, [selectedService, canHomeVisit, hasLocationChoice, onSelectStudioLocationAction]);

  const serviceTitle = selectedService
    ? `Servico: ${selectedService.name}`
    : "Servico";

  const localTitle = "Atendimento domiciliar";
  const showHomeVisitBody = Boolean(selectedService && canHomeVisit && isHomeVisit);

  return (
    <div className="space-y-4">
      <section className={`${sectionCardClass} overflow-hidden`}>
        <div
          className={`flex h-11 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header ${
            selectedService ? "cursor-pointer" : ""
          }`}
          onClick={() => {
            if (!selectedService) return;
            setIsServiceAccordionOpen((prev) => !prev);
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className={sectionNumberClass}>2</div>
            <h2 className={`${sectionHeaderTextClass} leading-none truncate`}>{serviceTitle}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedService ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearSelectedServiceAction();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-studio-green transition hover:bg-paper"
                aria-label="Limpar servico"
                title="Limpar servico"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            {selectedService ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-studio-green">
                {isServiceAccordionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            ) : null}
          </div>
        </div>

        <div className={`space-y-3 px-4 py-4 wl-surface-card-body ${selectedService && !isServiceAccordionOpen ? "hidden" : "block"}`}>
          {!selectedService ? (
            <div>
              <label className={labelClass}>Procedimento</label>
              <div className="relative">
                <select
                  name="serviceId"
                  value={selectedServiceId}
                  onChange={onServiceChangeAction}
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
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </div>
          ) : (
            <>
              <input type="hidden" name="serviceId" value={selectedServiceId} />
              <div className="px-0.5">
                <SummaryLine label="Duracao base" value={`${selectedService.duration_minutes} min`} />
                <SummaryLine label="Tempo total" value={`${selectedServiceTotalMinutes} min`} />
                <SummaryLine label="Valor base" value={`R$ ${displayedPrice || "0,00"}`} />
                <SummaryLine label="Domicilio" value={selectedService.accepts_home_visit ? "Permitido" : "Nao permitido"} />
              </div>
            </>
          )}
        </div>
      </section>

      <section className={`${sectionCardClass} overflow-hidden`}>
        <div className="flex h-11 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header !bg-dom/20">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className={`${sectionHeaderTextClass} leading-none text-dom-strong`}>{localTitle}</h2>
          </div>

          {selectedService && canHomeVisit ? (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isHomeVisit ? "text-dom-strong" : "text-muted"}`}>
                {isHomeVisit ? "Ligado" : "Desligado"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isHomeVisit}
                onClick={() => {
                  if (isHomeVisit) {
                    onSelectStudioLocationAction();
                  } else {
                    onSelectHomeVisitLocationAction();
                  }
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                  isHomeVisit ? "border-dom bg-dom" : "border-line bg-white"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isHomeVisit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ) : selectedService ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Indisponivel neste servico</span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Selecione servico</span>
          )}
        </div>

        <input type="hidden" name="is_home_visit" value={isHomeVisit ? "on" : ""} />

        {showHomeVisitBody ? <div className="space-y-3 px-4 py-4 wl-surface-card-body">{children}</div> : null}
      </section>
    </div>
  );
}
