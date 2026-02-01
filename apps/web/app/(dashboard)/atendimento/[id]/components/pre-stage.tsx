"use client";

import { MapPin, CalendarClock, MessageCircle, Phone, FileText, ListTodo, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AttendanceRow, AppointmentDetails, ChecklistItem } from "../../../../../lib/attendance/attendance-types";
import { StageHeader } from "./stage-header";
import { StageStatusBadge } from "./stage-status";

interface PreStageProps {
  appointment: AppointmentDetails;
  attendance: AttendanceRow;
  checklist: ChecklistItem[];
  onBack: () => void;
  onMinimize: () => void;
  onConfirm: () => void;
  onSendReminder: () => void;
  onToggleChecklist: (itemId: string, completed: boolean) => void;
  onSaveNotes: (notes: string) => void;
  internalNotes: string;
  onInternalNotesChange: (notes: string) => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
}

export function PreStage({
  appointment,
  attendance,
  checklist,
  onBack,
  onMinimize,
  onConfirm,
  onSendReminder,
  onToggleChecklist,
  onSaveNotes,
  internalNotes,
  onInternalNotesChange,
  isTimerRunning,
  onToggleTimer,
}: PreStageProps) {
  const dateLabel = format(new Date(appointment.start_time), "dd 'de' MMMM • HH:mm", { locale: ptBR });

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
    <div className="relative -mx-4 -mt-4">
      <StageHeader
        kicker="Etapa"
        title="Pré"
        subtitle="Preparar o atendimento"
        onBack={onBack}
        onMinimize={onMinimize}
      />

      <main className="px-6 pt-6 pb-32">
        <div className="bg-white border border-stone-100 rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Status e logística</div>
              <div className="mt-2 text-lg font-black text-gray-800">Tudo pronto antes de iniciar</div>
              <div className="text-xs text-gray-400 font-semibold mt-1">
                Confirmação 24h, contato, endereço, observações e checklist.
              </div>
            </div>
            <StageStatusBadge status={attendance.pre_status} />
          </div>

          <div className="px-5 pb-5">
            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Data e hora</div>
                <div className="mt-2 text-sm font-bold text-gray-800">{dateLabel}</div>
                <div className="text-xs text-gray-400 mt-1">Lembrete automático 24h.</div>
              </div>
              <button
                onClick={onSendReminder}
                className="text-xs font-extrabold text-studio-green hover:underline mt-1"
              >
                Enviar 24h
              </button>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Confirmação</div>
                <div className="mt-2 text-sm font-bold text-gray-800">
                  {attendance.confirmed_at ? "Confirmada" : "Não confirmada"}
                </div>
                <div className="text-xs text-gray-400 mt-1">Registrar canal e horário da confirmação.</div>
              </div>
              <button
                onClick={onConfirm}
                className="text-xs font-extrabold text-studio-green hover:underline mt-1"
              >
                Confirmar
              </button>
            </div>

            {appointment.clients?.phone && (
              <div className="flex gap-4 py-4 border-t border-stone-100">
                <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Contato</div>
                  <div className="mt-2 text-sm font-bold text-gray-800">{appointment.clients.phone}</div>
                  <div className="text-xs text-gray-400 mt-1">Atalhos rápidos sem poluir a tela.</div>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <a
                    href={`https://wa.me/${appointment.clients.phone.replace(/\D/g, "")}`}
                    className="text-xs font-extrabold text-studio-green hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Whats
                  </a>
                  <button
                    onClick={() => navigator.clipboard?.writeText(appointment.clients?.phone ?? "")}
                    className="text-xs font-extrabold text-gray-400 hover:text-studio-green transition"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {appointment.is_home_visit && (
              <div className="flex gap-4 py-4 border-t border-stone-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Endereço</div>
                  <div className="mt-2 text-sm font-bold text-gray-800">{addressLine || "Endereço não cadastrado"}</div>
                  <div className="text-xs text-gray-400 mt-1">Abrir no Maps quando necessário.</div>
                </div>
                {addressLine && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                    className="text-xs font-extrabold text-purple-600 hover:underline mt-1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Maps
                  </a>
                )}
              </div>
            )}

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Observações internas</div>
                <textarea
                  className="mt-2 w-full bg-studio-bg rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  rows={3}
                  placeholder="Ex.: cliente prefere óleo X, alergia Y, aviso de portaria..."
                  value={internalNotes}
                  onChange={(event) => onInternalNotesChange(event.target.value)}
                  onBlur={() => onSaveNotes(internalNotes)}
                />
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Checklist</div>
                <div className="mt-3 space-y-2 text-sm">
                  {checklist.map((item) => (
                    <label key={item.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#6A806C]"
                        checked={Boolean(item.completed_at)}
                        onChange={(event) => onToggleChecklist(item.id, event.target.checked)}
                      />
                      <span className="text-gray-700 font-semibold">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-[414px] bg-white border-t border-stone-100 px-6 py-4 pb-6 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTimer}
              className="w-14 h-14 rounded-2xl bg-studio-bg border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-50 transition"
            >
              {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-14 rounded-2xl bg-studio-green text-white font-extrabold shadow-lg shadow-green-200 active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm tracking-wide uppercase"
            >
              Liberar Sessão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
