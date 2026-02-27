import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  normalizeMercadoPagoToken,
  usesUnsupportedOrdersTestCredential,
} from "./mercadopago-orders.helpers";

export const ordersCredentialsMessage =
  "Checkout Transparente (Orders API) não aceita credenciais TEST-. Configure MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PUBLIC_KEY com credenciais de PRODUÇÃO da mesma aplicação.";

export function resolveMercadoPagoAccessToken(): ActionResult<string> {
  const accessToken = normalizeMercadoPagoToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
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
