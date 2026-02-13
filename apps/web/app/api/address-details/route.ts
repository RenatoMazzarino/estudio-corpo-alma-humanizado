import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceDetailsResponse = {
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
};

function getComponent(components: AddressComponent[], type: string) {
  return components.find((component) => component.types?.includes(type));
}

function mapStateToUf(state?: string | null) {
  if (!state) return "";
  if (state.length <= 2) return state.toUpperCase();
  const normalized = state
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const map: Record<string, string> = {
    acre: "AC",
    alagoas: "AL",
    amapa: "AP",
    amazonas: "AM",
    bahia: "BA",
    ceara: "CE",
    "distrito federal": "DF",
    "espirito santo": "ES",
    goias: "GO",
    maranhao: "MA",
    "mato grosso": "MT",
    "mato grosso do sul": "MS",
    "minas gerais": "MG",
    para: "PA",
    paraiba: "PB",
    parana: "PR",
    pernambuco: "PE",
    piaui: "PI",
    "rio de janeiro": "RJ",
    "rio grande do norte": "RN",
    "rio grande do sul": "RS",
    rondonia: "RO",
    roraima: "RR",
    "santa catarina": "SC",
    "sao paulo": "SP",
    sergipe: "SE",
    tocantins: "TO",
  };
  return map[normalized] ?? state.slice(0, 2).toUpperCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return NextResponse.json({ error: "placeId inválido" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key ausente" }, { status: 500 });
  }

  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "formattedAddress,addressComponents",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao consultar endereço" }, { status: response.status });
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  const components = data.addressComponents ?? [];

  const route = getComponent(components, "route")?.longText ?? "";
  const streetNumber = getComponent(components, "street_number")?.longText ?? "";
  const postalCode = getComponent(components, "postal_code")?.longText ?? "";
  const sublocality =
    getComponent(components, "sublocality_level_1")?.longText ??
    getComponent(components, "sublocality")?.longText ??
    getComponent(components, "neighborhood")?.longText ??
    "";
  const city =
    getComponent(components, "administrative_area_level_2")?.longText ??
    getComponent(components, "locality")?.longText ??
    "";
  const stateComponent =
    getComponent(components, "administrative_area_level_1")?.shortText ??
    getComponent(components, "administrative_area_level_1")?.longText ??
    "";
  const state = mapStateToUf(stateComponent);

  return NextResponse.json({
    label: data.formattedAddress ?? "",
    cep: postalCode,
    logradouro: route,
    numero: streetNumber,
    bairro: sublocality,
    cidade: city,
    estado: state,
  });
}
