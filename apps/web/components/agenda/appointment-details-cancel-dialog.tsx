import { X } from "lucide-react";

interface AppointmentDetailsCancelDialogProps {
  open: boolean;
  notifyClientOnCancel: boolean;
  actionPending?: boolean;
  onClose: () => void;
  onChangeNotifyClient: (checked: boolean) => void;
  onConfirmCancel: () => void;
}

export function AppointmentDetailsCancelDialog({
  open,
  notifyClientOnCancel,
  actionPending = false,
  onClose,
  onChangeNotifyClient,
  onConfirmCancel,
}: AppointmentDetailsCancelDialogProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center pointer-events-auto">
      <button
        type="button"
        aria-label="Fechar confirmação"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative mx-6 w-full max-w-xs rounded-2xl bg-white p-5 shadow-float">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <h3 className="text-sm font-extrabold text-studio-text">Cancelar agendamento?</h3>
        <p className="text-xs text-muted mt-2">
          Se cancelar, este card vai sumir da agenda e o horário ficará livre novamente.
        </p>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-studio-light/40 px-3 py-3">
          <input
            type="checkbox"
            checked={notifyClientOnCancel}
            onChange={(event) => onChangeNotifyClient(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-studio-green focus:ring-studio-green"
          />
          <span className="text-[11px] leading-4 text-studio-text">
            Avisar cliente por WhatsApp (se a janela de conversa estiver aberta).
          </span>
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line px-3 py-2 text-[10px] font-extrabold text-studio-text"
          >
            Manter
          </button>
          <button
            type="button"
            onClick={onConfirmCancel}
            disabled={actionPending}
            className="flex-1 rounded-full bg-red-600 px-3 py-2 text-[10px] font-extrabold text-white transition disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
