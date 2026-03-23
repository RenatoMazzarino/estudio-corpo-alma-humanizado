import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MonthCalendar } from "../../../../components/agenda/month-calendar";
import { CalendarLegendV2 } from "../../../../components/ui/calendar-legend-v2";
import {
  appointmentFormButtonInlineClass,
  appointmentFormHeaderIconButtonClass,
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderSecondaryClass,
} from "../appointment-form.styles";

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
  monthCalendarOverview: Record<
    string,
    {
      hasStudioAppointment: boolean;
      hasHomeVisit: boolean;
      hasShiftBlock: boolean;
      hasPartialBlock: boolean;
    }
  >;
  selectedDateBlockTitle: string | null;
  onCheckScheduleDayBlockStatus: (dateIso: string) => Promise<{
    hasShiftBlock: boolean;
    hasBlocks: boolean;
    blockTitle: string | null;
  }>;
  hasSelectedTimeBlock: boolean;
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
  monthCalendarOverview,
  selectedDateBlockTitle,
  onCheckScheduleDayBlockStatus,
  hasSelectedTimeBlock,
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
  const [isCheckingDayBlockStatus, setIsCheckingDayBlockStatus] = useState(false);
  const [pendingDaySelection, setPendingDaySelection] = useState<Date | null>(null);
  const [selectionWarning, setSelectionWarning] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  useEffect(() => {
    if (!selectedDate) {
      setIsCalendarCollapsed(false);
      return;
    }
    setIsCalendarCollapsed(true);
  }, [selectedDate]);

  const selectedDayLabel = useMemo(() => formatSelectedDayLabel(selectedDate), [selectedDate]);
  const calendarLegend = useMemo(
    () => (
      <CalendarLegendV2
        items={[
          { key: "studio", label: "Estudio", dotClassName: "bg-studio-green" },
          { key: "home", label: "Domicilio", dotClassName: "bg-dom" },
          { key: "shift", label: "Plantao", dotClassName: "bg-red-500" },
          { key: "partial", label: "Parcial", dotClassName: "bg-amber-500" },
        ]}
      />
    ),
    []
  );

  const handleSelectDayWithWarning = async (day: Date) => {
    const dateIso = format(day, "yyyy-MM-dd");
    setIsCheckingDayBlockStatus(true);

    const result = await onCheckScheduleDayBlockStatus(dateIso);
    setIsCheckingDayBlockStatus(false);

    if (result.hasShiftBlock) {
      setPendingDaySelection(day);
      setSelectionWarning({
        open: true,
        title: "Dia com plantao",
        message:
          "Neste dia voce esta de plantao. Deseja continuar com este dia ou prefere alterar a data?",
      });
      setIsCalendarCollapsed(false);
      return;
    }

    if (result.hasBlocks) {
      const blockTitle = result.blockTitle ?? "Bloqueio";
      setPendingDaySelection(day);
      setSelectionWarning({
        open: true,
        title: `Dia com bloqueio: ${blockTitle}`,
        message:
          "Esta data possui bloqueio cadastrado. Deseja continuar com este dia ou prefere alterar a data?",
      });
      setIsCalendarCollapsed(false);
      return;
    }

    onSelectScheduleDay(day);
    setIsCalendarCollapsed(true);
  };

  const handleKeepSelectedDay = () => {
    if (pendingDaySelection) {
      onSelectScheduleDay(pendingDaySelection);
    }
    setSelectionWarning({ open: false, title: "", message: "" });
    setPendingDaySelection(null);
    setIsCalendarCollapsed(true);
  };

  const handleChangeDayChoice = () => {
    setSelectionWarning({ open: false, title: "", message: "" });
    setPendingDaySelection(null);
    setIsCalendarCollapsed(false);
  };

  if (!visible) return null;

  return (
    <div className="space-y-4">
      <input type="hidden" name="date" value={selectedDate} />

      <section className={`${sectionCardClass} overflow-hidden`}>
        <div className={appointmentFormSectionHeaderPrimaryClass}>
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
              className={appointmentFormHeaderIconButtonClass}
              aria-label={isCalendarCollapsed ? "Abrir calendario" : "Fechar calendario"}
              title={isCalendarCollapsed ? "Abrir calendario" : "Fechar calendario"}
            >
              {isCalendarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        {selectedDate && (blockStatus === "loading" || isCheckingDayBlockStatus) ? (
          <div className="border-b border-line bg-paper px-4 py-2">
            <p className="text-[11px] text-muted">Verificando bloqueios...</p>
          </div>
        ) : null}
        {selectedDate && blockStatus === "idle" && hasShiftBlock ? (
          <div className="border-b border-warn/25 bg-warn/10 px-4 py-2 text-[11px] text-warn">
            Voce esta de plantao nesse dia. Pode seguir, mas revise antes de confirmar.
          </div>
        ) : null}
        {selectedDate && blockStatus === "idle" && !hasShiftBlock && hasBlocks ? (
          <div className="border-b border-warn/25 bg-warn/10 px-4 py-2 text-[11px] text-warn">
            Ha bloqueio registrado para esta data
            {selectedDateBlockTitle ? ` (${selectedDateBlockTitle})` : ""}. Pode seguir, mas revise o horario.
          </div>
        ) : null}

        <div
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-out ${
            isCalendarCollapsed ? "pointer-events-none max-h-0 opacity-0 px-4 py-0" : "max-h-350 opacity-100 px-4 py-4"
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
                void handleSelectDayWithWarning(day);
              }}
              onChangeMonthAction={onChangeScheduleMonth}
              isDayDisabledAction={isScheduleDayDisabled}
              getDayDotsAction={(day) => {
                const key = format(day, "yyyy-MM-dd");
                const data = monthCalendarOverview[key];
                if (!data) return [];
                const dots = [];
                if (data.hasStudioAppointment) {
                  dots.push({ key: "studio", className: "bg-studio-green", title: "Estudio" });
                }
                if (data.hasHomeVisit) {
                  dots.push({ key: "home", className: "bg-dom", title: "Domicilio" });
                }
                if (data.hasShiftBlock) {
                  dots.push({ key: "shift", className: "bg-red-500", title: "Plantao" });
                }
                if (data.hasPartialBlock) {
                  dots.push({ key: "partial", className: "bg-amber-500", title: "Parcial" });
                }
                return dots;
              }}
              legend={calendarLegend}
              legendPlacement="bottom"
              className=""
              headerSize="compact"
              enableSwipe
              framed={false}
            />

            {isLoadingMonthAvailability ? <p className="ml-1 text-[11px] text-muted">Carregando disponibilidade do mes...</p> : null}
          </div>
        </div>
      </section>

      <section className={`${sectionCardClass} overflow-hidden`}>
        <div className={appointmentFormSectionHeaderSecondaryClass}>
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
                        ? "h-10 rounded-xl bg-studio-green px-3 text-white shadow-sm"
                        : `${appointmentFormButtonInlineClass} h-10 rounded-xl px-3 text-gray-500 hover:border-studio-green hover:text-studio-green`
                    }`}
                  >
                    {slot}
                  </button>
                ))
              )}
            </div>
          )}

          {selectedDate && selectedTime && hasSelectedTimeBlock ? (
            <div className="rounded-xl border border-warn/25 bg-warn/10 px-3 py-2 text-[11px] text-warn">
              O horario selecionado coincide com bloqueio nesta data. O aviso nao bloqueia, mas revise antes de confirmar.
            </div>
          ) : null}

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

      {selectionWarning.open ? (
        <div className="pointer-events-auto fixed inset-0 z-90 flex items-center justify-center">
          <button
            type="button"
            aria-label="Fechar confirmacao de dia"
            onClick={handleChangeDayChoice}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative mx-6 w-full max-w-xs overflow-hidden rounded-xl wl-surface-modal shadow-float">
            <div className="border-b border-line wl-sheet-header-surface px-5 py-3">
              <h3 className="wl-typo-card-name-md text-white">{selectionWarning.title}</h3>
              <p className="mt-2 text-xs text-white/80">{selectionWarning.message}</p>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleChangeDayChoice}
                  className="flex-1 rounded-full border border-line bg-paper px-3 py-2 text-[11px] font-medium text-studio-text"
                >
                  Alterar data
                </button>
                <button
                  type="button"
                  onClick={handleKeepSelectedDay}
                  className="flex-1 rounded-full bg-studio-green px-3 py-2 text-[11px] font-medium text-white transition"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
