import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DASHBOARD_ALLOWED_GOOGLE_EMAILS: z.string().optional(),
  BOOKING_LOOKUP_CAPTCHA_SECRET: z.string().min(1).optional(),
  APP_TIMEZONE: z.string().min(1).default("America/Sao_Paulo"),
  WHATSAPP_AUTOMATION_PROCESSOR_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Configuração de ambiente inválida: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    );
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
