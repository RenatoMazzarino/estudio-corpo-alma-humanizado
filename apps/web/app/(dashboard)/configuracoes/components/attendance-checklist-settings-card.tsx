"use client";

type AttendanceChecklistSettingsCardProps = {
  enabled: boolean;
  itemsText: string;
  onEnabledChange: (value: boolean) => void;
  onItemsTextChange: (value: string) => void;
};

export function AttendanceChecklistSettingsCard({
  enabled,
  itemsText,
  onEnabledChange,
  onItemsTextChange,
}: AttendanceChecklistSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Checklist do atendimento</h3>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            name="attendance_checklist_enabled"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          Exibir no atendimento
        </label>
      </div>

      <div>
        <label className="text-[11px] font-bold text-gray-500 uppercase">Itens padrão (1 por linha)</label>
        <textarea
          name="attendance_checklist_items"
          value={itemsText}
          onChange={(event) => onItemsTextChange(event.target.value)}
          readOnly={!enabled}
          rows={5}
          className={`mt-1 w-full border border-stone-200 rounded-xl py-2 px-3 text-sm ${
            enabled ? "bg-white" : "bg-stone-100 text-gray-500"
          }`}
          placeholder={"Separar materiais e itens de higiene\nConfirmar endereço/portaria\nRever restrições (anamnese)"}
        />
      </div>

      <p className="text-[11px] text-gray-500">
        Quando desativado, o checklist não aparece na tela de atendimento.
      </p>
    </div>
  );
}
