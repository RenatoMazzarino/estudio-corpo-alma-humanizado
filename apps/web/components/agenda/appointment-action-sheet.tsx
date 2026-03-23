"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPortal } from "react-dom";
import { parseAgendaDate } from "./mobile-agenda.helpers";

type ActionSheetData = {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  returnTo: string;
};

type AppointmentActionSheetProps = {
  actionSheet: ActionSheetData | null;
  portalTarget: HTMLElement | null;
  isActionPending: boolean;
  onCloseAction: () => void;
  onOpenRecordAction: (payload: ActionSheetData) => void;
  onEditAction: (payload: ActionSheetData) => void;
  onDeleteAction: (payload: ActionSheetData) => Promise<void>;
};

export function AppointmentActionSheet({
  actionSheet,
  portalTarget,
  isActionPending,
  onCloseAction,
  onOpenRecordAction,
  onEditAction,
  onDeleteAction,
}: AppointmentActionSheetProps) {
  if (!actionSheet) return null;

  const actionSheetNode = (
    <div className={`${portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center`}>
      <button type="button" aria-label="Fechar acoes" onClick={onCloseAction} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-105 overflow-hidden rounded-t-3xl border border-line wl-surface-modal p-5 shadow-float">
        <div className="-mx-5 -mt-5 mb-4 border-b border-line wl-sheet-header-surface px-5 py-3">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/85">Acoes do agendamento</div>
          <div className="mt-2 text-sm font-extrabold text-white">{actionSheet.clientName}</div>
          <div className="text-xs text-white/80">
            {actionSheet.serviceName} - {format(parseAgendaDate(actionSheet.startTime), "dd MMM - HH:mm", { locale: ptBR })}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenRecordAction(actionSheet)}
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm font-extrabold text-studio-text transition hover:bg-studio-light"
          >
            Ver prontuario
          </button>
          <button
            type="button"
            onClick={() => onEditAction(actionSheet)}
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm font-extrabold text-studio-text transition hover:bg-studio-light"
          >
            Editar agendamento
          </button>
          <button
            type="button"
            disabled={isActionPending}
            onClick={() => void onDeleteAction(actionSheet)}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
          >
            Excluir agendamento
          </button>
          <button
            type="button"
            onClick={onCloseAction}
            className="w-full rounded-xl bg-studio-light px-4 py-3 text-sm font-extrabold text-studio-green"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(actionSheetNode, portalTarget) : actionSheetNode;
}
