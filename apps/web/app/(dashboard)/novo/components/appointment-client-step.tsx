"use client";

import type { RefObject } from "react";
import { Phone, Search, Sparkles, X } from "lucide-react";
import { formatCpf } from "../../../../src/shared/cpf";
import { formatBrazilPhone } from "../../../../src/shared/phone";

type ClientLite = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
};

type DuplicateCpfClient = {
  name: string;
} | null;

type AppointmentClientStepProps = {
  sectionCardClass: string;
  sectionNumberClass: string;
  sectionHeaderTextClass: string;
  labelClass: string;
  inputWithIconClass: string;
  inputClass: string;
  isEditing: boolean;
  clientName: string;
  isClientReadOnly: boolean;
  isClientDropdownOpen: boolean;
  filteredClients: ClientLite[];
  isClientSelectionPending: boolean;
  shouldShowClientContactFields: boolean;
  clientPhone: string;
  isClientPhoneReadOnly: boolean;
  missingWhatsappWarning: boolean;
  shouldShowCpfField: boolean;
  clientCpf: string;
  isExistingClientCpfLocked: boolean;
  duplicateCpfClient: DuplicateCpfClient;
  clientPhoneInputRef: RefObject<HTMLInputElement | null>;
  clientCpfInputRef: RefObject<HTMLInputElement | null>;
  onFocusClient: () => void;
  onBlurClient: () => void;
  onChangeClientName: (value: string) => void;
  onClearSelectedClient: () => void;
  onSelectClient: (client: ClientLite) => void;
  onCreateNewClientFromName: () => void;
  onChangeClientPhone: (value: string) => void;
  onChangeClientCpf: (value: string) => void;
  onLinkExistingClientByCpf: () => void;
  onChangeCpfAfterConflict: () => void;
};

export function AppointmentClientStep({
  sectionCardClass,
  sectionNumberClass,
  sectionHeaderTextClass,
  labelClass,
  inputWithIconClass,
  inputClass,
  isEditing,
  clientName,
  isClientReadOnly,
  isClientDropdownOpen,
  filteredClients,
  isClientSelectionPending,
  shouldShowClientContactFields,
  clientPhone,
  isClientPhoneReadOnly,
  missingWhatsappWarning,
  shouldShowCpfField,
  clientCpf,
  isExistingClientCpfLocked,
  duplicateCpfClient,
  clientPhoneInputRef,
  clientCpfInputRef,
  onFocusClient,
  onBlurClient,
  onChangeClientName,
  onClearSelectedClient,
  onSelectClient,
  onCreateNewClientFromName,
  onChangeClientPhone,
  onChangeClientCpf,
  onLinkExistingClientByCpf,
  onChangeCpfAfterConflict,
}: AppointmentClientStepProps) {
  return (
    <section className={sectionCardClass}>
      <div className="flex items-center gap-2 mb-4">
        <div className={sectionNumberClass}>1</div>
        <h2 className={sectionHeaderTextClass}>Cliente</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Cliente</label>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              name="clientName"
              type="text"
              placeholder="Buscar por nome, WhatsApp ou CPF..."
              value={clientName}
              autoComplete="off"
              readOnly={isClientReadOnly}
              onFocus={onFocusClient}
              onBlur={onBlurClient}
              onChange={(event) => onChangeClientName(event.target.value)}
              className={`${inputWithIconClass} ${isClientReadOnly ? "pr-12 bg-stone-100 text-gray-600" : ""}`}
              required
            />
            {!isEditing && isClientReadOnly && (
              <button
                type="button"
                onClick={onClearSelectedClient}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-stone-200 text-gray-500 hover:text-red-500 hover:border-red-200 flex items-center justify-center"
                aria-label="Limpar cliente selecionado"
                title="Limpar cliente selecionado"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {!isEditing && isClientDropdownOpen && clientName.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-2 rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
                {filteredClients.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto p-1.5">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelectClient(client)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-50 text-sm text-gray-700 flex items-center justify-between gap-3"
                      >
                        <span className="font-medium truncate">{client.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {client.cpf && (
                            <span className="text-[10px] text-muted hidden sm:inline">
                              CPF {formatCpf(client.cpf)}
                            </span>
                          )}
                          {client.phone && (
                            <span className="text-xs text-muted">{formatBrazilPhone(client.phone)}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-1.5">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={onCreateNewClientFromName}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-50"
                    >
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">
                        Cadastrar cliente
                      </p>
                      <p className="text-sm font-semibold text-studio-text truncate">{clientName.trim()}</p>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted mt-2 ml-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {isEditing
              ? "Atualize o cliente e os dados de contato se necessário."
              : "Digite nome, WhatsApp ou CPF para localizar um cliente. Se não encontrar, cadastre um novo."}
          </p>
          {isClientSelectionPending && clientName.trim().length > 0 && (
            <p className="text-[11px] text-amber-700 mt-2 ml-1">
              Selecione um cliente da lista suspensa ou toque em <strong>Cadastrar cliente</strong>.
            </p>
          )}
        </div>

        {shouldShowClientContactFields && (
          <>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={clientPhoneInputRef}
                  name="clientPhone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(event) => onChangeClientPhone(event.target.value)}
                  inputMode="numeric"
                  readOnly={isClientPhoneReadOnly}
                  className={`${inputWithIconClass} ${isClientPhoneReadOnly ? "bg-stone-100 text-gray-600" : ""}`}
                />
              </div>
              {missingWhatsappWarning ? (
                <p className="text-[11px] text-red-600 mt-2 ml-1">
                  Sem WhatsApp não será possível enviar mensagens automáticas para este cliente.
                </p>
              ) : (
                <p className="text-[11px] text-muted mt-2 ml-1">
                  Usado para automações e mensagens rápidas do atendimento.
                </p>
              )}
            </div>

            {shouldShowCpfField && (
              <div>
                <label className={labelClass}>CPF (Opcional)</label>
                <input
                  ref={clientCpfInputRef}
                  name="client_cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={clientCpf}
                  onChange={(event) => onChangeClientCpf(event.target.value)}
                  readOnly={isExistingClientCpfLocked}
                  className={`${inputClass} ${isExistingClientCpfLocked ? "bg-stone-100 text-gray-600" : ""}`}
                />
                {duplicateCpfClient && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                      CPF já cadastrado
                    </p>
                    <p className="text-sm font-semibold text-amber-900 mt-1 leading-snug">
                      Este CPF já está cadastrado para <strong>{duplicateCpfClient.name}</strong>.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={onLinkExistingClientByCpf}
                        className="w-full h-10 rounded-xl bg-amber-600 text-white text-[11px] font-extrabold uppercase tracking-wide"
                      >
                        Vincular ao cliente existente
                      </button>
                      <button
                        type="button"
                        onClick={onChangeCpfAfterConflict}
                        className="w-full h-10 rounded-xl border border-amber-300 bg-white text-amber-800 text-[11px] font-extrabold uppercase tracking-wide"
                      >
                        Informar novo CPF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
