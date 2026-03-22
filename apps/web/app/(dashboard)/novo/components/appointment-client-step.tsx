"use client";

import type { RefObject } from "react";
import { Phone, Search, Sparkles, Trash2 } from "lucide-react";
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
  clientEmail: string;
  clientReference: string;
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
  onFocusClientAction: () => void;
  onBlurClientAction: () => void;
  onChangeClientNameAction: (value: string) => void;
  onClearSelectedClientAction: () => void;
  onSelectClientAction: (client: ClientLite) => void;
  onCreateNewClientFromNameAction: () => void;
  onChangeClientPhoneAction: (value: string) => void;
  onChangeClientCpfAction: (value: string) => void;
  onLinkExistingClientByCpfAction: () => void;
  onChangeCpfAfterConflictAction: () => void;
};

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-semibold text-studio-text text-right">{value || "--"}</span>
    </div>
  );
}

export function AppointmentClientStep({
  sectionCardClass,
  sectionNumberClass,
  sectionHeaderTextClass,
  labelClass,
  inputWithIconClass,
  inputClass,
  isEditing,
  clientName,
  clientEmail,
  clientReference,
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
  onFocusClientAction,
  onBlurClientAction,
  onChangeClientNameAction,
  onClearSelectedClientAction,
  onSelectClientAction,
  onCreateNewClientFromNameAction,
  onChangeClientPhoneAction,
  onChangeClientCpfAction,
  onLinkExistingClientByCpfAction,
  onChangeCpfAfterConflictAction,
}: AppointmentClientStepProps) {
  const showClientLookup = !isClientReadOnly;
  const clientTitle = isClientReadOnly && clientName?.trim().length > 0 ? `Cliente: ${clientName}` : "Cliente";

  return (
    <section className={`${sectionCardClass} overflow-hidden`}>
      <div className="flex h-11 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header">
        <div className="flex min-w-0 items-center gap-2">
          <div className={sectionNumberClass}>1</div>
          <h2 className={`${sectionHeaderTextClass} leading-none truncate`}>{clientTitle}</h2>
        </div>

        {isClientReadOnly && !isEditing ? (
          <button
            type="button"
            onClick={onClearSelectedClientAction}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-studio-green transition hover:bg-paper"
            aria-label="Remover cliente selecionado"
            title="Remover cliente selecionado"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4 wl-surface-card-body">
        {showClientLookup ? (
          <div>
            <label className={labelClass}>Cliente</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                name="clientName"
                type="text"
                placeholder="Buscar por nome, WhatsApp ou CPF..."
                value={clientName}
                autoComplete="off"
                readOnly={isClientReadOnly}
                onFocus={onFocusClientAction}
                onBlur={onBlurClientAction}
                onChange={(event) => onChangeClientNameAction(event.target.value)}
                className={inputWithIconClass}
                required
              />

              {!isEditing && isClientDropdownOpen && clientName.trim().length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                  {filteredClients.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onSelectClientAction(client)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-stone-50"
                        >
                          <span className="truncate font-medium">{client.name}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            {client.cpf ? (
                              <span className="hidden text-[10px] text-muted sm:inline">CPF {formatCpf(client.cpf)}</span>
                            ) : null}
                            {client.phone ? <span className="text-xs text-muted">{formatBrazilPhone(client.phone)}</span> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-1.5">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={onCreateNewClientFromNameAction}
                        className="w-full rounded-xl px-3 py-2 text-left hover:bg-stone-50"
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">Cadastrar cliente</p>
                        <p className="truncate text-sm font-semibold text-studio-text">{clientName.trim()}</p>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <p className="ml-1 mt-2 flex items-center gap-1 text-[11px] text-muted">
              <Sparkles className="h-3 w-3" />
              {isEditing
                ? "Atualize o cliente e os dados de contato se necessario."
                : "Digite nome, WhatsApp ou CPF para localizar um cliente. Se nao encontrar, cadastre um novo."}
            </p>
            {isClientSelectionPending && clientName.trim().length > 0 ? (
              <p className="ml-1 mt-2 text-[11px] text-amber-700">
                Selecione um cliente da lista suspensa ou toque em <strong>Cadastrar cliente</strong>.
              </p>
            ) : null}
          </div>
        ) : null}

        {isClientReadOnly ? (
          <div className="px-0.5">
            <SummaryLine label="WhatsApp" value={clientPhone || "--"} />
            <SummaryLine label="Email" value={clientEmail || "--"} />
            <SummaryLine label="CPF" value={clientCpf ? formatCpf(clientCpf) : "--"} />
            <SummaryLine label="Referencia" value={clientReference || "--"} />
          </div>
        ) : null}

        {shouldShowClientContactFields && !isClientReadOnly ? (
          <>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={clientPhoneInputRef}
                  name="clientPhone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(event) => onChangeClientPhoneAction(event.target.value)}
                  inputMode="numeric"
                  readOnly={isClientPhoneReadOnly}
                  className={`${inputWithIconClass} ${isClientPhoneReadOnly ? "bg-stone-100 text-gray-600" : ""}`}
                />
              </div>
              {missingWhatsappWarning ? (
                <p className="ml-1 mt-2 text-[11px] text-red-600">
                  Sem WhatsApp nao sera possivel enviar mensagens automaticas para este cliente.
                </p>
              ) : (
                <p className="ml-1 mt-2 text-[11px] text-muted">Usado para automacoes e mensagens rapidas do atendimento.</p>
              )}
            </div>

            {shouldShowCpfField ? (
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
                  onChange={(event) => onChangeClientCpfAction(event.target.value)}
                  readOnly={isExistingClientCpfLocked}
                  className={`${inputClass} ${isExistingClientCpfLocked ? "bg-stone-100 text-gray-600" : ""}`}
                />
                {duplicateCpfClient ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">CPF ja cadastrado</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-amber-900">
                      Este CPF ja esta cadastrado para <strong>{duplicateCpfClient.name}</strong>.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={onLinkExistingClientByCpfAction}
                        className="h-10 w-full rounded-xl bg-amber-600 text-[11px] font-extrabold uppercase tracking-wide text-white"
                      >
                        Vincular ao cliente existente
                      </button>
                      <button
                        type="button"
                        onClick={onChangeCpfAfterConflictAction}
                        className="h-10 w-full rounded-xl border border-amber-300 bg-white text-[11px] font-extrabold uppercase tracking-wide text-amber-800"
                      >
                        Informar novo CPF
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
