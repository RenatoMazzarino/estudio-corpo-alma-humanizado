import { createClient } from "@supabase/supabase-js";
import { AppError } from "../../src/shared/errors/AppError";
import type { Database } from "./types";

function createClientWithKey(key: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Supabase env ausente: configure NEXT_PUBLIC_SUPABASE_URL");
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new AppError(
      "SUPABASE_SERVICE_ROLE_KEY ausente: defina a chave service role em apps/web/.env.local para operações admin.",
      "CONFIG_ERROR",
      500
    );
  }

  return createClientWithKey(serviceRoleKey);
}

export function createPublicClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ausente: defina a chave anon em apps/web/.env.local.");
  }

  return createClientWithKey(anonKey);
}
