"use client";

import { Sparkles } from "lucide-react";
import { StepTabs } from "./step-tabs";
import type { Service } from "../booking-flow.types";

type ServiceStepProps = {
  label: string;
  services: Service[];
  selectedServiceId: string | null;
  onSelectService: (service: Service) => void;
};

export function ServiceStep({ label, services, selectedServiceId, onSelectService }: ServiceStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-24 pt-3">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <StepTabs step="SERVICE" />
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Escolha seu cuidado</h2>
      </div>

      <div className="space-y-4">
        {services.map((service) => {
          const selected = selectedServiceId === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService(service)}
              className={`w-full rounded-3xl border bg-white p-5 text-left shadow-soft transition ${
                selected ? "border-studio-green bg-stone-50" : "border-stone-100 hover:border-studio-green/40"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg ${
                    selected ? "bg-studio-green text-white" : "bg-stone-50 text-gray-400"
                  }`}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold leading-tight text-studio-text">{service.name}</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    {service.duration_minutes} min • R$ {service.price.toFixed(2)}
                  </p>
                  {service.description && <p className="mt-2 text-xs text-gray-500">{service.description}</p>}
                </div>
                {service.accepts_home_visit && (
                  <span className="rounded-full bg-dom/20 px-2 py-1 text-[10px] font-bold uppercase text-dom-strong">
                    Home
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
