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
    <div className="pointer-events-auto fixed inset-0 z-90 flex items-center justify-center">
      <button
        type="button"
        aria-label="Fechar confirmacao"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative mx-6 w-full max-w-xs overflow-hidden rounded-xl wl-surface-modal shadow-float">
        <div className="border-b border-line wl-sheet-header-surface px-5 py-3">
          <h3 className="wl-typo-card-name-md text-white">Cancelar agendamento?</h3>
          <p className="mt-2 text-xs text-white/80">
            Se cancelar, este card some da agenda e o horario fica livre novamente.
          </p>
        </div>

        <div className="p-5">
          <label className="mt-0 flex items-start gap-3 rounded-xl border border-line bg-studio-light/40 px-3 py-3">
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
              className="flex-1 rounded-full border border-line bg-paper px-3 py-2 text-[11px] font-medium text-studio-text"
            >
              Manter
            </button>
            <button
              type="button"
              onClick={onConfirmCancel}
              disabled={actionPending}
              className="flex-1 rounded-full bg-red-600 px-3 py-2 text-[11px] font-medium text-white transition disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
