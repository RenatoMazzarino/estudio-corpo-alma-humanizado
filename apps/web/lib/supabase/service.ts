import { createClient } from "@supabase/supabase-js";
import { AppError } from "../../src/shared/errors/AppError";
import { getServerEnv } from "../../src/shared/env/server-env";
import type { Database } from "./types";

function createClientWithKey(key: string) {
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getServerEnv();

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createServiceClient() {
  const { SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = getServerEnv();
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
  const { NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } = getServerEnv();

  return createClientWithKey(anonKey);
}
