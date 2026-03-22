"use client";

import { Phone } from "lucide-react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { BottomSheetHeaderV2 } from "../../../../components/ui/bottom-sheet-header-v2";

type ClientCreateModalProps = {
  portalTarget: HTMLElement | null;
  open: boolean;
  saving: boolean;
  error: string | null;
  labelClass: string;
  inputClass: string;
  inputWithIconClass: string;
  firstNameInputRef: RefObject<HTMLInputElement | null>;
  phoneInputRef: RefObject<HTMLInputElement | null>;
  cpfInputRef: RefObject<HTMLInputElement | null>;
  firstName: string;
  lastName: string;
  reference: string;
  internalPreview: string;
  publicPreview: string;
  phone: string;
  email: string;
  cpf: string;
  showInvalidEmailHint: boolean;
  onCloseAction: () => void;
  onFirstNameChangeAction: (value: string) => void;
  onLastNameChangeAction: (value: string) => void;
  onReferenceChangeAction: (value: string) => void;
  onPhoneChangeAction: (value: string) => void;
  onEmailChangeAction: (value: string) => void;
  onCpfChangeAction: (value: string) => void;
  onSaveAction: () => void;
};

export function ClientCreateModal({
  portalTarget,
  open,
  saving,
  error,
  labelClass,
  inputClass,
  inputWithIconClass,
  firstNameInputRef,
  phoneInputRef,
  cpfInputRef,
  firstName,
  lastName,
  reference,
  internalPreview,
  publicPreview,
  phone,
  email,
  cpf,
  showInvalidEmailHint,
  onCloseAction,
  onFirstNameChangeAction,
  onLastNameChangeAction,
  onReferenceChangeAction,
  onPhoneChangeAction,
  onEmailChangeAction,
  onCpfChangeAction,
  onSaveAction,
}: ClientCreateModalProps) {
  if (!portalTarget || !open) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar novo cliente"
        onClick={onCloseAction}
        className="pointer-events-auto absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]"
      />
      <div className="pointer-events-auto relative flex max-h-[95vh] w-full max-w-105 flex-col overflow-hidden wl-radius-sheet wl-surface-modal shadow-float">
        <BottomSheetHeaderV2
          title="Novo cliente"
          subtitle="Cadastre dados para usar no agendamento agora."
          onCloseAction={onCloseAction}
        />

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 pb-24 pt-5 wl-surface-modal-body">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-line wl-surface-card">
            <div className="border-b border-line px-3 py-2.5 wl-surface-card-header">
              <p className="wl-typo-label text-studio-text">Dados basicos</p>
            </div>
            <div className="space-y-3 px-3 py-3 wl-surface-card-body">
              <div>
                <label className={labelClass}>Primeiro nome</label>
                <input
                  ref={firstNameInputRef}
                  type="text"
                  value={firstName}
                  onChange={(event) => onFirstNameChangeAction(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Sobrenome</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => onLastNameChangeAction(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Referencia interna</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => onReferenceChangeAction(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line wl-surface-card">
            <div className="border-b border-line px-3 py-2.5 wl-surface-card-header">
              <p className="wl-typo-label text-studio-text">Contato</p>
            </div>
            <div className="space-y-3 px-3 py-3 wl-surface-card-body">
              <div>
                <label className={labelClass}>WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(event) => onPhoneChangeAction(event.target.value)}
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="cliente@exemplo.com"
                  value={email}
                  onChange={(event) => onEmailChangeAction(event.target.value)}
                  className={inputClass}
                />
                {showInvalidEmailHint ? <p className="ml-1 mt-2 text-[11px] text-red-600">Informe um email valido.</p> : null}
              </div>

              <div>
                <label className={labelClass}>CPF (opcional)</label>
                <input
                  ref={cpfInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpf}
                  onChange={(event) => onCpfChangeAction(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line wl-surface-card">
            <div className="border-b border-line px-3 py-2.5 wl-surface-card-header">
              <p className="wl-typo-label text-studio-text">Pre-visualizacao</p>
            </div>
            <div className="space-y-2 px-3 py-3 wl-surface-card-body">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome interno</p>
              <p className="text-sm font-semibold text-studio-text">{internalPreview}</p>
              <p className="pt-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">Nome publico</p>
              <p className="text-sm font-semibold text-studio-text">{publicPreview}</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-line bg-studio-bg/95 p-4 backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCloseAction}
              disabled={saving}
              className="wl-typo-button h-11 w-full rounded-xl border border-line bg-white text-studio-text disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSaveAction}
              disabled={saving}
              className="wl-typo-button h-11 w-full rounded-xl bg-studio-green text-white shadow-lg shadow-studio-green/30 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
