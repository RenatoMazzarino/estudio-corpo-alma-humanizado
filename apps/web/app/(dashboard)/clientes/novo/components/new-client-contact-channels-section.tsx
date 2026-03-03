"use client";

import { Mail, Phone, Plus, Trash2 } from "lucide-react";
import { formatBrazilPhone } from "../../../../../src/shared/phone";
import type { EmailEntry, PhoneEntry } from "./new-client.types";

type NewClientContactChannelsSectionProps = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  createId: () => string;
  onChangePhones: (next: PhoneEntry[]) => void;
  onChangeEmails: (next: EmailEntry[]) => void;
  onSetPhonePrimary: (id: string) => void;
  onSetPhoneWhatsapp: (id: string) => void;
  onSetEmailPrimary: (id: string) => void;
};

export function NewClientContactChannelsSection({
  phones,
  emails,
  createId,
  onChangePhones,
  onChangeEmails,
  onSetPhonePrimary,
  onSetPhoneWhatsapp,
  onSetEmailPrimary,
}: NewClientContactChannelsSectionProps) {
  return (
    <>
      <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Contato</p>
            <h2 className="text-lg font-serif text-studio-text">Telefones</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangePhones([...phones, { id: createId(), label: "Outro", number: "", isPrimary: false, isWhatsapp: false }])
            }
            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
            aria-label="Adicionar telefone"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {phones.map((phone) => (
          <div key={phone.id} className="border border-line rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted" />
              <input
                value={phone.number}
                onChange={(event) =>
                  onChangePhones(
                    phones.map((item) =>
                      item.id === phone.id ? { ...item, number: formatBrazilPhone(event.target.value) } : item
                    )
                  )
                }
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-sm"
              />
              <button
                type="button"
                onClick={() => onChangePhones(phones.filter((item) => item.id !== phone.id))}
                className="text-muted hover:text-danger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={phone.label}
                onChange={(event) =>
                  onChangePhones(
                    phones.map((item) => (item.id === phone.id ? { ...item, label: event.target.value } : item))
                  )
                }
                placeholder="Etiqueta"
                className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => onSetPhonePrimary(phone.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                  phone.isPrimary ? "bg-studio-green text-white border-studio-green" : "bg-white text-muted border-line"
                }`}
              >
                Principal
              </button>
              <button
                type="button"
                onClick={() => onSetPhoneWhatsapp(phone.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                  phone.isWhatsapp ? "bg-studio-green text-white border-studio-green" : "bg-white text-muted border-line"
                }`}
              >
                WhatsApp
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Contato</p>
            <h2 className="text-lg font-serif text-studio-text">Emails</h2>
          </div>
          <button
            type="button"
            onClick={() => onChangeEmails([...emails, { id: createId(), label: "Outro", email: "", isPrimary: false }])}
            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
            aria-label="Adicionar email"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {emails.map((email) => (
          <div key={email.id} className="border border-line rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted" />
              <input
                value={email.email}
                onChange={(event) =>
                  onChangeEmails(
                    emails.map((item) => (item.id === email.id ? { ...item, email: event.target.value } : item))
                  )
                }
                placeholder="email@cliente.com"
                className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-sm"
              />
              <button
                type="button"
                onClick={() => onChangeEmails(emails.filter((item) => item.id !== email.id))}
                className="text-muted hover:text-danger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={email.label}
                onChange={(event) =>
                  onChangeEmails(
                    emails.map((item) => (item.id === email.id ? { ...item, label: event.target.value } : item))
                  )
                }
                placeholder="Etiqueta"
                className="flex-1 px-3 py-2 rounded-xl bg-paper border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => onSetEmailPrimary(email.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${
                  email.isPrimary ? "bg-studio-green text-white border-studio-green" : "bg-white text-muted border-line"
                }`}
              >
                Principal
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
