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
    <div className="wl-surface-card overflow-hidden">
      <button
        type="button"
        onClick={onToggleAction}
        className="wl-surface-card-header flex h-12 w-full items-center gap-3 border-b border-line px-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-xs font-bold uppercase text-studio-green">
          {client.initials || <User className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="wl-typo-card-name-sm truncate text-studio-text">{client.name}</p>
            {client.is_vip ? <Chip tone="success">VIP</Chip> : null}
            {client.needs_attention ? <Chip tone="danger">Atencao</Chip> : null}
          </div>
          <p className="wl-typo-body-sm truncate text-muted">
            Ultima visita: {lastVisitLabel}
            {primaryPhoneRaw || phoneCount > 0 ? ` - ${primaryPhoneRaw ?? `${phoneCount} contato(s)`}` : ""}
          </p>
        </div>

        <span
          className={`wl-header-icon-button-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-200 ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="wl-surface-card-body grid grid-cols-4 gap-2 px-3 py-3">
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
              label="Ver dados completos do cliente"
              tone="default"
            />
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
  const className = `inline-flex h-10 w-full items-center justify-center rounded-xl border transition active:scale-95 ${
    tone === "green"
      ? "border-studio-green/20 bg-white text-studio-green hover:bg-studio-green hover:text-white"
      : "border-line bg-white text-studio-text hover:bg-paper"
  }`;

  if (!href) {
    return (
      <span className={`${className} cursor-not-allowed opacity-35`} aria-label={`${label} indisponivel`}>
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

