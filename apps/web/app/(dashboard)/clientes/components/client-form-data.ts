import {
  resolveClientNames,
} from "../../../../src/modules/clients/name-profile";
import type { ClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";
import type { AddressEntry, EmailEntry, PhoneEntry } from "../novo/components/new-client.types";

export type ClientFormInitialData = {
  clientId: string | null;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  reference: string;
  birthDate: string;
  cpf: string;
  isVip: boolean;
  needsAttention: boolean;
  marketingOptIn: boolean;
  isMinor: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianCpf: string;
  preferencesNotes: string;
  contraindications: string;
  clinicalHistory: string;
  anamneseUrl: string;
  observacoesGerais: string;
  profissao: string;
  comoConheceu: string;
  allergyTags: string[];
  conditionTags: string[];
  phones: PhoneEntry[];
  emails: EmailEntry[];
  address: AddressEntry;
};

export function createDefaultPhoneEntry(): PhoneEntry {
  return {
    id: "phone-primary",
    label: "Principal",
    number: "",
    isPrimary: true,
    isWhatsapp: true,
  };
}

export function createDefaultEmailEntry(): EmailEntry {
  return {
    id: "email-primary",
    label: "Principal",
    email: "",
    isPrimary: true,
  };
}

export function createDefaultAddressEntry(): AddressEntry {
  return {
    label: "Principal",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
}

export function createEmptyClientFormInitialData(): ClientFormInitialData {
  return {
    clientId: null,
    avatarUrl: null,
    firstName: "",
    lastName: "",
    reference: "",
    birthDate: "",
    cpf: "",
    isVip: false,
    needsAttention: false,
    marketingOptIn: false,
    isMinor: false,
    guardianName: "",
    guardianPhone: "",
    guardianCpf: "",
    preferencesNotes: "",
    contraindications: "",
    clinicalHistory: "",
    anamneseUrl: "",
    observacoesGerais: "",
    profissao: "",
    comoConheceu: "",
    allergyTags: [],
    conditionTags: [],
    phones: [createDefaultPhoneEntry()],
    emails: [createDefaultEmailEntry()],
    address: createDefaultAddressEntry(),
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
          label: phone.label || (index === 0 ? "Principal" : "Outro"),
          number: phone.number_raw || "",
          isPrimary: phone.is_primary ?? index === 0,
          isWhatsapp: phone.is_whatsapp ?? false,
        }))
      : [createDefaultPhoneEntry()];

  const emails: EmailEntry[] =
    snapshot.emails.length > 0
      ? snapshot.emails.map((email, index) => ({
          id: email.id || `email-${index}`,
          label: email.label || (index === 0 ? "Principal" : "Outro"),
          email: email.email || "",
          isPrimary: email.is_primary ?? index === 0,
        }))
      : [
          {
            ...createDefaultEmailEntry(),
            email: snapshot.client.email || "",
          },
        ];

  const primaryAddress = snapshot.addresses.find((address) => address.is_primary) ?? snapshot.addresses[0] ?? null;
  const address: AddressEntry = {
    label: primaryAddress?.label || "Principal",
    cep: primaryAddress?.address_cep || snapshot.client.address_cep || "",
    logradouro: primaryAddress?.address_logradouro || snapshot.client.address_logradouro || "",
    numero: primaryAddress?.address_numero || snapshot.client.address_numero || "",
    complemento: primaryAddress?.address_complemento || snapshot.client.address_complemento || "",
    bairro: primaryAddress?.address_bairro || snapshot.client.address_bairro || "",
    cidade: primaryAddress?.address_cidade || snapshot.client.address_cidade || "",
    estado: primaryAddress?.address_estado || snapshot.client.address_estado || "",
  };

  const allergyTags = snapshot.healthItems
    .filter((item) => item.type === "allergy")
    .map((item) => item.label)
    .filter(Boolean);
  const allergySet = new Set(allergyTags.map((tag) => tag.trim().toLowerCase()));

  const conditionSet = new Set(
    snapshot.healthItems
      .filter((item) => item.type !== "allergy")
      .map((item) => item.label)
      .filter(Boolean)
  );

  for (const tag of snapshot.client.health_tags ?? []) {
    const normalizedTag = tag?.trim();
    if (!normalizedTag) continue;
    if (allergySet.has(normalizedTag.toLowerCase())) continue;
    conditionSet.add(normalizedTag);
  }

  return {
    clientId: snapshot.client.id,
    avatarUrl: snapshot.client.avatar_url || null,
    firstName: names.publicFirstName,
    lastName: names.publicLastName,
    reference: names.reference,
    birthDate: snapshot.client.birth_date ?? snapshot.client.data_nascimento ?? "",
    cpf: snapshot.client.cpf ?? "",
    isVip: snapshot.client.is_vip ?? false,
    needsAttention: snapshot.client.needs_attention ?? false,
    marketingOptIn: snapshot.client.marketing_opt_in ?? false,
    isMinor: snapshot.client.is_minor ?? false,
    guardianName: snapshot.client.guardian_name ?? "",
    guardianPhone: snapshot.client.guardian_phone ?? "",
    guardianCpf: snapshot.client.guardian_cpf ?? "",
    preferencesNotes: snapshot.client.preferences_notes ?? "",
    contraindications: snapshot.client.contraindications ?? "",
    clinicalHistory: snapshot.client.clinical_history ?? "",
    anamneseUrl: snapshot.client.anamnese_url ?? "",
    observacoesGerais: snapshot.client.observacoes_gerais ?? "",
    profissao: snapshot.client.profissao ?? "",
    comoConheceu: snapshot.client.como_conheceu ?? "",
    allergyTags,
    conditionTags: Array.from(conditionSet),
    phones,
    emails,
    address,
  };
}
