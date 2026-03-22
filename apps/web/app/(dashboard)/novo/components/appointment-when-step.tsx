import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MonthCalendar } from "../../../../components/agenda/month-calendar";

interface AppointmentWhenStepProps {
  visible: boolean;
  isEditing: boolean;
  sectionCardClass: string;
  sectionNumberClass: string;
  sectionHeaderTextClass: string;
  labelClass: string;
  selectedDate: string;
  selectedDateObj: Date | null;
  activeMonth: Date;
  onSelectScheduleDay: (day: Date) => void;
  onChangeScheduleMonth: (nextMonth: Date) => void;
  isScheduleDayDisabled: (day: Date) => boolean;
  isLoadingMonthAvailability: boolean;
  blockStatus: "idle" | "loading";
  hasShiftBlock: boolean;
  hasBlocks: boolean;
  finalPrice: string;
  priceOverride: string;
  displayedPrice: string;
  onPriceOverrideChange: (value: string) => void;
  selectedServiceId: string;
  isLoadingSlots: boolean;
  availableSlots: string[];
  selectedTime: string;
  onSelectTime: (value: string) => void;
}

const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function formatSelectedDayLabel(selectedDate: string) {
  if (!selectedDate) return "";
  const parsed = new Date(`${selectedDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return selectedDate;
  return dayLabelFormatter.format(parsed);
}

export function AppointmentWhenStep({
  visible,
  isEditing,
  sectionCardClass,
  sectionNumberClass,
  sectionHeaderTextClass,
  labelClass,
  selectedDate,
  selectedDateObj,
  activeMonth,
  onSelectScheduleDay,
  onChangeScheduleMonth,
  isScheduleDayDisabled,
  isLoadingMonthAvailability,
  blockStatus,
  hasShiftBlock,
  hasBlocks,
  finalPrice,
  priceOverride,
  displayedPrice,
  onPriceOverrideChange,
  selectedServiceId,
  isLoadingSlots,
  availableSlots,
  selectedTime,
  onSelectTime,
}: AppointmentWhenStepProps) {
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(Boolean(selectedDate));

  useEffect(() => {
    if (!selectedDate) {
      setIsCalendarCollapsed(false);
      return;
    }
    setIsCalendarCollapsed(true);
  }, [selectedDate]);

  const selectedDayLabel = useMemo(() => formatSelectedDayLabel(selectedDate), [selectedDate]);

  if (!visible) return null;

  return (
    <div className="space-y-4">
      <input type="hidden" name="date" value={selectedDate} />

      <section className={`${sectionCardClass} overflow-hidden`}>
        <div className="flex h-11 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header">
          <div className="flex min-w-0 items-center gap-2">
            <div className={sectionNumberClass}>3</div>
            <h2 className={`${sectionHeaderTextClass} leading-none truncate`}>
              {selectedDayLabel ? `Dia: ${selectedDayLabel}` : "Dia"}
            </h2>
          </div>

          {selectedDate ? (
            <button
              type="button"
              onClick={() => setIsCalendarCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-studio-green transition hover:bg-paper"
              aria-label={isCalendarCollapsed ? "Abrir calendario" : "Fechar calendario"}
              title={isCalendarCollapsed ? "Abrir calendario" : "Fechar calendario"}
            >
              {isCalendarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-out ${
            isCalendarCollapsed ? "pointer-events-none max-h-0 opacity-0 px-4 py-0" : "max-h-[1400px] opacity-100 px-4 py-4"
          }`}
        >
          <div className="space-y-3 wl-surface-card-body">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Valor final</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-sm text-muted">R$</span>
                    <input
                      type="tel"
                      value={finalPrice}
                      readOnly
                      placeholder="0,00"
                      className="w-full rounded-xl border border-line py-3 pl-9 pr-3 text-sm font-semibold text-gray-700 wl-surface-input"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Ajustar valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-sm text-muted">R$</span>
                    <input
                      name="price_override"
                      type="text"
                      inputMode="decimal"
                      value={priceOverride}
                      onChange={(event) => onPriceOverrideChange(event.target.value)}
                      placeholder={displayedPrice || "0,00"}
                      className="w-full rounded-xl border border-line py-3 pl-9 pr-3 text-sm font-medium text-gray-700 wl-surface-input"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <MonthCalendar
              currentMonth={activeMonth}
              selectedDate={selectedDateObj}
              onSelectDayAction={(day) => {
                onSelectScheduleDay(day);
                setIsCalendarCollapsed(true);
              }}
              onChangeMonthAction={onChangeScheduleMonth}
              isDayDisabledAction={isScheduleDayDisabled}
              className=""
              enableSwipe
              framed={false}
            />

            {isLoadingMonthAvailability ? <p className="ml-1 text-[11px] text-muted">Carregando disponibilidade do mes...</p> : null}
            {blockStatus === "loading" ? <p className="ml-1 text-[11px] text-muted">Verificando bloqueios...</p> : null}
            {blockStatus === "idle" && hasShiftBlock ? (
              <div className="rounded-xl border border-warn/25 bg-warn/10 px-3 py-2 text-[11px] text-warn">
                Voce esta de plantao nesse dia, quer agendar mesmo assim?
              </div>
            ) : null}
            {blockStatus === "idle" && !hasShiftBlock && hasBlocks ? (
              <div className="rounded-xl border border-warn/25 bg-warn/10 px-3 py-2 text-[11px] text-warn">
                Ha bloqueios registrados para esta data. Verifique antes de confirmar o horario.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`${sectionCardClass} overflow-hidden`}>
        <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
          <h2 className={`${sectionHeaderTextClass} leading-none`}>Horario</h2>
        </div>

        <div className="space-y-3 px-4 py-4 wl-surface-card-body">
          {!selectedDate ? (
            <div className="rounded-xl border border-dashed border-line bg-paper px-3 py-3 text-xs text-muted">
              Selecione um dia no calendario para abrir os horarios.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {isLoadingSlots ? (
                <div className="col-span-4 text-xs text-muted">Carregando horarios...</div>
              ) : availableSlots.length === 0 ? (
                <div className="col-span-4 text-xs text-muted">Sem horarios disponiveis para esta data.</div>
              ) : (
                availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onSelectTime(slot)}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      selectedTime === slot
                        ? "bg-studio-green text-white shadow-sm"
                        : "border border-line text-gray-500 hover:border-studio-green hover:text-studio-green"
                    }`}
                  >
                    {slot}
                  </button>
                ))
              )}
            </div>
          )}

          <select
            name="time"
            value={selectedTime}
            onChange={(event) => onSelectTime(event.target.value)}
            className="sr-only"
            required
            disabled={!selectedServiceId || !selectedDate || isLoadingSlots}
          >
            {!selectedServiceId || !selectedDate ? (
              <option value="">Selecione data e servico</option>
            ) : isLoadingSlots ? (
              <option value="">Carregando horarios...</option>
            ) : availableSlots.length === 0 ? (
              <option value="">Sem horarios disponiveis</option>
            ) : (
              availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))
            )}
          </select>
        </div>
      </section>
    </div>
  );
}
