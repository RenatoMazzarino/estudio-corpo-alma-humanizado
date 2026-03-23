"use client";

import { HeartPulse, Plus, X } from "lucide-react";
import {
  appointmentFormHeaderIconButtonClass,
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";
import type {
  AnamneseFormStatus,
  ClinicalItemFormEntry,
} from "./new-client.types";

type ClinicalItemUpdate = Partial<Pick<ClinicalItemFormEntry, "notes" | "severity" | "isActive">>;

type NewClientHealthSectionProps = {
  allergyItems: ClinicalItemFormEntry[];
  conditionItems: ClinicalItemFormEntry[];
  contraindicationItems: ClinicalItemFormEntry[];
  allergyInput: string;
  conditionInput: string;
  contraindicationInput: string;
  preferencesNotes: string;
  clinicalHistory: string;
  anamneseUrl: string;
  anamneseFormStatus: AnamneseFormStatus;
  anamneseFormSentAt: string;
  anamneseFormAnsweredAt: string;
  onAddAllergyTagAction: () => void;
  onRemoveAllergyTagAction: (tag: string) => void;
  onChangeAllergyInputAction: (value: string) => void;
  onAddConditionTagAction: () => void;
  onRemoveConditionTagAction: (tag: string) => void;
  onChangeConditionInputAction: (value: string) => void;
  onAddContraindicationTagAction: () => void;
  onRemoveContraindicationTagAction: (tag: string) => void;
  onChangeContraindicationInputAction: (value: string) => void;
  onChangeAllergyItemAction: (tag: string, update: ClinicalItemUpdate) => void;
  onChangeConditionItemAction: (tag: string, update: ClinicalItemUpdate) => void;
  onChangeContraindicationItemAction: (tag: string, update: ClinicalItemUpdate) => void;
  onChangePreferencesNotesAction: (value: string) => void;
  onChangeClinicalHistoryAction: (value: string) => void;
  onChangeAnamneseUrlAction: (value: string) => void;
  onChangeAnamneseFormStatusAction: (value: AnamneseFormStatus) => void;
  onChangeAnamneseFormSentAtAction: (value: string) => void;
  onChangeAnamneseFormAnsweredAtAction: (value: string) => void;
};

function ClinicalItemEditor({
  item,
  toneClass,
  onChange,
  onRemove,
}: {
  item: ClinicalItemFormEntry;
  toneClass: string;
  onChange: (update: ClinicalItemUpdate) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-xl border ${toneClass} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-studio-text">{item.label}</p>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-red-600"
          aria-label={`Remover ${item.label}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Observacoes</span>
          <input
            value={item.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Detalhes clinicos deste item"
            className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
          />
        </label>

        <label>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Severidade</span>
          <select
            value={item.severity ?? ""}
            onChange={(event) =>
              onChange({
                severity:
                  event.target.value === "leve" ||
                  event.target.value === "moderada" ||
                  event.target.value === "alta"
                    ? event.target.value
                    : null,
              })
            }
            className="mt-1 w-full rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
          >
            <option value="">Nao definida</option>
            <option value="leve">Leve</option>
            <option value="moderada">Moderada</option>
            <option value="alta">Alta</option>
          </select>
        </label>
      </div>

      <label className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-studio-text">
        <input
          type="checkbox"
          checked={item.isActive}
          onChange={(event) => onChange({ isActive: event.target.checked })}
          className="h-4 w-4 accent-[var(--color-studio-green)]"
        />
        Item ativo
      </label>
    </div>
  );
}

export function NewClientHealthSection({
  allergyItems,
  conditionItems,
  contraindicationItems,
  allergyInput,
  conditionInput,
  contraindicationInput,
  preferencesNotes,
  clinicalHistory,
  anamneseUrl,
  anamneseFormStatus,
  anamneseFormSentAt,
  anamneseFormAnsweredAt,
  onAddAllergyTagAction,
  onRemoveAllergyTagAction,
  onChangeAllergyInputAction,
  onAddConditionTagAction,
  onRemoveConditionTagAction,
  onChangeConditionInputAction,
  onAddContraindicationTagAction,
  onRemoveContraindicationTagAction,
  onChangeContraindicationInputAction,
  onChangeAllergyItemAction,
  onChangeConditionItemAction,
  onChangeContraindicationItemAction,
  onChangePreferencesNotesAction,
  onChangeClinicalHistoryAction,
  onChangeAnamneseUrlAction,
  onChangeAnamneseFormStatusAction,
  onChangeAnamneseFormSentAtAction,
  onChangeAnamneseFormAnsweredAtAction,
}: NewClientHealthSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Saude e cuidados</h3>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Alergias</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={allergyInput}
              onChange={(event) => onChangeAllergyInputAction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddAllergyTagAction();
                }
              }}
              placeholder="Adicionar alergia"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={onAddAllergyTagAction}
              className={appointmentFormHeaderIconButtonClass}
              aria-label="Adicionar alergia"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {allergyItems.map((item) => (
              <ClinicalItemEditor
                key={item.id}
                item={item}
                toneClass="border-red-200 bg-red-50/40"
                onChange={(update) => onChangeAllergyItemAction(item.label, update)}
                onRemove={() => onRemoveAllergyTagAction(item.label)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Condicoes e atencoes</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={conditionInput}
              onChange={(event) => onChangeConditionInputAction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddConditionTagAction();
                }
              }}
              placeholder="Adicionar condicao"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={onAddConditionTagAction}
              className={appointmentFormHeaderIconButtonClass}
              aria-label="Adicionar condicao"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {conditionItems.map((item) => (
              <ClinicalItemEditor
                key={item.id}
                item={item}
                toneClass="border-orange-200 bg-orange-50/40"
                onChange={(update) => onChangeConditionItemAction(item.label, update)}
                onRemove={() => onRemoveConditionTagAction(item.label)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Contraindicacoes</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={contraindicationInput}
              onChange={(event) => onChangeContraindicationInputAction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddContraindicationTagAction();
                }
              }}
              placeholder="Adicionar contraindicacao"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={onAddContraindicationTagAction}
              className={appointmentFormHeaderIconButtonClass}
              aria-label="Adicionar contraindicacao"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {contraindicationItems.map((item) => (
              <ClinicalItemEditor
                key={item.id}
                item={item}
                toneClass="border-amber-200 bg-amber-50/40"
                onChange={(update) => onChangeContraindicationItemAction(item.label, update)}
                onRemove={() => onRemoveContraindicationTagAction(item.label)}
              />
            ))}
          </div>
        </div>

        <textarea
          name="clinical_history"
          value={clinicalHistory}
          onChange={(event) => onChangeClinicalHistoryAction(event.target.value)}
          placeholder="Historico clinico / anamnese"
          rows={3}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <textarea
          name="preferences_notes"
          value={preferencesNotes}
          onChange={(event) => onChangePreferencesNotesAction(event.target.value)}
          placeholder="Preferencias do atendimento"
          rows={3}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <div className="rounded-xl border border-line wl-surface-card-body p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Historico / anamnese</p>
          <input
            name="anamnese_url"
            value={anamneseUrl}
            onChange={(event) => onChangeAnamneseUrlAction(event.target.value)}
            placeholder="Link do formulario inicial (opcional)"
            className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status do formulario</span>
              <select
                name="anamnese_form_status"
                value={anamneseFormStatus}
                onChange={(event) =>
                  onChangeAnamneseFormStatusAction(event.target.value as AnamneseFormStatus)
                }
                className="rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
              >
                <option value="nao_enviado">Nao enviado</option>
                <option value="enviado">Enviado</option>
                <option value="respondido">Respondido</option>
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Enviado em</span>
              <input
                type="datetime-local"
                name="anamnese_form_sent_at"
                value={anamneseFormSentAt}
                onChange={(event) => onChangeAnamneseFormSentAtAction(event.target.value)}
                className="rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Respondido em</span>
              <input
                type="datetime-local"
                name="anamnese_form_answered_at"
                value={anamneseFormAnsweredAt}
                onChange={(event) => onChangeAnamneseFormAnsweredAtAction(event.target.value)}
                className="rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
