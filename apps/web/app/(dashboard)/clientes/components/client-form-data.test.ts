import { describe, expect, it } from "vitest";
import { createClientFormInitialDataFromSnapshot } from "./client-form-data";
import type { ClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";

function createSnapshot(overrides?: Partial<ClientDetailSnapshot>): ClientDetailSnapshot {
  return {
    client: {
      id: "client-1",
      tenant_id: "tenant-1",
      name: "Maria Souza",
      public_first_name: "Maria",
      public_last_name: "Souza",
      internal_reference: null,
      avatar_url: null,
      birth_date: null,
      data_nascimento: null,
      cpf: null,
      is_vip: false,
      needs_attention: false,
      marketing_opt_in: false,
      is_minor: false,
      guardian_name: null,
      guardian_phone: null,
      guardian_cpf: null,
      preferences_notes: null,
      contraindications: null,
      clinical_history: null,
      anamnese_url: null,
      observacoes_gerais: null,
      profissao: null,
      como_conheceu: null,
      email: null,
      address_cep: null,
      address_logradouro: null,
      address_numero: null,
      address_complemento: null,
      address_bairro: null,
      address_cidade: null,
      address_estado: null,
      health_tags: [],
      phone: null,
      initials: null,
      endereco_completo: null,
      notes: null,
      created_at: null,
      updated_at: null,
    } as unknown as ClientDetailSnapshot["client"],
    phones: [],
    emails: [],
    addresses: [],
    healthItems: [],
    history: [],
    finance: {
      totalSpentLifetime: 0,
      averageTicket: 0,
      packagesAcquired: 0,
      discountsGranted: 0,
      estimatedLtv12Months: 0,
      averageIntervalDays: null,
      daysSinceLastVisit: null,
      fidelityStars: 1,
      referralsCount: 0,
      paymentMethods: [],
      completedSessionsCount: 0,
    },
    prontuarioEntries: [],
    anamnesis: {
      clinicalHistory: null,
      contraindications: null,
      preferencesNotes: null,
      observations: null,
      legacyNotes: null,
      anamneseUrl: null,
      healthTags: [],
      healthItems: [],
    },
    ...overrides,
  } as unknown as ClientDetailSnapshot;
}

describe("createClientFormInitialDataFromSnapshot", () => {
  it("nao hidrata alergia como condicao quando health_tags esta combinado", () => {
    const snapshot = createSnapshot({
      client: {
        ...createSnapshot().client,
        health_tags: ["Dipirona", "Hipertensão"],
      },
      healthItems: [
        {
          id: "h1",
          client_id: "client-1",
          tenant_id: "tenant-1",
          type: "allergy",
          label: "Dipirona",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    const initialData = createClientFormInitialDataFromSnapshot(snapshot);

    expect(initialData.allergyTags).toEqual(["Dipirona"]);
    expect(initialData.conditionTags).toEqual(["Hipertensão"]);
  });
});
