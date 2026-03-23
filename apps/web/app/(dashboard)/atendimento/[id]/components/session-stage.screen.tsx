"use client";

import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Mic, NotebookPen, Pencil, RotateCw, Sparkles, Square, SquareCheckBig } from "lucide-react";
import type {
  ChecklistItem,
  ClientHistoryEntry,
} from "../../../../../lib/attendance/attendance-types";
import { SessionHistoryNotesModal } from "./session-history-notes-modal";
import { SessionHistoryPanel } from "./session-history-panel";
import {
  HistoryFilter,
} from "./session-stage.helpers";
import { useSessionStageMedia } from "./use-session-stage-media";

interface SessionStageProps {
  checklistEnabled: boolean;
  checklist: ChecklistItem[];
  onToggleChecklistAction: (itemId: string, completed: boolean) => void;
  hasSavedEvolution: boolean;
  clientHistory: ClientHistoryEntry[];
  evolutionText: string;
  onChangeEvolutionTextAction: (value: string) => void;
  onTranscribeAudioAction: (payload: { audioBase64: string; mimeType: string }) => Promise<string | null>;
  onStructureWithFloraAction: (transcript: string) => Promise<void>;
  onSaveEvolutionAction: () => Promise<boolean>;
}

export function SessionStage({
  checklistEnabled,
  checklist,
  onToggleChecklistAction,
  hasSavedEvolution,
  clientHistory,
  evolutionText,
  onChangeEvolutionTextAction,
  onTranscribeAudioAction,
  onStructureWithFloraAction,
  onSaveEvolutionAction,
}: SessionStageProps) {
  const {
    isRecording,
    isTranscribing,
    isStructuring,
    isEditing,
    setIsEditing,
    recordingError,
    noteLocked,
    stopAudioRecording,
    handleStructureWithFlora,
    handleSaveEvolution,
    startAudioRecording,
  } = useSessionStageMedia({
    hasSavedEvolution,
    evolutionText,
    onChangeEvolutionText: onChangeEvolutionTextAction,
    onTranscribeAudio: onTranscribeAudioAction,
    onStructureWithFlora: onStructureWithFloraAction,
    onSaveEvolution: onSaveEvolutionAction,
  });

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<ClientHistoryEntry | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  const allHistory = useMemo(
    () =>
      [...clientHistory]
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
    [clientHistory]
  );

  const filteredHistory = useMemo(() => {
    const isCanceled = (status: string | null) => status === "canceled_by_client" || status === "canceled_by_studio";
    const isCompletedLike = (status: string | null) => status === "completed" || status === "no_show";
    const historyForDisplay = allHistory.filter((item) => !isCanceled(item.appointment_status));

    switch (historyFilter) {
      case "past":
        return historyForDisplay.filter((item) => isCompletedLike(item.appointment_status));
      case "scheduled":
        return historyForDisplay
          .filter((item) => !isCompletedLike(item.appointment_status))
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      default:
        return historyForDisplay;
    }
  }, [allHistory, historyFilter]);
  const historyCounters = useMemo(
    () => {
      const isCanceled = (status: string | null) => status === "canceled_by_client" || status === "canceled_by_studio";
      const isCompletedLike = (status: string | null) => status === "completed" || status === "no_show";
      const historyForDisplay = allHistory.filter((item) => !isCanceled(item.appointment_status));
      const pastCount = historyForDisplay.filter((item) => isCompletedLike(item.appointment_status)).length;
      const scheduledCount = historyForDisplay.length - pastCount;

      return {
        all: historyForDisplay.length,
        past: pastCount,
        scheduled: scheduledCount,
      };
    },
    [allHistory]
  );

  const toggleHistoryAccordion = (appointmentId: string) => {
    setExpandedHistoryId((current) => (current === appointmentId ? null : appointmentId));
  };

  const closeHistoryNotesModal = () => {
    setSelectedHistory(null);
  };

  const handleHistoryNotesBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeHistoryNotesModal();
    }
  };

  const handleHistoryNotesBackdropKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeHistoryNotesModal();
    }
  };

  return (
    <div className="space-y-5">
      {checklistEnabled && (
        <div className="wl-surface-card shadow-soft">
        <button
          type="button"
          onClick={() => setIsChecklistOpen((current) => !current)}
          className="flex h-12 w-full items-center justify-between gap-3 border-b border-line px-3 text-left wl-surface-card-header"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-studio-green/10 text-studio-green">
              <SquareCheckBig className="h-4 w-4" />
            </div>
            <h2 className="wl-typo-card-name-md truncate text-studio-text">Checklist inicial</h2>
          </div>
          <span className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full">
            <ChevronDown className={`h-4 w-4 transition-transform ${isChecklistOpen ? "rotate-180" : ""}`} />
          </span>
        </button>

          {isChecklistOpen && (
            <div className="px-3 pb-3 pt-3 wl-surface-card-body">
            {checklist.length === 0 ? (
              <p className="wl-typo-body-sm text-muted">Nenhum item cadastrado.</p>
            ) : (
              <div>
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-studio-green"
                        checked={Boolean(item.completed_at)}
                        onChange={(event) => onToggleChecklistAction(item.id, event.target.checked)}
                      />
                      <span className="wl-typo-body truncate text-studio-text">{item.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      <div className="wl-surface-card shadow-soft">
        <button
          type="button"
          onClick={() => setIsEvolutionOpen((current) => !current)}
          className="flex h-12 w-full items-center justify-between gap-3 border-b border-line px-3 text-left wl-surface-card-header"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-studio-green/10 text-studio-green">
              <NotebookPen className="h-4 w-4" />
            </div>
            <h2 className="wl-typo-card-name-md truncate text-studio-text">Evolucao</h2>
          </div>
          <span className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full">
            <ChevronDown className={`h-4 w-4 transition-transform ${isEvolutionOpen ? "rotate-180" : ""}`} />
          </span>
        </button>

          {isEvolutionOpen && (
          <div className="px-3 pb-3 pt-3 wl-surface-card-body">
          <div className="flex items-start justify-between gap-3">
            <p className="wl-typo-body-sm text-muted">
              Registre a evoluÃ§Ã£o da sessÃ£o. Esse texto alimenta o prontuÃ¡rio e deve refletir conduta, resposta e
              orientaÃ§Ãµes.
            </p>
            <div className="flex items-center gap-2">
              {noteLocked && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  aria-label="Editar evoluÃ§Ã£o"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-studio-green"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleStructureWithFlora}
                disabled={!evolutionText.trim() || isStructuring || isTranscribing || noteLocked}
                aria-label="Organizar texto com Flora"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-studio-green disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={isRecording ? stopAudioRecording : startAudioRecording}
                disabled={isStructuring || isTranscribing || noteLocked}
                aria-label={isRecording ? "Parar gravaÃ§Ã£o" : "Iniciar gravaÃ§Ã£o"}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                  isRecording
                    ? "animate-pulse border-red-200 bg-red-50 text-red-600"
                    : "border-line bg-white text-studio-green"
                } disabled:opacity-50`}
              >
                {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="relative mt-4">
            <textarea
              className={`w-full min-h-52 rounded-2xl border border-line p-4 text-sm text-studio-text resize-y ${
                noteLocked ? "bg-stone-50" : "bg-paper focus:outline-none focus:ring-2 focus:ring-studio-green/20"
              }`}
              placeholder={noteLocked ? "Clique no Ã­cone de ediÃ§Ã£o para atualizar a evoluÃ§Ã£o." : "Descreva a evoluÃ§Ã£o da sessÃ£o..."}
              value={evolutionText}
              onChange={(event) => {
                if (!noteLocked) onChangeEvolutionTextAction(event.target.value);
              }}
              readOnly={noteLocked}
            />
            {isTranscribing && (
              <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-semibold text-studio-text">
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-studio-green" />
                  Transcrevendo seu Ã¡udio com Flora...
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-muted">
              {isTranscribing
                ? "Ãudio recebido. Flora estÃ¡ transcrevendo sem estruturar."
                : isStructuring
                ? "Flora estÃ¡ organizando sua evoluÃ§Ã£o..."
                : isRecording
                  ? "Gravando. Toque no quadrado para encerrar."
                  : noteLocked
                    ? "EvoluÃ§Ã£o salva para esta sessÃ£o. Clique no lÃ¡pis para editar."
                    : "Use o microfone para gravar e depois a varinha para estruturar, se quiser."}
            </p>
          </div>
          {recordingError && <p className="mt-2 text-xs text-red-600">{recordingError}</p>}

          {isEditing && (
            <div className="mt-4">
              <button
                onClick={() => void handleSaveEvolution()}
                type="button"
                disabled={isRecording || isTranscribing || isStructuring}
                className="h-12 w-full rounded-2xl bg-studio-green text-white font-extrabold text-xs shadow-lg shadow-green-200 active:scale-95 transition disabled:opacity-50"
              >
                Salvar evoluÃ§Ã£o
              </button>
            </div>
          )}
          </div>
        )}
      </div>

      <SessionHistoryPanel
        open={isAgendaOpen}
        onToggleOpenAction={() => setIsAgendaOpen((current) => !current)}
        historyFilter={historyFilter}
        onChangeFilterAction={setHistoryFilter}
        historyCounters={historyCounters}
        filteredHistory={filteredHistory}
        expandedHistoryId={expandedHistoryId}
        onToggleHistoryAccordionAction={toggleHistoryAccordion}
        onSelectHistoryAction={setSelectedHistory}
      />

      <SessionHistoryNotesModal
        selectedHistory={selectedHistory}
        portalTarget={portalTarget}
        onCloseAction={closeHistoryNotesModal}
        onBackdropClickAction={handleHistoryNotesBackdropClick}
        onBackdropKeyDownAction={handleHistoryNotesBackdropKeyDown}
      />
    </div>
  );
}


