"use client";

import { createPortal } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { ClientHistoryEntry } from "../../../../../lib/attendance/attendance-types";
import { formatHistoryDate } from "./session-stage.helpers";

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
      aria-label="Fechar anotações da sessão"
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-line bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Anotações da sessão"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-serif font-bold text-studio-text">Anotações da sessão</h3>
          <button
            type="button"
            onClick={onCloseAction}
            className="h-8 w-8 rounded-lg border border-line text-sm font-bold text-muted"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          {formatHistoryDate(selectedHistory.start_time)} • {selectedHistory.service_name}
        </p>
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-paper p-4">
          <p className="whitespace-pre-wrap text-sm text-studio-text">
            {selectedHistory.evolution_text?.trim() ||
              (selectedHistory.timeline === "future"
                ? "Atendimento futuro. Ainda não existem anotações dessa sessão."
                : "Sem anotações registradas nesta sessão.")}
          </p>
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
