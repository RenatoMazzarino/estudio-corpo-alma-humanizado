"use client";

import { Mail, Phone, Plus, Trash2 } from "lucide-react";
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
        <div className="flex h-10 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header">
          <p className="wl-typo-card-name-sm font-bold text-studio-text">Telefones</p>
          <button
            type="button"
            onClick={() =>
              onChangePhonesAction([
                ...phones,
                { id: createIdAction(), label: "Outro", number: "", isPrimary: false, isWhatsapp: false },
              ])
            }
            className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
            aria-label="Adicionar telefone"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          {phones.map((phone) => (
            <div key={phone.id} className="rounded-xl border border-line wl-surface-card-body p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted" />
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
                  className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={phone.label}
                  onChange={(event) =>
                    onChangePhonesAction(
                      phones.map((item) => (item.id === phone.id ? { ...item, label: event.target.value } : item))
                    )
                  }
                  placeholder="Etiqueta"
                  className="min-w-[136px] flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => onSetPhonePrimaryAction(phone.id)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    phone.isPrimary ? "border-studio-green bg-studio-green text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  Principal
                </button>
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
        <div className="flex h-10 items-center justify-between gap-2 border-b border-line px-3 wl-surface-card-header">
          <p className="wl-typo-card-name-sm font-bold text-studio-text">Emails</p>
          <button
            type="button"
            onClick={() =>
              onChangeEmailsAction([...emails, { id: createIdAction(), label: "Outro", email: "", isPrimary: false }])
            }
            className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
            aria-label="Adicionar email"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          {emails.map((email) => (
            <div key={email.id} className="rounded-xl border border-line wl-surface-card-body p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted" />
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
                  className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={email.label}
                  onChange={(event) =>
                    onChangeEmailsAction(
                      emails.map((item) => (item.id === email.id ? { ...item, label: event.target.value } : item))
                    )
                  }
                  placeholder="Etiqueta"
                  className="min-w-[136px] flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => onSetEmailPrimaryAction(email.id)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    email.isPrimary ? "border-studio-green bg-studio-green text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  Principal
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
