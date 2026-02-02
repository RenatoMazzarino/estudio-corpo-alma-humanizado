import { z } from "zod";

function hasValidPhone(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

function hasValidCpf(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11;
}

function hasValidCep(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 8;
}

export const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  is_vip: z.boolean().optional(),
  needs_attention: z.boolean().optional(),
  preferences_notes: z.string().optional().nullable(),
  contraindications: z.string().optional().nullable(),
  marketing_opt_in: z.boolean().optional(),
  is_minor: z.boolean().optional(),
  guardian_name: z.string().optional().nullable(),
  guardian_phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  guardian_cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  observacoes_gerais: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  endereco_completo: z.string().optional().nullable(),
  address_cep: z.string().optional().nullable().refine(hasValidCep, "CEP inválido"),
  address_logradouro: z.string().optional().nullable(),
  address_numero: z.string().optional().nullable(),
  address_complemento: z.string().optional().nullable(),
  address_bairro: z.string().optional().nullable(),
  address_cidade: z.string().optional().nullable(),
  address_estado: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  health_tags: z.array(z.string()).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.is_minor) {
    if (!data.guardian_name || data.guardian_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardian_name"],
        message: "Responsável é obrigatório para menor de idade.",
      });
    }
    if (!data.guardian_phone || data.guardian_phone.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardian_phone"],
        message: "Telefone do responsável é obrigatório.",
      });
    }
  }
});

export const updateClientNotesSchema = z.object({
  clientId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});

export const updateClientSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  is_vip: z.boolean().optional(),
  needs_attention: z.boolean().optional(),
  preferences_notes: z.string().optional().nullable(),
  contraindications: z.string().optional().nullable(),
  marketing_opt_in: z.boolean().optional(),
  is_minor: z.boolean().optional(),
  guardian_name: z.string().optional().nullable(),
  guardian_phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  guardian_cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  observacoes_gerais: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  endereco_completo: z.string().optional().nullable(),
  address_cep: z.string().optional().nullable().refine(hasValidCep, "CEP inválido"),
  address_logradouro: z.string().optional().nullable(),
  address_numero: z.string().optional().nullable(),
  address_complemento: z.string().optional().nullable(),
  address_bairro: z.string().optional().nullable(),
  address_cidade: z.string().optional().nullable(),
  address_estado: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  health_tags: z.array(z.string()).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.is_minor) {
    if (!data.guardian_name || data.guardian_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardian_name"],
        message: "Responsável é obrigatório para menor de idade.",
      });
    }
    if (!data.guardian_phone || data.guardian_phone.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardian_phone"],
        message: "Telefone do responsável é obrigatório.",
      });
    }
  }
});
