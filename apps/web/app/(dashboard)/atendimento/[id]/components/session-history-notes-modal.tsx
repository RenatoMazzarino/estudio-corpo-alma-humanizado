"use client";

import { createPortal } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { X } from "lucide-react";
import type { ClientHistoryEntry } from "../../../../../lib/attendance/attendance-types";
import { formatHistoryDate, formatHistoryTime, getHistoryLocationLabel } from "./session-stage.helpers";

type SessionHistoryNotesModalProps = {
  selectedHistory: ClientHistoryEntry | null;
  portalTarget: HTMLElement | null;
  onCloseAction: () => void;
  onBackdropClickAction: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onBackdropKeyDownAction: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
};

function SessionHistoryNotesModalContent({
  selectedHistory,
  onCloseAction,
  onBackdropClickAction,
  onBackdropKeyDownAction,
  useAbsolute,
}: {
  selectedHistory: ClientHistoryEntry;
  onCloseAction: () => void;
  onBackdropClickAction: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onBackdropKeyDownAction: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  useAbsolute: boolean;
}) {
  return (
    <div
      className={`${useAbsolute ? "absolute" : "fixed"} inset-0 z-90 flex items-center justify-center bg-black/45 p-4`}
      onClick={onBackdropClickAction}
      onKeyDown={onBackdropKeyDownAction}
      role="button"
      tabIndex={0}
      aria-label="Fechar anotacoes da sessao"
    >
      <div
        className="wl-radius-card wl-surface-modal w-full max-w-xl overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Anotacoes da sessao"
      >
        <div className="wl-sheet-header-surface px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="wl-typo-card-name-sm text-white">Anotacoes da sessao</h3>
              <p className="mt-0.5 truncate wl-typo-body text-white/90">{selectedHistory.service_name}</p>
              <p className="mt-1 wl-typo-body-sm text-white/80">
                {formatHistoryDate(selectedHistory.start_time)} as{" "}
                {formatHistoryTime(selectedHistory.start_time)} -{" "}
                {getHistoryLocationLabel(selectedHistory.is_home_visit)}
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseAction}
              className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Fechar anotacoes da sessao"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="wl-surface-modal-body p-4">
          <div className="wl-radius-card max-h-[60vh] overflow-y-auto border border-line bg-paper/75 p-4">
            <p className="whitespace-pre-wrap wl-typo-body text-studio-text">
              {selectedHistory.evolution_text?.trim() ||
                (selectedHistory.timeline === "future"
                  ? "Atendimento futuro. Ainda nao existem anotacoes dessa sessao."
                  : "Sem anotacoes registradas nesta sessao.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionHistoryNotesModal({
  selectedHistory,
  portalTarget,
  onCloseAction,
  onBackdropClickAction,
  onBackdropKeyDownAction,
}: SessionHistoryNotesModalProps) {
  if (!selectedHistory) return null;

  if (portalTarget) {
    return createPortal(
      <SessionHistoryNotesModalContent
        selectedHistory={selectedHistory}
        onCloseAction={onCloseAction}
        onBackdropClickAction={onBackdropClickAction}
        onBackdropKeyDownAction={onBackdropKeyDownAction}
        useAbsolute
      />,
      portalTarget
    );
  }

  return (
    <SessionHistoryNotesModalContent
      selectedHistory={selectedHistory}
      onCloseAction={onCloseAction}
      onBackdropClickAction={onBackdropClickAction}
      onBackdropKeyDownAction={onBackdropKeyDownAction}
      useAbsolute={false}
    />
  );
}
