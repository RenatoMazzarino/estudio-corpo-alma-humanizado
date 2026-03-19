import { beforeEach, describe, expect, it, vi } from "vitest";
import { runUpdateClientProfileAction } from "./update-client-profile-action";

const {
  revalidatePathMock,
  requireDashboardAccessForServerActionMock,
  updateClientMock,
  listClientAddressesMock,
  replaceClientAddressesMock,
  replaceClientPhonesMock,
  replaceClientEmailsMock,
  replaceClientHealthItemsMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  requireDashboardAccessForServerActionMock: vi.fn(),
  updateClientMock: vi.fn(),
  listClientAddressesMock: vi.fn(),
  replaceClientAddressesMock: vi.fn(),
  replaceClientPhonesMock: vi.fn(),
  replaceClientEmailsMock: vi.fn(),
  replaceClientHealthItemsMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("../../auth/dashboard-access", () => ({
  requireDashboardAccessForServerAction: requireDashboardAccessForServerActionMock,
}));

vi.mock("../repository", () => ({
  updateClient: updateClientMock,
  listClientAddresses: listClientAddressesMock,
  replaceClientAddresses: replaceClientAddressesMock,
  replaceClientPhones: replaceClientPhonesMock,
  replaceClientEmails: replaceClientEmailsMock,
  replaceClientHealthItems: replaceClientHealthItemsMock,
}));

describe("runUpdateClientProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireDashboardAccessForServerActionMock.mockResolvedValue({ tenantId: "tenant-1" });
    updateClientMock.mockResolvedValue({ error: null });
    listClientAddressesMock.mockResolvedValue({ data: [], error: null });
    replaceClientAddressesMock.mockResolvedValue({ error: null });
    replaceClientPhonesMock.mockResolvedValue({ error: null });
    replaceClientEmailsMock.mockResolvedValue({ error: null });
    replaceClientHealthItemsMock.mockResolvedValue({ error: null });
  });

  it("limpa enderecos persistidos quando addresses_json chega vazio", async () => {
    const clientId = "11111111-1111-4111-8111-111111111111";
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("name", "Cliente Teste");
    formData.set("addresses_json", "[]");

    const result = await runUpdateClientProfileAction(formData);

    expect(result).toEqual({ ok: true, data: { id: clientId } });
    expect(listClientAddressesMock).not.toHaveBeenCalled();
    expect(replaceClientAddressesMock).toHaveBeenCalledWith("tenant-1", clientId, []);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/clientes/${clientId}/editar`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/clientes/${clientId}`);
  });
});
