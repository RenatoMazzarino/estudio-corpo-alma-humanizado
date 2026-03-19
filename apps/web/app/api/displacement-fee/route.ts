import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateDisplacementFromAddress } from "../../../src/shared/displacement/service";
import { calculateDisplacementFee } from "../../../src/shared/displacement/rules";
import { AppError } from "../../../src/shared/errors/AppError";
import { resolveTenantIdForRequestContext } from "../../../src/modules/tenancy/request-context";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  tenantSlug: z.string().min(1).max(120).optional().nullable(),
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
    const tenantId = await resolveTenantIdForRequestContext({
      request,
      tenantId: parsed.data.tenantId,
      tenantSlug: parsed.data.tenantSlug,
    });
    if (!tenantId) {
      return NextResponse.json(
        { error: "Não foi possível resolver o tenant para cálculo de deslocamento." },
        { status: 400 }
      );
    }
    const estimate = await estimateDisplacementFromAddress(parsed.data, {
      tenantId,
    });
    return NextResponse.json({ ...estimate, source: "google_maps" });
  } catch (error) {
    if (error instanceof AppError && (error.code === "CONFIG_ERROR" || error.status === 423)) {
      return NextResponse.json(
        { error: error.message, code: "provider_config_invalid" },
        { status: 423 }
      );
    }

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
