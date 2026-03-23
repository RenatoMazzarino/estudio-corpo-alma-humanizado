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
      client_code: null,
      public_name: null,
      system_name: null,
      short_name: null,
      avatar_url: null,
      birth_date: null,
      data_nascimento: null,
      cpf: null,
      is_vip: false,
      needs_attention: false,
      marketing_opt_in: false,
      is_minor: false,
      is_minor_override: null,
      guardian_name: null,
      guardian_phone: null,
      guardian_cpf: null,
      guardian_relationship: null,
      preferences_notes: null,
      contraindications: null,
      clinical_history: null,
      anamnese_url: null,
      anamnese_form_status: "nao_enviado",
      anamnese_form_sent_at: null,
      anamnese_form_answered_at: null,
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
      initialFormStatus: "nao_enviado",
      initialFormSentAt: null,
      initialFormAnsweredAt: null,
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
        health_tags: ["Dipirona", "Hipertensao"],
      },
      healthItems: [
        {
          id: "h1",
          client_id: "client-1",
          tenant_id: "tenant-1",
          type: "allergy",
          label: "Dipirona",
          notes: null,
          severity: null,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    const initialData = createClientFormInitialDataFromSnapshot(snapshot);

    expect(initialData.allergyTags).toEqual(["Dipirona"]);
    expect(initialData.conditionTags).toEqual(["Hipertensao"]);
  });

  it("hidrata status estruturado da anamnese e override manual de menor", () => {
    const snapshot = createSnapshot({
      client: {
        ...createSnapshot().client,
        is_minor: false,
        is_minor_override: true,
        anamnese_form_status: "respondido",
        anamnese_form_sent_at: "2026-03-20T10:00:00.000Z",
        anamnese_form_answered_at: "2026-03-20T10:15:00.000Z",
      },
    });

    const initialData = createClientFormInitialDataFromSnapshot(snapshot);

    expect(initialData.isMinorOverride).toBe(true);
    expect(initialData.anamneseFormStatus).toBe("respondido");
    expect(initialData.anamneseFormSentAt).toBeTruthy();
    expect(initialData.anamneseFormAnsweredAt).toBeTruthy();
  });
});
