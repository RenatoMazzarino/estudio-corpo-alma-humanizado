"use client";

import { Mail, Phone, Plus, Trash2 } from "lucide-react";
import {
  appointmentFormHeaderIconButtonClass,
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";
import { formatBrazilPhone } from "../../../../../src/shared/phone";
import type { EmailEntry, PhoneEntry } from "./new-client.types";

type NewClientContactChannelsSectionProps = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  createIdAction: () => string;
  onChangePhonesAction: (next: PhoneEntry[]) => void;
  onChangeEmailsAction: (next: EmailEntry[]) => void;
  onSetPhonePrimaryAction: (id: string) => void;
  onSetPhoneWhatsappAction: (id: string) => void;
  onSetEmailPrimaryAction: (id: string) => void;
};

export function NewClientContactChannelsSection({
  phones,
  emails,
  createIdAction,
  onChangePhonesAction,
  onChangeEmailsAction,
  onSetPhonePrimaryAction,
  onSetPhoneWhatsappAction,
  onSetEmailPrimaryAction,
}: NewClientContactChannelsSectionProps) {
  return (
    <>
      <section className="wl-surface-card overflow-hidden">
        <div className={appointmentFormSectionHeaderPrimaryClass}>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-studio-green" />
            <h3 className={appointmentFormSectionHeaderTextClass}>Telefones</h3>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangePhonesAction([
                ...phones,
                { id: createIdAction(), label: "outro", number: "", isPrimary: false, isWhatsapp: false },
              ])
            }
            className={appointmentFormHeaderIconButtonClass}
            aria-label="Adicionar telefone"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          {phones.map((phone) => (
            <div key={phone.id} className="space-y-2 rounded-xl border border-line wl-surface-card-body p-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted" />
                <input
                  value={phone.number}
                  onChange={(event) =>
                    onChangePhonesAction(
                      phones.map((item) =>
                        item.id === phone.id ? { ...item, number: formatBrazilPhone(event.target.value) } : item
                      )
                    )
                  }
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  className="flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChangePhonesAction(phones.filter((item) => item.id !== phone.id))}
                  className={appointmentFormHeaderIconButtonClass}
                  aria-label="Remover telefone"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={phone.label}
                  onChange={(event) =>
                    onChangePhonesAction(
                      phones.map((item) =>
                        item.id === phone.id ? { ...item, label: event.target.value as PhoneEntry["label"] } : item
                      )
                    )
                  }
                  className="min-w-[136px] flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-xs"
                >
                  <option value="principal">Principal</option>
                  <option value="recado">Recado</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="outro">Outro</option>
                </select>

                <label
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    phone.isPrimary ? "border-studio-green bg-studio-green text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={phone.isPrimary}
                    onChange={(event) => {
                      if (event.target.checked) onSetPhonePrimaryAction(phone.id);
                    }}
                    className="h-4 w-4 accent-[var(--color-studio-green)]"
                  />
                  Principal
                </label>

                <button
                  type="button"
                  onClick={() => onSetPhoneWhatsappAction(phone.id)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    phone.isWhatsapp ? "border-studio-green bg-studio-green text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wl-surface-card overflow-hidden">
        <div className={appointmentFormSectionHeaderPrimaryClass}>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-studio-green" />
            <h3 className={appointmentFormSectionHeaderTextClass}>Emails</h3>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeEmailsAction([...emails, { id: createIdAction(), label: "outro", email: "", isPrimary: false }])
            }
            className={appointmentFormHeaderIconButtonClass}
            aria-label="Adicionar email"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          {emails.map((email) => (
            <div key={email.id} className="space-y-2 rounded-xl border border-line wl-surface-card-body p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted" />
                <input
                  value={email.email}
                  onChange={(event) =>
                    onChangeEmailsAction(
                      emails.map((item) => (item.id === email.id ? { ...item, email: event.target.value } : item))
                    )
                  }
                  placeholder="email@cliente.com"
                  className="flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChangeEmailsAction(emails.filter((item) => item.id !== email.id))}
                  className={appointmentFormHeaderIconButtonClass}
                  aria-label="Remover email"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={email.label}
                  onChange={(event) =>
                    onChangeEmailsAction(
                      emails.map((item) =>
                        item.id === email.id ? { ...item, label: event.target.value as EmailEntry["label"] } : item
                      )
                    )
                  }
                  className="min-w-[136px] flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-xs"
                >
                  <option value="principal">Principal</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="outro">Outro</option>
                </select>

                <label
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    email.isPrimary ? "border-studio-green bg-studio-green text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={email.isPrimary}
                    onChange={(event) => {
                      if (event.target.checked) onSetEmailPrimaryAction(email.id);
                    }}
                    className="h-4 w-4 accent-[var(--color-studio-green)]"
                  />
                  Principal
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
