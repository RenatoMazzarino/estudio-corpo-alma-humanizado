import { Sparkles, X } from "lucide-react";

interface AppointmentDetailsEvolutionModalProps {
  open: boolean;
  draft: string;
  saving?: boolean;
  structuring?: boolean;
  actionPending?: boolean;
  canSave?: boolean;
  canStructure?: boolean;
  onClose: () => void;
  onChangeDraft: (value: string) => void;
  onStructure: () => void;
  onSave: () => void;
}

export function AppointmentDetailsEvolutionModal({
  open,
  draft,
  saving = false,
  structuring = false,
  actionPending = false,
  canSave = true,
  canStructure = true,
  onClose,
  onChangeDraft,
  onStructure,
  onSave,
}: AppointmentDetailsEvolutionModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Fechar edição de evolução"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-96 rounded-3xl border border-line bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-bold text-studio-text">Evolução</p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Edite sem sair do pós-atendimento
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-studio-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onStructure}
              disabled={!canStructure || !draft.trim() || structuring || saving || actionPending}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-studio-green/30 bg-white text-studio-green disabled:opacity-50"
              aria-label="Organizar com Flora"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          <textarea
            value={draft}
            onChange={(event) => onChangeDraft(event.target.value)}
            className="min-h-44 w-full resize-y rounded-2xl border border-line bg-paper p-4 text-sm text-studio-text focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            placeholder="Descreva a evolução da sessão..."
          />

          <p className="text-[11px] font-semibold text-muted">
            {structuring
              ? "Flora está organizando o texto..."
              : "Edite livremente e, se quiser, use a varinha para estruturar."}
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving || structuring || actionPending}
            className="h-11 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar evolução"}
          </button>
        </div>
      </div>
    </div>
  );
}
