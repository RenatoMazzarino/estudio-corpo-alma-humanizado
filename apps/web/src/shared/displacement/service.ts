import "server-only";

import { calculateDisplacementFee, type DisplacementEstimate } from "./rules";

export interface DisplacementAddressInput {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export const DEFAULT_DISPLACEMENT_ORIGIN =
  "Supermercado Daolio, Centro, Amparo - SP, Brasil";

const normalizeAddressPart = (value?: string | null) => value?.trim() ?? "";

export function buildDisplacementDestination(address: DisplacementAddressInput): string {
  const parts = [
    normalizeAddressPart(address.logradouro),
    normalizeAddressPart(address.numero),
    normalizeAddressPart(address.complemento),
    normalizeAddressPart(address.bairro),
    normalizeAddressPart(address.cidade),
    normalizeAddressPart(address.estado),
    normalizeAddressPart(address.cep),
  ].filter((value) => value.length > 0);

  return parts.join(", ");
}

function getGoogleMapsApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY não configurada.");
  }
  return key;
}

interface DistanceMatrixResponse {
  status?: string;
  error_message?: string;
  rows?: Array<{
    elements?: Array<{
      status?: string;
      distance?: { value?: number };
    }>;
  }>;
}

interface RoutesApiResponse {
  routes?: Array<{
    distanceMeters?: number;
  }>;
  error?: {
    message?: string;
  };
}

function normalizeGoogleErrorMessage(message: string) {
  if (message.includes("legacy API")) {
    return "A API de distância legada não está habilitada no Google Cloud. Ative a Routes API para cálculo de deslocamento.";
  }
  if (message.includes("API key")) {
    return "Chave da API do Google inválida ou sem permissão para cálculo de rotas.";
  }
  return message;
}

async function getDrivingDistanceKmViaRoutesApi(origin: string, destination: string, key: string): Promise<number> {
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters",
    },
    cache: "no-store",
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      languageCode: "pt-BR",
      units: "METRIC",
    }),
  });

  const payload = (await response.json()) as RoutesApiResponse;

  if (!response.ok) {
    throw new Error(
      normalizeGoogleErrorMessage(
        payload?.error?.message || `Falha no Routes API (${response.status}).`
      )
    );
  }

  const meters = payload.routes?.[0]?.distanceMeters;
  if (typeof meters !== "number") {
    throw new Error("Routes API não retornou distância para o endereço informado.");
  }

  return Number((meters / 1000).toFixed(2));
}

async function getDrivingDistanceKmViaDistanceMatrix(
  origin: string,
  destination: string,
  key: string
): Promise<number> {
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "driving",
    language: "pt-BR",
    units: "metric",
    key,
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha no Google Maps (${response.status}).`);
  }

  const payload = (await response.json()) as DistanceMatrixResponse;
  if (payload.status !== "OK") {
    throw new Error(
      normalizeGoogleErrorMessage(
        payload.error_message || "Google Maps retornou erro no cálculo de distância."
      )
    );
  }

  const element = payload.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK" || typeof element.distance?.value !== "number") {
    throw new Error("Não foi possível calcular a distância para o endereço informado.");
  }

  return Number((element.distance.value / 1000).toFixed(2));
}

export async function getDrivingDistanceKm(destination: string): Promise<number> {
  if (!destination || destination.trim().length < 6) {
    throw new Error("Endereço incompleto para calcular deslocamento.");
  }

  const key = getGoogleMapsApiKey();
  const origin = process.env.DISPLACEMENT_ORIGIN_ADDRESS?.trim() || DEFAULT_DISPLACEMENT_ORIGIN;
  try {
    return await getDrivingDistanceKmViaRoutesApi(origin, destination, key);
  } catch (routesError) {
    try {
      return await getDrivingDistanceKmViaDistanceMatrix(origin, destination, key);
    } catch {
      if (routesError instanceof Error) {
        throw routesError;
      }
      throw new Error("Não foi possível calcular a distância para o endereço informado.");
    }
  }
}

export async function estimateDisplacementFromAddress(
  address: DisplacementAddressInput
): Promise<DisplacementEstimate> {
  const destination = buildDisplacementDestination(address);
  const distanceKm = await getDrivingDistanceKm(destination);
  return calculateDisplacementFee(distanceKm);
}
