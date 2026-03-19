import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClientDetailSnapshot } from "./profile-data";

const {
  createServiceClientMock,
  getClientByIdMock,
  listClientAddressesMock,
  listClientEmailsMock,
  listClientHealthItemsMock,
  listClientPhonesMock,
} = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
  getClientByIdMock: vi.fn(),
  listClientAddressesMock: vi.fn(),
  listClientEmailsMock: vi.fn(),
  listClientHealthItemsMock: vi.fn(),
  listClientPhonesMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

vi.mock("./repository", () => ({
  getClientById: getClientByIdMock,
  listClientAddresses: listClientAddressesMock,
  listClientEmails: listClientEmailsMock,
  listClientHealthItems: listClientHealthItemsMock,
  listClientPhones: listClientPhonesMock,
}));

function createSupabaseMock(referralsCount: number) {
  return {
    from(table: string) {
      if (table === "appointments") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order: vi.fn().mockResolvedValue({ data: [] }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "clients") {
        return {
          select() {
            return {
              eq() {
                return {
                  neq() {
                    return {
                      or: vi.fn().mockResolvedValue({ count: referralsCount }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table mock: ${table}`);
    },
  };
}

describe("getClientDetailSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServiceClientMock.mockReturnValue(createSupabaseMock(3));
    getClientByIdMock.mockResolvedValue({
      data: {
        id: "client-1",
        tenant_id: "tenant-1",
        name: "Maria Souza",
        public_first_name: null,
        public_last_name: null,
        internal_reference: "MSOUZA",
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
      },
    });
    listClientAddressesMock.mockResolvedValue({ data: [] });
    listClientPhonesMock.mockResolvedValue({ data: [] });
    listClientEmailsMock.mockResolvedValue({ data: [] });
    listClientHealthItemsMock.mockResolvedValue({ data: [] });
  });

  it("calcula referrals mesmo sem agendamentos do cliente", async () => {
    const snapshot = await getClientDetailSnapshot("tenant-1", "client-1");

    expect(snapshot?.history).toEqual([]);
    expect(snapshot?.finance.referralsCount).toBe(3);
  });
});
