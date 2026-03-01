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
  if (!visible) return null;

  return (
    <section className={sectionCardClass}>
      <div className="flex items-center gap-2 mb-4">
        <div className={sectionNumberClass}>3</div>
        <h2 className={sectionHeaderTextClass}>Quando?</h2>
      </div>

      <div className={`grid ${isEditing ? "grid-cols-2" : "grid-cols-1"} gap-4 mb-4`}>
        {isEditing && (
          <div>
            <label className={labelClass}>Valor final</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
              <input
                type="tel"
                value={finalPrice}
                readOnly
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-semibold"
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Data</label>
          <input type="hidden" name="date" value={selectedDate} />
          <MonthCalendar
            currentMonth={activeMonth}
            selectedDate={selectedDateObj}
            onSelectDay={onSelectScheduleDay}
            onChangeMonth={onChangeScheduleMonth}
            isDayDisabled={isScheduleDayDisabled}
            className="rounded-2xl shadow-none border border-stone-100 p-3"
            enableSwipe
          />
          {isLoadingMonthAvailability && (
            <p className="text-[11px] text-muted mt-2 ml-1">Carregando disponibilidade do mês...</p>
          )}
          {blockStatus === "loading" && <p className="text-[11px] text-muted mt-2 ml-1">Verificando bloqueios...</p>}
          {blockStatus === "idle" && hasShiftBlock && (
            <div className="text-[11px] text-warn bg-warn/10 border border-warn/20 px-3 py-2 rounded-xl mt-2">
              Você está de plantão esse dia, quer agendar mesmo assim?
            </div>
          )}
          {blockStatus === "idle" && !hasShiftBlock && hasBlocks && (
            <div className="text-[11px] text-warn bg-warn/10 border border-warn/20 px-3 py-2 rounded-xl mt-2">
              Há bloqueios registrados para esta data. Verifique antes de confirmar o horário.
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-4">
          <label className={labelClass}>Ajustar valor (opcional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
            <input
              name="price_override"
              type="text"
              inputMode="decimal"
              value={priceOverride}
              onChange={(event) => onPriceOverrideChange(event.target.value)}
              placeholder={displayedPrice || "0,00"}
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium"
            />
          </div>
          <p className="text-[10px] text-muted mt-1 ml-1">Se deixar vazio, usamos o valor do serviço.</p>
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Horário</label>
        {!selectedDate ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-muted">
            Selecione um dia no calendário para abrir os horários.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {isLoadingSlots ? (
              <div className="col-span-4 text-xs text-muted">Carregando horários...</div>
            ) : availableSlots.length === 0 ? (
              <div className="col-span-4 text-xs text-muted">Sem horários disponíveis para esta data.</div>
            ) : (
              availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelectTime(slot)}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    selectedTime === slot
                      ? "bg-studio-green text-white shadow-sm transform scale-105"
                      : "border border-stone-100 text-gray-400 hover:border-studio-green hover:text-studio-green"
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
            <option value="">Selecione data e serviço</option>
          ) : isLoadingSlots ? (
            <option value="">Carregando horários...</option>
          ) : availableSlots.length === 0 ? (
            <option value="">Sem horários disponíveis</option>
          ) : (
            availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))
          )}
        </select>
        <p className="text-[11px] text-muted mt-2 ml-1">Horários já consideram o tempo de preparo antes/depois.</p>
      </div>
    </section>
  );
}
