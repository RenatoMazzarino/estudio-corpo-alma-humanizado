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
  onEditAction: (payload: ActionSheetData) => void;
  onDeleteAction: (payload: ActionSheetData) => Promise<void>;
};

export function AppointmentActionSheet({
  actionSheet,
  portalTarget,
  isActionPending,
  onCloseAction,
  onEditAction,
  onDeleteAction,
}: AppointmentActionSheetProps) {
  if (!actionSheet) return null;

  const actionSheetNode = (
    <div className={`${portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center`}>
      <button type="button" aria-label="Fechar ações" onClick={onCloseAction} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-105 rounded-t-3xl bg-white p-5 shadow-float">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Ações do agendamento</div>
        <div className="mt-2 text-sm font-extrabold text-studio-text">{actionSheet.clientName}</div>
        <div className="text-xs text-muted">
          {actionSheet.serviceName} • {format(parseAgendaDate(actionSheet.startTime), "dd MMM • HH:mm", { locale: ptBR })}
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => onEditAction(actionSheet)}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-studio-text hover:bg-studio-light transition"
          >
            Editar agendamento
          </button>
          <button
            type="button"
            disabled={isActionPending}
            onClick={() => void onDeleteAction(actionSheet)}
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 hover:bg-red-100 transition disabled:opacity-60"
          >
            Excluir agendamento
          </button>
          <button
            type="button"
            onClick={onCloseAction}
            className="w-full rounded-2xl bg-studio-light px-4 py-3 text-sm font-extrabold text-studio-green"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(actionSheetNode, portalTarget) : actionSheetNode;
}
