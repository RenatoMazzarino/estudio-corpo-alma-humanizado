"use client";

import { MonthCalendar } from "../../../../../components/agenda/month-calendar";
import { StepTabs } from "./step-tabs";

type DatetimeStepProps = {
  label: string;
  serviceName: string;
  totalPrice: number;
  activeMonth: Date;
  selectedDate: Date;
  onSelectDay: (day: Date) => void;
  onChangeMonth: (month: Date) => void;
  isDayDisabled: (day: Date) => boolean;
  isLoadingDaySlots: boolean;
  availableSlots: string[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
};

export function DatetimeStep({
  label,
  serviceName,
  totalPrice,
  activeMonth,
  selectedDate,
  onSelectDay,
  onChangeMonth,
  isDayDisabled,
  isLoadingDaySlots,
  availableSlots,
  selectedTime,
  onSelectTime,
}: DatetimeStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-24 pt-3">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <StepTabs step="DATETIME" />
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Reserve o tempo</h2>
      </div>

      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-400">Serviço</p>
          <p className="text-lg font-serif font-bold text-studio-text">{serviceName}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-gray-400">Valor</p>
          <p className="text-lg font-bold text-studio-green">R$ {totalPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-studio-green">Escolha o Dia</label>
          <MonthCalendar
            currentMonth={activeMonth}
            selectedDate={selectedDate}
            onSelectDay={onSelectDay}
            onChangeMonth={onChangeMonth}
            isDayDisabled={isDayDisabled}
            enableSwipe
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-studio-green">Horários Disponíveis</label>
          {isLoadingDaySlots && !availableSlots.length ? (
            <div className="py-4 text-center text-xs text-gray-400">Carregando horários...</div>
          ) : availableSlots.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-400">Sem horários disponíveis para esta data.</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availableSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSelectTime(time)}
                  className={`rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                    selectedTime === time
                      ? "border-studio-green-dark bg-studio-green-dark text-white"
                      : "border-stone-200 bg-white text-gray-500 hover:border-studio-green hover:text-studio-green"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
