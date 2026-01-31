import type { PostgrestError } from "@supabase/supabase-js";
import { AppError } from "./AppError";

export function mapSupabaseError(error: PostgrestError | null): AppError | null {
  if (!error) return null;

  // PGRST116: No rows found
  if (error.code === "PGRST116") {
    return new AppError("Recurso não encontrado", "NOT_FOUND", 404, error);
  }

  return new AppError(error.message, "SUPABASE_ERROR", 400, error);
}
