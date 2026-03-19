import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { resolveMercadoPagoTenantConfig } from "../tenancy/provider-config";
import {
  normalizeMercadoPagoToken,
  usesUnsupportedOrdersTestCredential,
} from "./mercadopago-orders.helpers";

export const ordersCredentialsMessage =
  "Checkout Transparente (Orders API) não aceita credenciais TEST-. Configure MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PUBLIC_KEY com credenciais de PRODUÇÃO da mesma aplicação.";

export async function resolveMercadoPagoAccessToken(
  tenantId: string
): Promise<ActionResult<string>> {
  let accessToken = "";
  try {
    const config = await resolveMercadoPagoTenantConfig(tenantId);
    accessToken = normalizeMercadoPagoToken(config.accessToken);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.";
    return fail(new AppError(message, "CONFIG_ERROR", 500, error));
  }

  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }
  if (usesUnsupportedOrdersTestCredential(accessToken)) {
    return fail(new AppError(ordersCredentialsMessage, "CONFIG_ERROR", 500));
  }
  return ok(accessToken);
}

export async function resolveMercadoPagoPublicKey(
  tenantId: string
): Promise<ActionResult<string | null>> {
  try {
    const config = await resolveMercadoPagoTenantConfig(tenantId);
    const publicKey = config.publicKey ? config.publicKey.trim() : null;
    if (!publicKey) {
      return ok(null);
    }
    return ok(publicKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao resolver MERCADOPAGO_PUBLIC_KEY.";
    return fail(new AppError(message, "CONFIG_ERROR", 500, error));
  }
}
