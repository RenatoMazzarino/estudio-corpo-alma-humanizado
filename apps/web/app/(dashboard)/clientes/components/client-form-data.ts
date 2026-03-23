import {
  resolveClientNames,
} from "../../../../src/modules/clients/name-profile";
import type { ClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";
import type {
  AddressEntry,
  AnamneseFormStatus,
  ClinicalItemFormEntry,
  EmailEntry,
  PhoneEntry,
} from "../novo/components/new-client.types";

export type ClientFormInitialData = {
  clientId: string | null;
  clientCode: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  publicName: string;
  reference: string;
  birthDate: string;
  cpf: string;
  isVip: boolean;
  needsAttention: boolean;
  marketingOptIn: boolean;
  isMinor: boolean;
  isMinorOverride: boolean | null;
  guardianName: string;
  guardianPhone: string;
  guardianCpf: string;
  guardianRelationship: string;
  preferencesNotes: string;
  contraindications: string;
  clinicalHistory: string;
  anamneseUrl: string;
  anamneseFormStatus: AnamneseFormStatus;
  anamneseFormSentAt: string;
  anamneseFormAnsweredAt: string;
  observacoesGerais: string;
  profissao: string;
  comoConheceu: string;
  allergyTags: string[];
  conditionTags: string[];
  contraindicationTags: string[];
  allergyItems: ClinicalItemFormEntry[];
  conditionItems: ClinicalItemFormEntry[];
  contraindicationItems: ClinicalItemFormEntry[];
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: AddressEntry[];
};

export function createDefaultPhoneEntry(): PhoneEntry {
  return {
    id: "phone-primary",
    label: "principal",
    number: "",
    isPrimary: true,
    isWhatsapp: true,
  };
}

export function createDefaultEmailEntry(): EmailEntry {
  return {
    id: "email-primary",
    label: "principal",
    email: "",
    isPrimary: true,
  };
}

export function createDefaultAddressEntry(): AddressEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `address-${Date.now()}-${Math.random()}`,
    label: "principal",
    isPrimary: true,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffsetInMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16);
}

function toAnamneseFormStatus(value?: string | null): AnamneseFormStatus {
  if (value === "enviado" || value === "respondido") return value;
  return "nao_enviado";
}

function createClinicalItemEntry(
  id: string,
  label: string,
  notes?: string | null,
  severity?: string | null,
  isActive?: boolean | null
): ClinicalItemFormEntry {
  const normalizedSeverity =
    severity === "leve" || severity === "moderada" || severity === "alta" ? severity : null;
  return {
    id,
    label,
    notes: notes ?? "",
    severity: normalizedSeverity,
    isActive: isActive ?? true,
  };
}

export function createEmptyClientFormInitialData(): ClientFormInitialData {
  return {
    clientId: null,
    clientCode: "",
    avatarUrl: null,
    firstName: "",
    lastName: "",
    publicName: "",
    reference: "",
    birthDate: "",
    cpf: "",
    isVip: false,
    needsAttention: false,
    marketingOptIn: false,
    isMinor: false,
    isMinorOverride: null,
    guardianName: "",
    guardianPhone: "",
    guardianCpf: "",
    guardianRelationship: "",
    preferencesNotes: "",
    contraindications: "",
    clinicalHistory: "",
    anamneseUrl: "",
    anamneseFormStatus: "nao_enviado",
    anamneseFormSentAt: "",
    anamneseFormAnsweredAt: "",
    observacoesGerais: "",
    profissao: "",
    comoConheceu: "",
    allergyTags: [],
    conditionTags: [],
    contraindicationTags: [],
    allergyItems: [],
    conditionItems: [],
    contraindicationItems: [],
    phones: [createDefaultPhoneEntry()],
    emails: [createDefaultEmailEntry()],
    addresses: [createDefaultAddressEntry()],
  };
}

export function createClientFormInitialDataFromSnapshot(
  snapshot: ClientDetailSnapshot
): ClientFormInitialData {
  const names = resolveClientNames({
    name: snapshot.client.name,
    publicFirstName: snapshot.client.public_first_name,
    publicLastName: snapshot.client.public_last_name,
    internalReference: snapshot.client.internal_reference,
  });

  const phones: PhoneEntry[] =
    snapshot.phones.length > 0
      ? snapshot.phones.map((phone, index) => ({
          id: phone.id || `phone-${index}`,
          label: (phone.label as PhoneEntry["label"]) || (index === 0 ? "principal" : "outro"),
          number: phone.number_raw || "",
          isPrimary: phone.is_primary ?? index === 0,
          isWhatsapp: phone.is_whatsapp ?? false,
        }))
      : [createDefaultPhoneEntry()];

  const emails: EmailEntry[] =
    snapshot.emails.length > 0
      ? snapshot.emails.map((email, index) => ({
          id: email.id || `email-${index}`,
          label: (email.label as EmailEntry["label"]) || (index === 0 ? "principal" : "outro"),
          email: email.email || "",
          isPrimary: email.is_primary ?? index === 0,
        }))
      : [
          {
            ...createDefaultEmailEntry(),
            email: snapshot.client.email || "",
          },
        ];

  const addresses: AddressEntry[] =
    snapshot.addresses.length > 0
      ? snapshot.addresses.map((address, index) => ({
          id: address.id || `address-${index}`,
          label: (address.label as AddressEntry["label"]) || (index === 0 ? "principal" : "outro"),
          isPrimary: address.is_primary ?? index === 0,
          cep: address.address_cep || "",
          logradouro: address.address_logradouro || "",
          numero: address.address_numero || "",
          complemento: address.address_complemento || "",
          bairro: address.address_bairro || "",
          cidade: address.address_cidade || "",
          estado: address.address_estado || "",
        }))
      : [
          {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `address-${Date.now()}-${Math.random()}`,
            label: "principal",
            isPrimary: true,
            cep: snapshot.client.address_cep || "",
            logradouro: snapshot.client.address_logradouro || "",
            numero: snapshot.client.address_numero || "",
            complemento: snapshot.client.address_complemento || "",
            bairro: snapshot.client.address_bairro || "",
            cidade: snapshot.client.address_cidade || "",
            estado: snapshot.client.address_estado || "",
          },
        ];

  const allergyTags = snapshot.healthItems
    .filter((item) => item.type === "allergy")
    .map((item) => item.label)
    .filter(Boolean);
  const allergyItems = snapshot.healthItems
    .filter((item) => item.type === "allergy")
    .map((item, index) =>
      createClinicalItemEntry(item.id || `allergy-${index}`, item.label, item.notes, item.severity, item.is_active)
    )
    .filter((item) => item.label.trim().length > 0);
  const allergySet = new Set(allergyTags.map((tag) => tag.trim().toLowerCase()));

  const conditionSet = new Set(
    snapshot.healthItems
      .filter((item) => item.type === "condition" || item.type === "tag")
      .map((item) => item.label)
      .filter(Boolean)
  );
  const conditionItems = snapshot.healthItems
    .filter((item) => item.type === "condition" || item.type === "tag")
    .map((item, index) =>
      createClinicalItemEntry(item.id || `condition-${index}`, item.label, item.notes, item.severity, item.is_active)
    )
    .filter((item) => item.label.trim().length > 0);
  const contraindicationTags = snapshot.healthItems
    .filter((item) => item.type === "contraindication")
    .map((item) => item.label)
    .filter(Boolean);
  const contraindicationItems = snapshot.healthItems
    .filter((item) => item.type === "contraindication")
    .map((item, index) =>
      createClinicalItemEntry(
        item.id || `contraindication-${index}`,
        item.label,
        item.notes,
        item.severity,
        item.is_active
      )
    )
    .filter((item) => item.label.trim().length > 0);
  if (snapshot.client.contraindications) {
    const contraindicationsFromLegacy = snapshot.client.contraindications
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    for (const tag of contraindicationsFromLegacy) {
      if (!contraindicationTags.includes(tag)) contraindicationTags.push(tag);
      if (!contraindicationItems.some((item) => item.label.toLowerCase() === tag.toLowerCase())) {
        contraindicationItems.push(
          createClinicalItemEntry(
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `contraindication-legacy-${tag}`,
            tag,
            null,
            null,
            true
          )
        );
      }
    }
  }

  for (const tag of snapshot.client.health_tags ?? []) {
    const normalizedTag = tag?.trim();
    if (!normalizedTag) continue;
    if (allergySet.has(normalizedTag.toLowerCase())) continue;
    conditionSet.add(normalizedTag);
    if (!conditionItems.some((item) => item.label.toLowerCase() === normalizedTag.toLowerCase())) {
      conditionItems.push(
        createClinicalItemEntry(
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `condition-health-tag-${normalizedTag}`,
          normalizedTag,
          null,
          null,
          true
        )
      );
    }
  }

  return {
    clientId: snapshot.client.id,
    clientCode: snapshot.client.client_code ?? "",
    avatarUrl: snapshot.client.avatar_url || null,
    firstName: names.publicFirstName,
    lastName: names.publicLastName,
    publicName:
      snapshot.client.public_name ??
      [names.publicFirstName, names.publicLastName].filter(Boolean).join(" "),
    reference: names.reference,
    birthDate: snapshot.client.birth_date ?? snapshot.client.data_nascimento ?? "",
    cpf: snapshot.client.cpf ?? "",
    isVip: snapshot.client.is_vip ?? false,
    needsAttention: snapshot.client.needs_attention ?? false,
    marketingOptIn: snapshot.client.marketing_opt_in ?? false,
    isMinor: snapshot.client.is_minor ?? false,
    isMinorOverride: snapshot.client.is_minor_override ?? null,
    guardianName: snapshot.client.guardian_name ?? "",
    guardianPhone: snapshot.client.guardian_phone ?? "",
    guardianCpf: snapshot.client.guardian_cpf ?? "",
    guardianRelationship: snapshot.client.guardian_relationship ?? "",
    preferencesNotes: snapshot.client.preferences_notes ?? "",
    contraindications: snapshot.client.contraindications ?? "",
    clinicalHistory: snapshot.client.clinical_history ?? "",
    anamneseUrl: snapshot.client.anamnese_url ?? "",
    anamneseFormStatus: toAnamneseFormStatus(snapshot.client.anamnese_form_status),
    anamneseFormSentAt: toDateTimeLocalValue(snapshot.client.anamnese_form_sent_at),
    anamneseFormAnsweredAt: toDateTimeLocalValue(snapshot.client.anamnese_form_answered_at),
    observacoesGerais: snapshot.client.observacoes_gerais ?? "",
    profissao: snapshot.client.profissao ?? "",
    comoConheceu: snapshot.client.como_conheceu ?? "",
    allergyTags,
    conditionTags: Array.from(conditionSet),
    contraindicationTags,
    allergyItems,
    conditionItems,
    contraindicationItems,
    phones,
    emails,
    addresses,
  };
}
