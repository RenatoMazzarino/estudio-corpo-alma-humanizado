"use client";

type OnlineBookingRulesCardProps = {
  cutoffBeforeCloseMinutes: number;
  lastSlotBeforeCloseMinutes: number;
};

export function OnlineBookingRulesCard({
  cutoffBeforeCloseMinutes,
  lastSlotBeforeCloseMinutes,
}: OnlineBookingRulesCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Regras do agendamento online</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">
            Bloquear no dia a partir de (min antes de fechar)
          </label>
          <input
            type="number"
            name="public_booking_cutoff_before_close_minutes"
            min={0}
            step={1}
            defaultValue={cutoffBeforeCloseMinutes}
            className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
          />
          <p className="mt-1 text-[10px] text-gray-500">
            Ex.: 60 = após faltar 1h para fechar, não aceita novo agendamento online no mesmo dia.
          </p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">
            Último horário online (min antes de fechar)
          </label>
          <input
            type="number"
            name="public_booking_last_slot_before_close_minutes"
            min={0}
            step={1}
            defaultValue={lastSlotBeforeCloseMinutes}
            className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
          />
          <p className="mt-1 text-[10px] text-gray-500">
            Ex.: 30 = se fecha às 18:00, último horário online fica 17:30.
          </p>
        </div>
      </div>
    </div>
  );
}
