import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateDisplacementFromAddress } from "../../../src/shared/displacement/service";
import { calculateDisplacementFee } from "../../../src/shared/displacement/rules";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Endereço inválido." }, { status: 400 });
  }

  try {
    const estimate = await estimateDisplacementFromAddress(parsed.data);
    return NextResponse.json({ ...estimate, source: "google_maps" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no cálculo de deslocamento.";
    const fallbackEstimate = calculateDisplacementFee(3);
    return NextResponse.json({
      ...fallbackEstimate,
      source: "fallback_minimum",
      warning:
        "Não foi possível consultar o Google Maps no momento. Aplicamos a taxa mínima provisória.",
      details: message,
    });
  }
}
