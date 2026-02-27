"use client";

import { Phone, X } from "lucide-react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";

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
  onClose: () => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCpfChange: (value: string) => void;
  onSave: () => void;
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
  onClose,
  onFirstNameChange,
  onLastNameChange,
  onReferenceChange,
  onPhoneChange,
  onEmailChange,
  onCpfChange,
  onSave,
}: ClientCreateModalProps) {
  if (!portalTarget || !open) return null;

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-contain bg-black/40 px-5 py-5">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-float">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Cliente</p>
            <h3 className="text-lg font-serif text-studio-text">Cadastrar cliente</h3>
            <p className="mt-1 text-xs text-muted">Defina nome interno, nome público e dados de contato.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-studio-light text-studio-green disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

          <div>
            <label className={labelClass}>Primeiro nome</label>
            <input
              ref={firstNameInputRef}
              type="text"
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Sobrenome (completo)</label>
            <input
              type="text"
              value={lastName}
              onChange={(event) => onLastNameChange(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Referência</label>
            <input
              type="text"
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              className={inputClass}
            />
            <p className="ml-1 mt-1 text-[10px] text-muted">Uso interno. Não aparece em mensagens e telas públicas.</p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Prévia do nome no sistema</p>
            <p className="mt-1 text-sm font-semibold text-studio-text">{internalPreview}</p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
              Nome público (voucher/comprovante/agendamento online)
            </p>
            <p className="mt-1 text-sm font-semibold text-studio-text">{publicPreview}</p>
          </div>

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
                onChange={(event) => onPhoneChange(event.target.value)}
                className={inputWithIconClass}
              />
            </div>
            <p className="ml-1 mt-2 text-[11px] text-muted">Se preencher, será salvo como telefone principal e WhatsApp do cliente.</p>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              inputMode="email"
              placeholder="cliente@exemplo.com"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className={inputClass}
            />
            {showInvalidEmailHint && <p className="ml-1 mt-2 text-[11px] text-red-600">Informe um email válido.</p>}
          </div>

          <div>
            <label className={labelClass}>CPF (Opcional)</label>
            <input
              ref={cpfInputRef}
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              value={cpf}
              onChange={(event) => onCpfChange(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 w-full rounded-2xl border border-line bg-white text-xs font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-green-900/10 disabled:opacity-70"
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
