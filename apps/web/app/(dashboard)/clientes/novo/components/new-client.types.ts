export type PhoneLabel = "principal" | "recado" | "trabalho" | "outro";
export type EmailLabel = "principal" | "trabalho" | "outro";
export type AddressLabel = "principal" | "casa" | "trabalho" | "outro";
export type AnamneseFormStatus = "nao_enviado" | "enviado" | "respondido";
export type ClinicalItemSeverity = "leve" | "moderada" | "alta" | null;

export interface ClinicalItemFormEntry {
  id: string;
  label: string;
  notes: string;
  severity: ClinicalItemSeverity;
  isActive: boolean;
}

export interface PhoneEntry {
  id: string;
  label: PhoneLabel;
  number: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
}

export interface EmailEntry {
  id: string;
  label: EmailLabel;
  email: string;
  isPrimary: boolean;
}

export interface AddressEntry {
  id: string;
  label: AddressLabel;
  isPrimary: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}
