"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronDown, Eye, MessageCircle, Phone, User } from "lucide-react";

import { Chip } from "../../../../components/ui/chip";
import {
  buildClientPhoneHref,
  buildClientWhatsAppHref,
  buildNewAppointmentHref,
} from "../../../../src/modules/clients/contact-links";

type ClientListAccordionItemProps = {
  client: {
    id: string;
    name: string;
    initials: string | null;
    is_vip: boolean;
    needs_attention: boolean;
  };
  expanded: boolean;
  lastVisitLabel: string;
  primaryPhoneRaw: string | null;
  whatsappPhoneRaw: string | null;
  phoneCount: number;
  onToggleAction: () => void;
};

export function ClientListAccordionItem({
  client,
  expanded,
  lastVisitLabel,
  primaryPhoneRaw,
  whatsappPhoneRaw,
  phoneCount,
  onToggleAction,
}: ClientListAccordionItemProps) {
  const callHref = buildClientPhoneHref(primaryPhoneRaw);
  const whatsappHref = buildClientWhatsAppHref(whatsappPhoneRaw);
  const scheduleHref = buildNewAppointmentHref(client.id, "/clientes");

  return (
    <div className={`mx-3 my-2 overflow-hidden rounded-[28px] border transition ${expanded ? "border-studio-green/18 bg-studio-light/45" : "border-line bg-white"}`}>
      <button
        type="button"
        onClick={onToggleAction}
        className="flex w-full items-center gap-4 px-3 py-3 text-left transition hover:bg-studio-light/35 active:scale-[0.995]"
        aria-expanded={expanded}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-studio-light text-sm font-serif font-bold text-studio-green">
          {client.initials || <User className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-extrabold text-studio-text">{client.name}</h4>
            {client.is_vip && <Chip tone="success">VIP</Chip>}
            {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
            <span>Última visita: {lastVisitLabel}</span>
            {(primaryPhoneRaw || phoneCount > 0) && <span aria-hidden="true">•</span>}
            {primaryPhoneRaw ? (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-muted">
                {primaryPhoneRaw}
              </span>
            ) : phoneCount > 0 ? (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-muted">
                {phoneCount} contato(s)
              </span>
            ) : null}
          </div>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-muted transition ${
            expanded ? "rotate-180 text-studio-green" : ""
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-200 ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-studio-green/10 px-3 pb-3 pt-2.5">
            <div className="flex items-center gap-3">
              <QuickIconAction
                href={callHref}
                icon={<Phone className="h-4 w-4" />}
                label="Ligar para o cliente"
                tone="default"
              />
              <QuickIconAction
                href={whatsappHref}
                icon={<MessageCircle className="h-4 w-4" />}
                label="Abrir conversa no WhatsApp"
                tone="green"
                external
              />
              <QuickIconAction
                href={scheduleHref}
                icon={<CalendarPlus className="h-4 w-4" />}
                label="Agendar para este cliente"
                tone="green"
              />
              <QuickIconAction
                href={`/clientes/${client.id}`}
                icon={<Eye className="h-4 w-4" />}
                label="Ver mais dados do cliente"
                tone="default"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type QuickIconActionProps = {
  href: string | null;
  icon: ReactNode;
  label: string;
  tone: "default" | "green";
  external?: boolean;
};

function QuickIconAction({ href, icon, label, tone, external = false }: QuickIconActionProps) {
  const className = `flex h-11 w-11 items-center justify-center rounded-2xl border transition active:scale-95 ${
    tone === "green"
      ? "border-studio-green/15 bg-white text-studio-green hover:bg-studio-green hover:text-white"
      : "border-line bg-white text-studio-text hover:bg-paper"
  }`;

  if (!href) {
    return (
      <span className={`${className} cursor-not-allowed opacity-35`} aria-label={`${label} indisponível`}>
        {icon}
      </span>
    );
  }

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} aria-label={label} title={label} prefetch={false}>
        {icon}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={label}
      title={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {icon}
    </a>
  );
}
