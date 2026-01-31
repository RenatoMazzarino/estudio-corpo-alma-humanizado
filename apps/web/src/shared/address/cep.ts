export interface CepLookupResult {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export function normalizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export async function fetchAddressByCep(rawCep: string): Promise<CepLookupResult | null> {
  const cep = normalizeCep(rawCep);
  if (cep.length !== 8) return null;

  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  return {
    logradouro: data.street ?? "",
    bairro: data.neighborhood ?? "",
    cidade: data.city ?? "",
    estado: data.state ?? "",
  };
}
