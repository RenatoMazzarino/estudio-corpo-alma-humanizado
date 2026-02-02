"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  AttendanceRow,
  AppointmentDetails,
  ChecklistItem,
  AppointmentMessage,
  MessageStatus,
  MessageType,
} from "../../../../../lib/attendance/attendance-types";
import { StageStatusBadge } from "./stage-status";

interface PreStageProps {
  appointment: AppointmentDetails;
  attendance: AttendanceRow;
  checklist: ChecklistItem[];
  onConfirm: () => void;
  onSendReminder: () => void;
  onSendMessage: (type: MessageType) => void;
  onToggleChecklist: (itemId: string, completed: boolean) => void;
  onSaveNotes: (notes: string) => void;
  internalNotes: string;
  onInternalNotesChange: (notes: string) => void;
  messages: AppointmentMessage[];
}

export function PreStage({
  appointment,
  attendance,
  checklist,
  onConfirm,
  onSendReminder,
  onSendMessage,
  onToggleChecklist,
  onSaveNotes,
  internalNotes,
  onInternalNotesChange,
  messages,
}: PreStageProps) {
  const startDate = new Date(appointment.start_time);
  const dateLabel = format(startDate, "dd 'de' MMMM", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const isHomeVisit = Boolean(appointment.is_home_visit);

  const messageByType = (type: MessageType) => messages.find((message) => message.type === type) ?? null;
  const reminderMessage = messageByType("reminder_24h");
  const confirmationMessage = messageByType("created_confirmation");

  const messageStatusLabel = (status: MessageStatus | null) => {
    if (!status) return "não enviada";
    switch (status) {
      case "sent_manual":
      case "sent_auto":
        return "enviada";
      case "delivered":
        return "entregue";
      case "failed":
        return "falhou";
      default:
        return "rascunho";
    }
  };

  const addressLine = [
    appointment.address_logradouro ?? appointment.clients?.address_logradouro,
    appointment.address_numero ?? appointment.clients?.address_numero,
    appointment.address_complemento ?? appointment.clients?.address_complemento,
    appointment.address_bairro ?? appointment.clients?.address_bairro,
    appointment.address_cidade ?? appointment.clients?.address_cidade,
    appointment.address_estado ?? appointment.clients?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Pré-atendimento</h2>
            <p className="text-xs text-muted mt-1">Logística, confirmação e mensageria.</p>
          </div>
          <StageStatusBadge status={attendance.pre_status} variant="compact" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Data</p>
            <p className="text-sm font-bold text-studio-text">{dateLabel}</p>
          </div>
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Horário</p>
            <p className="text-sm font-bold text-studio-text">{timeLabel}</p>
          </div>
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Local</p>
            <p className={`text-sm font-bold ${isHomeVisit ? "text-dom" : "text-studio-green"}`}>
              {isHomeVisit ? "Domicílio" : "Estúdio"}
            </p>
          </div>
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Endereço</p>
            <p className="text-sm font-bold text-studio-text truncate">
              {isHomeVisit ? addressLine || "Endereço não informado" : "Estúdio"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <h3 className="text-xs font-extrabold text-muted uppercase tracking-widest mb-4">
          Mensageria (base para WhatsApp)
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-studio-text">Mensagem do agendamento</p>
              <p className="text-[11px] font-bold text-muted">
                Status: {messageStatusLabel(confirmationMessage?.status ?? null)}
              </p>
            </div>
            <button
              onClick={() => onSendMessage("created_confirmation")}
              className="px-3 py-2 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10 hover:bg-white transition"
            >
              Enviar
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-studio-text">Confirmação 24h (confirmar/cancelar)</p>
              <p className="text-[11px] font-bold text-muted">
                Status: {messageStatusLabel(reminderMessage?.status ?? null)}
              </p>
            </div>
            <button
              onClick={onSendReminder}
              className="px-3 py-2 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10 hover:bg-white transition"
            >
              Enviar
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white border border-dashed border-line rounded-2xl p-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-studio-text">Confirmação manual</p>
              <p className="text-[11px] font-bold text-muted">
                {attendance.confirmed_at ? "Confirmada" : "Ainda não confirmada"}
              </p>
            </div>
            <button
              onClick={onConfirm}
              className="px-3 py-2 rounded-2xl bg-studio-green text-white font-extrabold text-xs shadow-sm active:scale-95 transition"
            >
              Marcar confirmada
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <h3 className="text-xs font-extrabold text-muted uppercase tracking-widest mb-4">Checklist</h3>
        {checklist.length === 0 ? (
          <p className="text-xs text-muted">Nenhum item cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between bg-paper border border-line rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[#6A806C]"
                    checked={Boolean(item.completed_at)}
                    onChange={(event) => onToggleChecklist(item.id, event.target.checked)}
                  />
                  <span className="text-sm font-bold text-studio-text">{item.label}</span>
                </div>
                <span className="text-[10px] font-extrabold text-muted uppercase">prep</span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">
            Observações internas
          </p>
          <textarea
            className="w-full h-28 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            placeholder="Detalhes importantes antes da sessão..."
            value={internalNotes}
            onChange={(event) => onInternalNotesChange(event.target.value)}
            onBlur={() => onSaveNotes(internalNotes)}
          />
        </div>
      </div>
    </div>
  );
}
