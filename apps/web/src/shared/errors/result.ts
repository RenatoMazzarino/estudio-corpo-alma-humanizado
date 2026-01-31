import { AppError } from "./AppError";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: AppError): ActionResult<never> {
  return { ok: false, error };
}
